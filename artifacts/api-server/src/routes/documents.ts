import { Router } from "express";
import { eq, ilike, and, desc, type SQL } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import QRCode from "qrcode";
import { db, documentsTable, documentLogsTable, usersTable, departmentsTable } from "@workspace/db";
import {
  UpdateDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  ListDocumentLogsParams,
  CreateDocumentLogParams,
  CreateDocumentLogBody,
  ListDocumentsQueryParams,
  ReplaceDocumentAttachmentParams,
  ForwardDocumentParams,
  ForwardDocumentBody,
} from "@workspace/api-zod";
import { getUserRoleNames } from "./auth";

const router = Router();

// Role name that grants document-forwarding permission, in addition to the
// hardcoded super admin (user id 1).
export const FORWARD_DOCUMENTS_ROLE = "ئاڕاستەکردنی نووسراو";

async function canForwardDocuments(userId: number | undefined): Promise<boolean> {
  if (!userId) return false;
  if (userId === 1) return true;
  const roles = await getUserRoleNames(userId);
  return roles.includes(FORWARD_DOCUMENTS_ROLE);
}

// ── File upload setup ─────────────────────────────────────────
const uploadDir = path.join(process.cwd(), "uploads", "attachments");
fs.mkdirSync(uploadDir, { recursive: true });

/** Allowed attachment MIME types → canonical file extension */
const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

/** Map file extension → Content-Type for serving */
const EXT_TO_MIME: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".doc":  "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = ALLOWED_ATTACHMENT_TYPES[file.mimetype]
      ?? (path.extname(file.originalname).toLowerCase() || ".bin");
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in ALLOWED_ATTACHMENT_TYPES) {
      cb(null, true);
    } else {
      cb(new Error("تەنها فایلی PDF، Word (.doc/.docx) و وێنە (.jpg/.png) قبووڵدەکرێن"));
    }
  },
});


// ── PDF → JPEG preview helper ─────────────────────────────────

const previewDir = path.join(process.cwd(), "uploads", "previews");
fs.mkdirSync(previewDir, { recursive: true });

/**
 * Render page 1 of a PDF to a JPEG scaled to `targetW` pixels wide.
 * The result is cached as `uploads/previews/<attachmentFilename>.jpg`
 * so regeneration only happens when the attachment changes.
 */
async function getPdfPreviewJpeg(pdfAbsPath: string, targetW = 800): Promise<string> {
  const attachFilename = path.basename(pdfAbsPath);
  const cacheFile = path.join(previewDir, `${attachFilename}.jpg`);

  // Return cached version if it already exists
  if (fs.existsSync(cacheFile)) return cacheFile;

  // Run pdftoppm: -jpeg -singlefile renders page 1 only, no page-number suffix
  await new Promise<void>((resolve, reject) => {
    const prefix = cacheFile.replace(/\.jpg$/, ""); // pdftoppm appends .jpg
    const proc = spawn("pdftoppm", [
      "-jpeg",
      "-singlefile",
      "-scale-to-x", String(targetW),
      "-scale-to-y", "-1",   // keep aspect ratio
      "-f", "1",
      "-l", "1",
      pdfAbsPath,
      prefix,
    ]);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pdftoppm exited with code ${code}`));
    });
    proc.on("error", reject);
  });

  if (!fs.existsSync(cacheFile)) {
    throw new Error("pdftoppm ran but output file not found");
  }
  return cacheFile;
}

// ── PDF stamp helper ──────────────────────────────────────────

const FONT_PATH_REGULAR = path.join(process.cwd(), "fonts", "NotoNaskhArabic-Regular.ttf");
const FONT_PATH_BOLD    = path.join(process.cwd(), "fonts", "NotoNaskhArabic-Bold.ttf");
let _cachedRegular: Buffer | null = null;
let _cachedBold: Buffer | null = null;

async function getArabicFontBytes(bold = false): Promise<Buffer> {
  if (bold) {
    if (!_cachedBold) _cachedBold = await fs.promises.readFile(FONT_PATH_BOLD);
    return _cachedBold;
  }
  if (!_cachedRegular) _cachedRegular = await fs.promises.readFile(FONT_PATH_REGULAR);
  return _cachedRegular;
}

/** Convert western digits 0-9 to Kurdish/Arabic-Indic numerals ٠-٩ */
function toKurdishNumerals(s: string): string {
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

/** Generate a QR code as a raw PNG Buffer */
async function generateQrPng(text: string, size = 140): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
}

/**
 * Embed a QR code image onto a PDF page at the bottom-right corner.
 * Skips silently if qrText is falsy.
 */
async function embedQrOnPdfPage(
  pdfDoc: PDFDocument,
  page: ReturnType<typeof pdfDoc.getPage>,
  qrText: string,
  size = 64,
): Promise<void> {
  if (!qrText) return;
  const qrBuf = await generateQrPng(qrText, size * 2);
  const qrImage = await pdfDoc.embedPng(qrBuf);
  const { width: pageW } = page.getSize();
  page.drawImage(qrImage, { x: pageW - size - 10, y: 10, width: size, height: size });
}

/**
 * Stamp a JPG/PNG image: composites the signature, notes SVG text, date,
 * and an optional QR code onto the image using sharp.
 */
async function stampImageFile(opts: {
  imgAbsPath: string;
  sigAbsPath: string | null;
  notes: string | null;
  date: Date;
  qrText: string;
  includeQr: boolean;
}): Promise<Buffer> {
  const { imgAbsPath, sigAbsPath, notes, date, qrText, includeQr } = opts;

  const imgSharp = sharp(imgAbsPath);
  const meta = await imgSharp.metadata();
  const W = meta.width ?? 800;
  const H = meta.height ?? 1000;

  const MARGIN     = Math.max(8, Math.round(W * 0.015));
  const STAMP_W    = Math.round(W * 0.32);
  const QR_SIZE    = Math.round(STAMP_W * 0.28);
  const FS         = Math.max(10, Math.round(W / 75));
  const LINE_H     = Math.round(FS * 1.55);

  const d = date;
  const dateVal = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

  // Wrap notes into lines (≈25 chars each)
  const textLines: string[] = [];
  if (notes?.trim()) {
    const words = notes.trim().split(/\s+/);
    let cur = "";
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (cand.length > 22) { if (cur) textLines.push(cur); cur = w; }
      else cur = cand;
      if (textLines.length >= 5) break;
    }
    if (cur && textLines.length < 5) textLines.push(cur);
  }
  textLines.push("Date:");
  textLines.push(dateVal);

  const sigExists = !!(sigAbsPath && fs.existsSync(sigAbsPath));
  const sigDrawH  = sigExists ? Math.round(STAMP_W * 0.28) : 0;
  const textBlockH = textLines.length * LINE_H + MARGIN;
  const qrBlockH  = includeQr ? QR_SIZE + MARGIN : 0;
  const stampH    = MARGIN + sigDrawH + textBlockH + qrBlockH + MARGIN;

  const stampX = MARGIN;
  const stampY = H - MARGIN - stampH;

  // Build SVG text lines (RTL Kurdish)
  const svgEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svgTextEls = textLines.map((line, i) =>
    `<text x="${stampX + STAMP_W - MARGIN}" y="${stampY + MARGIN + sigDrawH + (i + 1) * LINE_H}"
      font-size="${FS}" fill="#0a7a1e" font-family="Arial,Helvetica,sans-serif"
      text-anchor="end">${svgEsc(line)}</text>`
  ).join("\n    ");

  const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${stampX - 3}" y="${stampY - 3}" width="${STAMP_W + 6}" height="${stampH + 6}"
      fill="rgba(255,255,255,0.93)" rx="6" ry="6"/>
    <rect x="${stampX - 3}" y="${stampY - 3}" width="${STAMP_W + 6}" height="${stampH + 6}"
      fill="none" stroke="#0a7a1e" stroke-width="2" rx="6" ry="6"/>
    ${svgTextEls}
  </svg>`;

  const composites: sharp.OverlayOptions[] = [
    { input: Buffer.from(svgOverlay), top: 0, left: 0, blend: "over" },
  ];

  // Signature image
  if (sigExists) {
    const sigBuf = await fs.promises.readFile(sigAbsPath!);
    const sigResized = await sharp(sigBuf)
      .resize(STAMP_W, sigDrawH, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    composites.push({ input: sigResized, top: stampY + MARGIN, left: stampX, blend: "over" });
  }

  // QR code
  if (includeQr) {
    const qrBuf = await generateQrPng(qrText, QR_SIZE * 2);
    const qrResized = await sharp(qrBuf).resize(QR_SIZE, QR_SIZE).png().toBuffer();
    composites.push({
      input: qrResized,
      top: stampY + MARGIN + sigDrawH + textBlockH,
      left: stampX,
      blend: "over",
    });
  }

  return imgSharp
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer();
}

/**
 * Creates an A4 PDF "stamp certificate" page for formats that cannot be
 * edited directly (Word, Excel). The returned PDF contains the signature,
 * notes, date, and QR code on a green-header page and replaces the
 * original attachment in the database.
 */
async function createStampCoverPdf(opts: {
  docNumber: string;
  subject: string;
  signerName: string;
  sigAbsPath: string | null;
  notes: string | null;
  date: Date;
  qrText: string;
  includeQr: boolean;
}): Promise<Uint8Array> {
  const { docNumber, subject, signerName, sigAbsPath, notes, date, qrText, includeQr } = opts;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let boldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  try { boldFont = await pdfDoc.embedFont(await getArabicFontBytes(true)); }
  catch { boldFont = await pdfDoc.embedFont(await getArabicFontBytes(false)); }

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width: W, height: H } = page.getSize();
  const GREEN = rgb(0.02, 0.50, 0.12);
  const DARK  = rgb(0.12, 0.12, 0.12);
  const LIGHT = rgb(0.95, 0.98, 0.95);
  const FS    = 12;
  const LINE_H = 20;

  // Green header bar
  page.drawRectangle({ x: 0, y: H - 58, width: W, height: 58, color: GREEN });
  page.drawText("مۆهر و ئیمزای فەرمی", {
    x: W - 22, y: H - 36, font: boldFont, size: 16, color: rgb(1, 1, 1),
  });

  // Light background body
  page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 100, color: LIGHT, opacity: 0.5 });

  let y = H - 80;

  const d = date;
  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

  // Info rows
  const rows: [string, string][] = [
    ["ژمارەی نوسراو:", docNumber],
    ["بابەت:", subject.slice(0, 55)],
    ["واژووکەر:", signerName],
  ];
  for (const [label, value] of rows) {
    page.drawText(label,  { x: W - 40, y, font: boldFont, size: FS, color: GREEN });
    page.drawText(value,  { x: W - 150, y, font: boldFont, size: FS, color: DARK });
    y -= LINE_H + 4;
  }

  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.8, color: rgb(0.7, 0.85, 0.7) });
  y -= 18;

  // Notes block
  if (notes?.trim()) {
    page.drawText("هامش:", { x: W - 40, y, font: boldFont, size: FS, color: GREEN });
    y -= LINE_H;
    const words = notes.trim().split(/\s+/);
    let cur = "";
    const noteLines: string[] = [];
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (boldFont.widthOfTextAtSize(cand, FS) > W - 80) { if (cur) noteLines.push(cur); cur = w; }
      else cur = cand;
    }
    if (cur) noteLines.push(cur);
    for (const line of noteLines.slice(0, 8)) {
      page.drawText(line, { x: W - 40, y, font: boldFont, size: FS, color: DARK });
      y -= LINE_H;
    }
    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.8, color: rgb(0.7, 0.85, 0.7) });
    y -= 18;
  }

  // Date
  page.drawText("Date:", { x: W - 40, y, font: boldFont, size: FS, color: GREEN });
  y -= LINE_H;
  page.drawText(dateStr, { x: W - 40, y, font: boldFont, size: FS, color: DARK });
  y -= LINE_H + 24;

  // Signature image
  if (sigAbsPath && fs.existsSync(sigAbsPath)) {
    try {
      const sigBuf = await fs.promises.readFile(sigAbsPath);
      const ext = path.extname(sigAbsPath).toLowerCase();
      const sigImg = ext === ".png"
        ? await pdfDoc.embedPng(sigBuf)
        : await pdfDoc.embedJpg(sigBuf);
      const { width: iw, height: ih } = sigImg.size();
      const scale = Math.min(180 / iw, 90 / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      page.drawImage(sigImg, { x: W - sw - 40, y: y - sh, width: sw, height: sh });
      y -= sh + 30;
    } catch { /* skip if image unreadable */ }
  }

  // QR code — bottom-left corner
  if (includeQr && qrText) {
    const qrBuf = await generateQrPng(qrText, 200);
    const qrImg = await pdfDoc.embedPng(qrBuf);
    const QR = 85;
    page.drawImage(qrImg, { x: 45, y: 45, width: QR, height: QR });
  }

  // Footer line
  page.drawLine({ start: { x: 40, y: 38 }, end: { x: W - 40, y: 38 }, thickness: 0.8, color: GREEN, opacity: 0.4 });

  return pdfDoc.save();
}

/**
 * Embeds a forwarding stamp (signature image + notes + formatted date) onto
 * the PDF.
 *
 * - When `stampXFrac` / `stampYFrac` are provided (0‑1 fractions from the
 *   top-left of the page) the stamp is drawn directly on the **last existing
 *   page** at that position — letting users choose placement via the UI.
 * - When coordinates are omitted a fresh blank page is appended instead,
 *   which is the safe fallback that never overlaps existing content.
 *
 * Text is bold and green; date uses Kurdish (Arabic-Indic) numerals and a
 * label prefix for readability.
 */
async function embedForwardStamp(opts: {
  pdfAbsPath: string;
  notes: string | null;
  sigAbsPath: string | null;
  date: Date;
  /** 0‑1 from left edge; when set the stamp lands on the last existing page */
  stampXFrac?: number;
  /** 0‑1 from top edge; when set the stamp lands on the last existing page */
  stampYFrac?: number;
  /** Text to encode in a QR code placed in the bottom-right corner; omit to skip QR */
  qrText?: string;
}): Promise<Uint8Array> {
  const { pdfAbsPath, notes, sigAbsPath, date, stampXFrac, stampYFrac, qrText } = opts;
  const placeOnExistingPage =
    stampXFrac !== undefined && stampYFrac !== undefined;

  const pdfBytes = await fs.promises.readFile(pdfAbsPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // ── Embed bold font (fallback to regular if bold file is missing) ─────
  let boldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  try {
    boldFont = await pdfDoc.embedFont(await getArabicFontBytes(true));
  } catch {
    boldFont = await pdfDoc.embedFont(await getArabicFontBytes(false));
  }

  // ── Signature image ───────────────────────────────────────────────────
  let sigImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  let sigDrawW = 0;
  let sigDrawH = 0;
  if (sigAbsPath && fs.existsSync(sigAbsPath)) {
    const sigBytes = await fs.promises.readFile(sigAbsPath);
    const ext = path.extname(sigAbsPath).toLowerCase();
    sigImage = ext === ".png"
      ? await pdfDoc.embedPng(sigBytes)
      : await pdfDoc.embedJpg(sigBytes);
    const { width: iw, height: ih } = sigImage.size();
    const scale = Math.min(200 / iw, 110 / ih);
    sigDrawW = iw * scale;
    sigDrawH = ih * scale;
  }

  // ── Choose target page ────────────────────────────────────────────────
  const srcPages = pdfDoc.getPages();
  const { width: pageW, height: pageH } = srcPages[srcPages.length - 1].getSize();
  const stampPage = placeOnExistingPage
    ? srcPages[srcPages.length - 1]
    : pdfDoc.addPage([pageW, pageH]);

  // ── Layout constants ──────────────────────────────────────────────────
  const FS     = 12;
  const LINE_H = 18;
  const WRAP_W = placeOnExistingPage ? pageW * 0.4 : pageW - 80;
  const GREEN  = rgb(0.02, 0.50, 0.12);

  // ── Date — formatted in English ───────────────────────────────────────
  const d = date;
  const dateStr = `Date: ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

  // ── Wrap notes into lines ─────────────────────────────────────────────
  const MAX_LINES = 8;
  const noteLines: string[] = [];
  if (notes && notes.trim()) {
    const words = notes.trim().split(/\s+/);
    let current = "";
    outer: for (const word of words) {
      let safeWord = word;
      while (boldFont.widthOfTextAtSize(safeWord, FS) > WRAP_W && safeWord.length > 1) {
        safeWord = safeWord.slice(0, -1);
      }
      if (safeWord !== word) safeWord += "…";
      const candidate = current ? `${current} ${safeWord}` : safeWord;
      if (boldFont.widthOfTextAtSize(candidate, FS) > WRAP_W) {
        if (current) {
          noteLines.push(current);
          if (noteLines.length >= MAX_LINES) break outer;
        }
        current = safeWord;
      } else {
        current = candidate;
      }
    }
    if (current && noteLines.length < MAX_LINES) noteLines.push(current);
  }

  // ── Determine stamp origin (top-left corner in PDF units) ────────────
  // pdf-lib's coordinate origin is bottom-left; y increases upward.
  // stampOriginY is the TOP of the stamp block in PDF units.
  let stampOriginX: number;
  let stampOriginY: number;

  if (placeOnExistingPage) {
    stampOriginX = stampXFrac! * pageW;
    stampOriginY = pageH - stampYFrac! * pageH;
  } else {
    stampOriginX = 40;
    stampOriginY = pageH - 40;
  }

  // ── Draw content top-down from the stamp origin ───────────────────────
  let curY = stampOriginY;

  if (sigImage) {
    stampPage.drawImage(sigImage, {
      x: stampOriginX,
      y: curY - sigDrawH,
      width: sigDrawW,
      height: sigDrawH,
    });
    curY -= sigDrawH + 10;
  }

  for (const line of noteLines) {
    stampPage.drawText(line, {
      x: stampOriginX,
      y: curY - FS,
      font: boldFont,
      size: FS,
      color: GREEN,
    });
    curY -= LINE_H;
  }

  curY -= 4;

  // Draw label and date value as separate drawText calls to avoid bidi mixing.
  const dateLabel = "Date:";
  const dateValue = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

  stampPage.drawText(dateLabel, {
    x: stampOriginX,
    y: curY - FS,
    font: boldFont,
    size: FS,
    color: GREEN,
  });
  curY -= LINE_H;
  stampPage.drawText(dateValue, {
    x: stampOriginX,
    y: curY - FS,
    font: boldFont,
    size: FS,
    color: GREEN,
  });

  // QR code — bottom-right corner of stamp page
  if (qrText) {
    await embedQrOnPdfPage(pdfDoc, stampPage, qrText);
  }

  return pdfDoc.save();
}

// ── Helpers ───────────────────────────────────────────────────
async function getDocumentWithCreator(id: number) {
  const [doc] = await db
    .select({
      id: documentsTable.id,
      document_number: documentsTable.document_number,
      document_date: documentsTable.document_date,
      subject: documentsTable.subject,
      creator_id: documentsTable.creator_id,
      creator_name: usersTable.full_name,
      current_status: documentsTable.current_status,
      direction: documentsTable.direction,
      file_path: documentsTable.file_path,
      created_at: documentsTable.created_at,
      updated_at: documentsTable.updated_at,
    })
    .from(documentsTable)
    .leftJoin(usersTable, eq(documentsTable.creator_id, usersTable.id))
    .where(eq(documentsTable.id, id))
    .limit(1);
  return doc;
}

// ── Routes ────────────────────────────────────────────────────

// GET /documents/next-number
// Must be registered before /documents/:id to avoid route conflict
router.get("/documents/next-number", async (_req, res) => {
  const [last] = await db
    .select({ document_number: documentsTable.document_number })
    .from(documentsTable)
    .orderBy(desc(documentsTable.id))
    .limit(1);

  let nextNum = 1;
  if (last) {
    const match = last.document_number.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return res.json({ next_number: String(nextNum).padStart(3, "0") });
});

// GET /documents
router.get("/documents", async (req, res) => {
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query parameters" });
  const { search, status, direction } = parsed.data;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(documentsTable.subject, `%${search}%`));
  if (status) conditions.push(eq(documentsTable.current_status, status));
  if (direction) conditions.push(eq(documentsTable.direction, direction));

  const rows = await db
    .select({
      id: documentsTable.id,
      document_number: documentsTable.document_number,
      document_date: documentsTable.document_date,
      subject: documentsTable.subject,
      creator_id: documentsTable.creator_id,
      creator_name: usersTable.full_name,
      current_status: documentsTable.current_status,
      direction: documentsTable.direction,
      file_path: documentsTable.file_path,
      created_at: documentsTable.created_at,
      updated_at: documentsTable.updated_at,
    })
    .from(documentsTable)
    .leftJoin(usersTable, eq(documentsTable.creator_id, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documentsTable.document_date));

  return res.json(rows);
});

// POST /documents — multipart/form-data with PDF attachment
router.post("/documents", upload.single("attachment"), async (req, res) => {
  const creatorId = req.session?.userId;
  if (!creatorId) return res.status(401).json({ error: "Authentication required" });

  if (!req.file) return res.status(400).json({ error: "PDF attachment is required" });

  const { document_number, document_date, subject, current_status, direction } = req.body as Record<string, string>;
  if (!document_number?.trim() || !document_date?.trim() || !subject?.trim()) {
    return res.status(400).json({ error: "document_number, document_date, and subject are required" });
  }
  if (document_number.length > 100 || subject.length > 255) {
    return res.status(400).json({ error: "Field exceeds maximum length" });
  }

  const validDirections = ["هاتوو", "ڕۆشتوو"];
  const docDirection = direction?.trim() && validDirections.includes(direction.trim()) ? direction.trim() : "هاتوو";

  const [existing] = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.document_number, document_number.trim()))
    .limit(1);
  if (existing) return res.status(409).json({ error: "Document number already exists" });

  const filePath = `attachments/${req.file.filename}`;

  const parsedDate = new Date(document_date.trim());
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid document_date format" });
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      document_number: document_number.trim(),
      document_date: parsedDate.toISOString().slice(0, 10),
      subject: subject.trim(),
      file_path: filePath,
      creator_id: creatorId,
      current_status: current_status?.trim() || "نوێ",
      direction: docDirection,
    })
    .returning();

  await db.insert(documentLogsTable).values({
    document_id: doc.id,
    user_id: creatorId,
    action: "نوسراوەکە دروستکرا",
    notes: null,
  });

  const result = await getDocumentWithCreator(doc.id);
  return res.status(201).json(result);
});

// GET /documents/:id
router.get("/documents/:id", async (req, res) => {
  const parsed = GetDocumentParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const doc = await getDocumentWithCreator(parsed.data.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  return res.json(doc);
});

// POST /documents/:id/attachment — replace the PDF attachment
router.post("/documents/:id/attachment", upload.single("attachment"), async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const paramParsed = ReplaceDocumentAttachmentParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid document ID" });

  if (!req.file) return res.status(400).json({ error: "PDF attachment is required" });

  const [existing] = await db
    .select({ id: documentsTable.id, file_path: documentsTable.file_path })
    .from(documentsTable)
    .where(eq(documentsTable.id, paramParsed.data.id))
    .limit(1);

  if (!existing) {
    // Clean up the uploaded file since the document doesn't exist.
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Document not found" });
  }

  const newFilePath = `attachments/${req.file.filename}`;
  const oldFilePath = existing.file_path;

  await db
    .update(documentsTable)
    .set({ file_path: newFilePath, updated_at: new Date() })
    .where(eq(documentsTable.id, paramParsed.data.id));

  await db.insert(documentLogsTable).values({
    document_id: paramParsed.data.id,
    user_id: userId,
    action: "هاوپێچی نووسراو نوێکرایەوە",
    notes: null,
  });

  // Remove the old file from disk now that the DB record points to the new one.
  if (oldFilePath) {
    const oldAbsolutePath = path.join(process.cwd(), "uploads", oldFilePath);
    fs.unlink(oldAbsolutePath, () => {});
  }

  const result = await getDocumentWithCreator(paramParsed.data.id);
  return res.json(result);
});

// POST /documents/:id/forward
// Supports PDF, images (JPG/PNG), Word, and Excel attachments.
router.post("/documents/:id/forward", async (req, res) => {
  const userId = req.session?.userId;
  const allowed = await canForwardDocuments(userId);
  if (!allowed) return res.status(403).json({ error: "تۆ دەسەڵاتی ئاڕاستەکردنی نووسراوت نییە" });

  const paramParsed = ForwardDocumentParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid document ID" });
  const parsed = ForwardDocumentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const docId = paramParsed.data.id;

  const [[existing], [department], [user]] = await Promise.all([
    db.select({
      id: documentsTable.id,
      file_path: documentsTable.file_path,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
    }).from(documentsTable).where(eq(documentsTable.id, docId)).limit(1),
    db.select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable).where(eq(departmentsTable.id, parsed.data.department_id)).limit(1),
    db.select({ id: usersTable.id, full_name: usersTable.full_name, signature_image: usersTable.signature_image })
      .from(usersTable).where(eq(usersTable.id, userId!)).limit(1),
  ]);

  if (!existing) return res.status(404).json({ error: "Document not found" });
  if (!department) return res.status(400).json({ error: "Department not found" });

  const newStatus = `ئاڕاستەکرا بۆ: ${department.name}`;
  const notes = parsed.data.notes || null;

  // ── Embed stamp onto attachment (all formats) ──────────────────
  let newFilePath = existing.file_path;
  if (existing.file_path) {
    const fileAbsPath = path.join(process.cwd(), "uploads", existing.file_path);
    if (fs.existsSync(fileAbsPath)) {
      try {
        let sigAbsPath: string | null = null;
        if (user?.signature_image) {
          const c = path.join(process.cwd(), "uploads", "signatures", path.basename(user.signature_image));
          if (fs.existsSync(c)) sigAbsPath = c;
        }

        const ext    = path.extname(existing.file_path).toLowerCase();
        const qrText = `ژ. ${existing.document_number}`;
        const now    = new Date();

        let stampedBytes: Uint8Array | Buffer;
        let outExt: string;

        if (ext === ".pdf") {
          stampedBytes = await embedForwardStamp({ pdfAbsPath: fileAbsPath, notes, sigAbsPath, date: now, qrText });
          outExt = ".pdf";
        } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
          stampedBytes = await stampImageFile({ imgAbsPath: fileAbsPath, sigAbsPath, notes, date: now, qrText, includeQr: true });
          outExt = ".jpg";
        } else {
          // Word / Excel → PDF stamp cover
          stampedBytes = await createStampCoverPdf({
            docNumber: existing.document_number,
            subject: existing.subject,
            signerName: user?.full_name ?? "نەزانراو",
            sigAbsPath, notes, date: now, qrText, includeQr: true,
          });
          outExt = ".pdf";
        }

        const origBase  = path.basename(existing.file_path, ext);
        const newFname  = `forwarded-${Date.now()}-${origBase}${outExt}`;
        await fs.promises.writeFile(path.join(process.cwd(), "uploads", "attachments", newFname), stampedBytes);
        newFilePath = `attachments/${newFname}`;
      } catch (err) {
        console.error("Stamp embedding failed, forwarding without stamp:", err);
      }
    }
  }

  await db.update(documentsTable)
    .set({ current_status: newStatus, file_path: newFilePath, updated_at: new Date() })
    .where(eq(documentsTable.id, docId));

  const stampApplied = newFilePath !== existing.file_path;
  await db.insert(documentLogsTable).values({
    document_id: docId, user_id: userId ?? null,
    action: stampApplied
      ? `نووسراوەکە ئاڕاستەکرا بۆ: ${department.name} (هامش و ئیمزا تومارکرا)`
      : `نووسراوەکە ئاڕاستەکرا بۆ: ${department.name}`,
    notes,
  });

  return res.json(await getDocumentWithCreator(docId));
});

// PATCH /documents/:id
router.patch("/documents/:id", async (req, res) => {
  const paramParsed = UpdateDocumentParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [exists] = await db
    .select({ id: documentsTable.id, current_status: documentsTable.current_status })
    .from(documentsTable)
    .where(eq(documentsTable.id, paramParsed.data.id))
    .limit(1);
  if (!exists) return res.status(404).json({ error: "Document not found" });

  if (parsed.data.document_number) {
    const [dup] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(eq(documentsTable.document_number, parsed.data.document_number))
      .limit(1);
    if (dup && dup.id !== paramParsed.data.id)
      return res.status(409).json({ error: "Document number already exists" });
  }

  await db
    .update(documentsTable)
    .set({
      ...parsed.data,
      document_date: parsed.data.document_date
        ? parsed.data.document_date.toISOString().slice(0, 10)
        : undefined,
      updated_at: new Date(),
    })
    .where(eq(documentsTable.id, paramParsed.data.id));

  if (parsed.data.current_status && parsed.data.current_status !== exists.current_status) {
    await db.insert(documentLogsTable).values({
      document_id: paramParsed.data.id,
      user_id: req.session?.userId ?? null,
      action: `دۆخ گۆڕدرا بۆ: ${parsed.data.current_status}`,
      notes: null,
    });
  } else {
    await db.insert(documentLogsTable).values({
      document_id: paramParsed.data.id,
      user_id: req.session?.userId ?? null,
      action: "نوێکرایەوە",
      notes: null,
    });
  }

  const result = await getDocumentWithCreator(paramParsed.data.id);
  return res.json(result);
});

// DELETE /documents/:id
router.delete("/documents/:id", async (req, res) => {
  const parsed = DeleteDocumentParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const [doc] = await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, parsed.data.id))
    .returning();
  if (!doc) return res.status(404).json({ error: "Document not found" });
  return res.status(204).send();
});

// GET /documents/:id/logs
router.get("/documents/:id/logs", async (req, res) => {
  const parsed = ListDocumentLogsParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const [doc] = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.id, parsed.data.id))
    .limit(1);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const logs = await db
    .select({
      id: documentLogsTable.id,
      document_id: documentLogsTable.document_id,
      user_id: documentLogsTable.user_id,
      user_name: usersTable.full_name,
      action: documentLogsTable.action,
      notes: documentLogsTable.notes,
      timestamp: documentLogsTable.timestamp,
    })
    .from(documentLogsTable)
    .leftJoin(usersTable, eq(documentLogsTable.user_id, usersTable.id))
    .where(eq(documentLogsTable.document_id, parsed.data.id))
    .orderBy(documentLogsTable.timestamp); // asc — oldest first, matching original model

  return res.json(logs);
});

// POST /documents/:id/logs
router.post("/documents/:id/logs", async (req, res) => {
  const paramParsed = CreateDocumentLogParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const parsed = CreateDocumentLogBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [doc] = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.id, paramParsed.data.id))
    .limit(1);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const [log] = await db
    .insert(documentLogsTable)
    .values({
      document_id: paramParsed.data.id,
      user_id: req.session?.userId ?? null,
      action: parsed.data.action,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return res.status(201).json(log);
});

// ── Sign layout helper ────────────────────────────────────────
/**
 * Embeds signature image, notes text, and/or date onto the last page of a PDF
 * at independently-specified positions.
 *
 * Positions are expressed as fractions (0–1) of the page dimensions, measured
 * from the top-left corner of the page (matching screen coordinates).  The
 * helper converts them to pdf-lib's bottom-left origin internally.
 *
 * PREVIEW_W / PREVIEW_H are the pixel dimensions of the on-screen A4 canvas
 * that the frontend uses.  Fractions sent by the client equal
 *   px_x / PREVIEW_W  and  px_y / PREVIEW_H.
 */
const PREVIEW_W = 800;
const PREVIEW_H = 1131;

interface SignElementOpts {
  pdfAbsPath: string;
  sigAbsPath: string | null;
  /** pixel coords in the PREVIEW_W × PREVIEW_H canvas; undefined = default bottom-right */
  sigPx?: { x: number; y: number };
  notesText?: string | null;
  notesPx?: { x: number; y: number };
  includeDate?: boolean;
  datePx?: { x: number; y: number };
  date: Date;
  /** Text to encode in a QR code placed at the bottom-right of the page; omit to skip */
  qrText?: string;
}

async function embedSignElements(opts: SignElementOpts): Promise<Uint8Array> {
  const { pdfAbsPath, sigAbsPath, sigPx, notesText, notesPx, includeDate, datePx, date, qrText } = opts;

  const pdfBytes = await fs.promises.readFile(pdfAbsPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  let boldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  try {
    boldFont = await pdfDoc.embedFont(await getArabicFontBytes(true));
  } catch {
    boldFont = await pdfDoc.embedFont(await getArabicFontBytes(false));
  }

  const pages = pdfDoc.getPages();
  // Sign page 1 (index 0) — matching the FPDI reference implementation
  const page = pages[0];
  const { width: pageW, height: pageH } = page.getSize();

  /** Convert preview-space px → PDF points (bottom-left origin) */
  function toPageCoords(px: number, py: number) {
    return {
      x: (px / PREVIEW_W) * pageW,
      y: pageH - (py / PREVIEW_H) * pageH,
    };
  }

  const GREEN = rgb(0.02, 0.50, 0.12);
  const FS = 12;
  const LINE_H = 18;

  // ── Signature image ───────────────────────────────────────────
  if (sigAbsPath && fs.existsSync(sigAbsPath)) {
    const sigBytes = await fs.promises.readFile(sigAbsPath);
    const ext = path.extname(sigAbsPath).toLowerCase();
    const sigImg = ext === ".png"
      ? await pdfDoc.embedPng(sigBytes)
      : await pdfDoc.embedJpg(sigBytes);
    const { width: iw, height: ih } = sigImg.size();
    const maxW = 160, maxH = 80;
    const scale = Math.min(maxW / iw, maxH / ih);
    const sigW = iw * scale;
    const sigH = ih * scale;

    let dx: number, dy: number;
    if (sigPx) {
      const c = toPageCoords(sigPx.x, sigPx.y);
      dx = c.x;
      // sigPx.y is the TOP of the box on screen → PDF y is the BOTTOM of the box
      dy = c.y - sigH;
    } else {
      // Default: bottom-right with margin
      dx = pageW - sigW - 30;
      dy = 30;
    }
    page.drawImage(sigImg, { x: dx, y: dy, width: sigW, height: sigH });
  }

  // ── Notes text ────────────────────────────────────────────────
  if (notesText?.trim()) {
    const WRAP_W = pageW * 0.4;
    const MAX_LINES = 8;
    const words = notesText.trim().split(/\s+/);
    const lines: string[] = [];
    let current = "";
    outer: for (const word of words) {
      let safeWord = word;
      while (boldFont.widthOfTextAtSize(safeWord, FS) > WRAP_W && safeWord.length > 1) {
        safeWord = safeWord.slice(0, -1);
      }
      if (safeWord !== word) safeWord += "…";
      const candidate = current ? `${current} ${safeWord}` : safeWord;
      if (boldFont.widthOfTextAtSize(candidate, FS) > WRAP_W) {
        if (current) {
          lines.push(current);
          if (lines.length >= MAX_LINES) break outer;
        }
        current = safeWord;
      } else {
        current = candidate;
      }
    }
    if (current && lines.length < MAX_LINES) lines.push(current);

    let nx: number, ny: number;
    if (notesPx) {
      const c = toPageCoords(notesPx.x, notesPx.y);
      nx = c.x;
      ny = c.y - FS; // top of text block
    } else {
      nx = 40;
      ny = pageH / 2;
    }

    for (const line of lines) {
      page.drawText(line, { x: nx, y: ny, font: boldFont, size: FS, color: GREEN });
      ny -= LINE_H;
    }
  }

  // ── Date ──────────────────────────────────────────────────────
  if (includeDate) {
    const d = date;
    // Split into two separate drawText calls to avoid RTL/LTR bidi mixing
    // artefacts (square brackets and mis-measured width) in pdf-lib.
    const dateLabel = "Date:";
    const dateValue = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    let dxPt: number, dyPt: number;
    if (datePx) {
      const c = toPageCoords(datePx.x, datePx.y);
      dxPt = c.x;
      dyPt = c.y - FS;
    } else {
      dxPt = 40;
      dyPt = pageH / 2 - 40;
    }
    page.drawText(dateLabel, { x: dxPt, y: dyPt, font: boldFont, size: FS, color: GREEN });
    page.drawText(dateValue, { x: dxPt, y: dyPt - LINE_H, font: boldFont, size: FS, color: GREEN });
  }

  // QR code — bottom-right corner of the page
  if (qrText) {
    await embedQrOnPdfPage(pdfDoc, page, qrText);
  }

  return pdfDoc.save();
}

// POST /documents/:id/sign
// Supports PDF, images (JPG/PNG), Word (DOC/DOCX), and Excel (XLS/XLSX).
// Body fields (all optional):
//   signature_x/y, notes_x/y, date_x/y — canvas pixel coords (PDF only)
//   notes_text     — annotation text
//   include_date   — whether to print the current date (boolean, default true)
//   include_qr     — whether to embed a QR code (boolean, default true)
router.post("/documents/:id/sign", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) return res.status(400).json({ error: "Invalid document ID" });

  const body = req.body ?? {};
  const toNum = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v)));
  const sigPx = Number.isFinite(toNum(body.signature_x)) && Number.isFinite(toNum(body.signature_y))
    ? { x: toNum(body.signature_x), y: toNum(body.signature_y) } : undefined;
  const notesPx = Number.isFinite(toNum(body.notes_x)) && Number.isFinite(toNum(body.notes_y))
    ? { x: toNum(body.notes_x), y: toNum(body.notes_y) } : undefined;
  const datePx = Number.isFinite(toNum(body.date_x)) && Number.isFinite(toNum(body.date_y))
    ? { x: toNum(body.date_x), y: toNum(body.date_y) } : undefined;
  const notesText: string | null = typeof body.notes_text === "string" ? body.notes_text : null;
  const includeDate: boolean = body.include_date !== false && body.include_date !== "false";
  const includeQr:   boolean = body.include_qr   !== false && body.include_qr   !== "false";

  const [[doc], [user]] = await Promise.all([
    db.select({
      id: documentsTable.id,
      file_path: documentsTable.file_path,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
    }).from(documentsTable).where(eq(documentsTable.id, docId)).limit(1),
    db.select({
      id: usersTable.id, full_name: usersTable.full_name, signature_image: usersTable.signature_image,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),
  ]);

  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (!user?.signature_image) {
    return res.status(422).json({ error: "تۆ هێشتا ئیمزای ئەلیکترۆنیت نەناردووە. تکایە لە پرۆفایلەکەت ئیمزاکەت زیاد بکە." });
  }

  const fileAbsPath = path.join(process.cwd(), "uploads", doc.file_path);
  if (!fs.existsSync(fileAbsPath)) return res.status(404).json({ error: "فایلەکە نەدۆزرایەوە" });

  const sigFilename = path.basename(user.signature_image);
  const sigAbsPath  = path.join(process.cwd(), "uploads", "signatures", sigFilename);
  if (!fs.existsSync(sigAbsPath)) {
    return res.status(422).json({ error: "فایلی ئیمزا نەدۆزرایەوە. تکایە ئیمزاکەت دووبارە بارگیری بکە." });
  }

  const ext     = path.extname(doc.file_path).toLowerCase();
  const qrText  = `ژ. ${doc.document_number}`;
  const now     = new Date();

  let signedBytes: Uint8Array | Buffer;
  let outExt: string;

  if (ext === ".pdf") {
    signedBytes = await embedSignElements({
      pdfAbsPath: fileAbsPath, sigAbsPath,
      sigPx, notesText, notesPx,
      includeDate, datePx,
      date: now,
      qrText: includeQr ? qrText : "",
    });
    outExt = ".pdf";
  } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
    signedBytes = await stampImageFile({
      imgAbsPath: fileAbsPath, sigAbsPath,
      notes: notesText, date: now,
      qrText, includeQr,
    });
    outExt = ".jpg";
  } else {
    // Word / Excel → create a PDF stamp-cover page
    signedBytes = await createStampCoverPdf({
      docNumber: doc.document_number,
      subject: doc.subject,
      signerName: user.full_name,
      sigAbsPath, notes: notesText,
      date: now, qrText, includeQr,
    });
    outExt = ".pdf";
  }

  const origBase   = path.basename(doc.file_path, ext);
  const newFilename = `signed-${Date.now()}-${origBase}${outExt}`;
  await fs.promises.writeFile(
    path.join(process.cwd(), "uploads", "attachments", newFilename),
    signedBytes,
  );
  const newFilePath = `attachments/${newFilename}`;

  await db.update(documentsTable)
    .set({ file_path: newFilePath, current_status: "ئیمزاکرا", updated_at: new Date() })
    .where(eq(documentsTable.id, docId));

  const notesLog = notesText?.trim() ? ` — هامش: ${notesText.trim().slice(0, 80)}` : "";
  await db.insert(documentLogsTable).values({
    document_id: docId, user_id: userId,
    action: "ئیمزای ئەلیکترۆنی کرا",
    notes: `ئیمزاکرا لەلایەن: ${user.full_name}${notesLog}`,
  });

  return res.json(await getDocumentWithCreator(docId));
});

// GET /documents/:id/preview — render page 1 of the PDF as a JPEG (cached)
router.get("/documents/:id/preview", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const idParsed = GetDocumentParams.safeParse(req.params);
  if (!idParsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const [doc] = await db
    .select({ id: documentsTable.id, file_path: documentsTable.file_path })
    .from(documentsTable)
    .where(eq(documentsTable.id, idParsed.data.id))
    .limit(1);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const ext = path.extname(doc.file_path).toLowerCase();
  if (ext !== ".pdf") {
    return res.status(422).json({ error: "Preview only available for PDF attachments" });
  }

  const pdfAbsPath = path.join(process.cwd(), "uploads", doc.file_path);
  if (!fs.existsSync(pdfAbsPath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const jpegPath = await getPdfPreviewJpeg(pdfAbsPath);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(jpegPath);
  } catch (err) {
    console.error("PDF preview generation failed:", err);
    return res.status(500).json({ error: "فایلەکە نەتوانرا بکرێتە وێنە" });
  }
});

// GET /documents/uploads/attachments/:filename — authenticated inline view
// file_path in DB is stored as "attachments/<filename>", so this route mirrors that shape.
router.get("/documents/uploads/attachments/:filename", (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(process.cwd(), "uploads", "attachments", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  const ext = path.extname(filename).toLowerCase();
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.sendFile(filePath);
});

// GET /documents/:id/download — force-download the attached PDF with a clean filename
router.get("/documents/:id/download", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const idParsed = GetDocumentParams.safeParse(req.params);
  if (!idParsed.success) return res.status(400).json({ error: "Invalid document ID" });

  const [doc] = await db
    .select({
      id: documentsTable.id,
      document_number: documentsTable.document_number,
      file_path: documentsTable.file_path,
    })
    .from(documentsTable)
    .where(eq(documentsTable.id, idParsed.data.id))
    .limit(1);

  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (!doc.file_path) return res.status(404).json({ error: "No attachment for this document" });

  const filename = path.basename(doc.file_path);
  const filePath = path.join(process.cwd(), "uploads", "attachments", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk" });
  }

  // Use the document number + real extension as the download filename
  const ext = path.extname(filename).toLowerCase() || ".bin";
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const safeDocNumber = doc.document_number.replace(/[^\w\-٠-٩]/g, "_");
  const downloadName = `${safeDocNumber || `document-${doc.id}`}${ext}`;
  res.setHeader("Content-Type", mime);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
  );
  return res.sendFile(filePath);
});

export default router;
