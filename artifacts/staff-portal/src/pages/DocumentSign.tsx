import React, { useRef, useState, useCallback, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetDocument, getGetDocumentQueryKey, useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight, PenLine, FileText, Loader2,
  GripVertical, Calendar, MessageSquare, CheckCircle2,
  QrCode, FileSpreadsheet, Image as ImageIcon,
} from "lucide-react";

const ku: React.CSSProperties = {
  fontFamily: "'Noto Kufi Arabic', sans-serif",
  direction: "rtl",
  unicodeBidi: "embed",
};

// Preview canvas dimensions (A4 at screen resolution)
const PREVIEW_W = 800;
const PREVIEW_H = 1131;
const HANDLE_H  = 24;
const BOX_W     = 200;
const SIG_H     = 80;
const NOTES_H   = 72;
const DATE_H    = 28;
const QR_H      = 28;
const SEC_GAP   = 0;

// ── File type helper ────────────────────────────────────────────────────────
type FileKind = "pdf" | "image" | "word" | "excel" | "other";
function fileKind(filePath: string): FileKind {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  return "other";
}

// ── Draggable hook ──────────────────────────────────────────────────────────
interface DragPos { x: number; y: number }

function useDraggable(initial: DragPos) {
  const [pos, setPos] = useState<DragPos>(initial);
  const dragging = useRef(false);
  const startMouse = useRef<DragPos>({ x: 0, y: 0 });
  const startPos   = useRef<DragPos>(initial);

  const clamp = useCallback((p: DragPos, maxX: number, maxY: number): DragPos => ({
    x: Math.max(0, Math.min(maxX, p.x)),
    y: Math.max(0, Math.min(maxY, p.y)),
  }), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    dragging.current    = true;
    startMouse.current  = { x: e.clientX, y: e.clientY };
    startPos.current    = pos;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent, maxX: number, maxY: number) => {
    if (!dragging.current) return;
    setPos(clamp({
      x: startPos.current.x + (e.clientX - startMouse.current.x),
      y: startPos.current.y + (e.clientY - startMouse.current.y),
    }, maxX, maxY));
  }, [clamp]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return { pos, setPos, clamp, onPointerDown, onPointerMove, onPointerUp };
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DocumentSign() {
  const [, params]   = useRoute("/documents/:id/sign");
  const [, navigate] = useLocation();
  const { user }     = useAuth();
  const { toast }    = useToast();
  const documentId   = Number(params?.id);

  const { data: document, isLoading } = useGetDocument(documentId, {
    query: { enabled: !!documentId, queryKey: getGetDocumentQueryKey(documentId) },
  });
  const { data: userProfile } = useGetUser(user?.id ?? 0, {
    query: { enabled: !!user?.id, queryKey: getGetUserQueryKey(user?.id ?? 0) },
  });

  const [notesText, setNotesText] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const [showDate,  setShowDate]  = useState(true);
  const [showQr,    setShowQr]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const kind       = fileKind(document?.file_path ?? "");
  const isPdf      = kind === "pdf";
  const isImage    = kind === "image";

  const previewUrl   = documentId ? `${window.location.origin}/api/documents/${documentId}/preview` : null;
  const fileUrl      = document?.file_path
    ? `${window.location.origin}/api/documents/uploads/${document.file_path}`
    : null;
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError,  setPreviewError]  = useState(false);

  // Box geometry
  const contentH =
    SIG_H +
    (showNotes ? NOTES_H + SEC_GAP : 0) +
    (showDate  ? DATE_H  + SEC_GAP : 0) +
    (showQr    ? QR_H    + SEC_GAP : 0);
  const totalBoxH = HANDLE_H + contentH;
  const maxX = PREVIEW_W - BOX_W;
  const maxY = PREVIEW_H - totalBoxH;

  const box = useDraggable({ x: PREVIEW_W - BOX_W - 40, y: PREVIEW_H - totalBoxH - 40 });
  useEffect(() => {
    box.setPos((p) => box.clamp(p, maxX, Math.max(0, maxY)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotes, showDate, showQr]);

  const sigFilename = userProfile?.signature_image
    ? userProfile.signature_image.split("/").pop() : null;
  const userSigUrl = sigFilename
    ? `${window.location.origin}/api/users/uploads/signatures/${sigFilename}` : null;

  const _d = new Date();
  const todayStr = `${_d.getFullYear()}/${String(_d.getMonth() + 1).padStart(2, "0")}/${String(_d.getDate()).padStart(2, "0")}`;

  const sigContentY   = box.pos.y + HANDLE_H;
  const notesContentY = sigContentY + SIG_H + SEC_GAP;
  const dateContentY  = notesContentY + (showNotes ? NOTES_H + SEC_GAP : 0);

  async function handleSubmit() {
    if (!documentId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        include_date: showDate,
        include_qr:   showQr,
      };

      if (notesText.trim()) body.notes_text = notesText.trim();

      // Only send pixel coordinates for PDF (canvas drag placement)
      if (isPdf) {
        body.signature_x = box.pos.x;
        body.signature_y = sigContentY;
        if (showNotes && notesText.trim()) {
          body.notes_x = box.pos.x;
          body.notes_y = notesContentY;
        }
        if (showDate) {
          body.date_x = box.pos.x;
          body.date_y = dateContentY;
        }
      }

      const res = await fetch(`${window.location.origin}/api/documents/${documentId}/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      setDone(true);
      toast({ title: "ئیمزا بە سەرکەوتوویی کرا." });
      setTimeout(() => navigate(`/documents/${documentId}`), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "هەڵەیەک ڕوویدا";
      toast({ title: "هەڵە", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit button label ───────────────────────────────────────────────────
  function submitLabel() {
    if (submitting) return <><Loader2 className="h-4 w-4 animate-spin" />کاردەکرێت...</>;
    if (kind === "image")               return <><PenLine className="h-4 w-4" />ئیمزا و مۆهر لە وێنەکە</>;
    if (kind === "word" || kind === "excel") return <><PenLine className="h-4 w-4" />دروستکردنی PDF مۆهردار</>;
    return <><PenLine className="h-4 w-4" />پاشەکەوتکردنی ئیمزا</>;
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={ku}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-sm">چاوەڕێ بکە...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center" style={ku}>
        <div className="rounded-2xl bg-muted/60 p-6">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-xl font-bold">نووسراوەکە نەدۆزرایەوە</h2>
        <Button asChild className="rounded-xl">
          <Link href="/documents">گەڕانەوە بۆ نووسراوەکان</Link>
        </Button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" style={ku}>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-l from-violet-500 via-violet-400 to-violet-600" />
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9 shrink-0">
              <Link href={`/documents/${documentId}`}><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ئیمزاکردنی نووسراو</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{document.subject}</p>
            </div>
          </div>
          {done ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4" />کرا
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0"
            >
              {submitLabel()}
            </Button>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-auto" style={ku}>
          بژاردەکان
        </p>

        {/* Notes toggle */}
        <button type="button" onClick={() => setShowNotes(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            showNotes ? "bg-blue-500 border-blue-500 text-white shadow-sm"
            : "bg-background border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600"
          }`}>
          <MessageSquare className="h-3 w-3" />
          هامش
        </button>

        {/* Date toggle */}
        <button type="button" onClick={() => setShowDate(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            showDate ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
            : "bg-background border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"
          }`}>
          <Calendar className="h-3 w-3" />
          بەروار
        </button>

        {/* QR toggle */}
        <button type="button" onClick={() => setShowQr(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            showQr ? "bg-orange-500 border-orange-500 text-white shadow-sm"
            : "bg-background border-border text-muted-foreground hover:border-orange-400 hover:text-orange-600"
          }`}>
          <QrCode className="h-3 w-3" />
          QR کیوئار
        </button>

        {isPdf && (
          <p className="text-xs text-muted-foreground" style={ku}>بۆکسەکە بجوڵێنە بۆ شوێنی دڵخواز</p>
        )}
      </div>

      {/* Notes text input */}
      {showNotes && (
        <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5" style={ku}>
            <MessageSquare className="h-3 w-3" />دەقی هامش
          </label>
          <textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            placeholder="هامشەکەت لێرە بنووسە..."
            rows={3}
            className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-right"
            style={ku}
          />
        </div>
      )}

      {/* ── PDF: interactive drag canvas ──────────────────────────────────── */}
      {isPdf && (
        <div className="overflow-x-auto pb-2">
          <div
            className="relative mx-auto border border-border rounded-2xl overflow-hidden shadow-lg bg-white"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          >
            {previewUrl && !previewError && (
              <img
                src={previewUrl} alt="پیشاندانی PDF"
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: "fill", pointerEvents: "none" }}
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setPreviewError(true)}
              />
            )}
            {!previewLoaded && !previewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50" style={ku}>
                <div className="h-7 w-7 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">پیشاندانی PDF...</p>
              </div>
            )}
            {previewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50/80" style={ku}>
                <p className="text-sm text-muted-foreground text-center px-4">
                  پیشاندان سەرکەوتوو نەبوو — ئیمزا دەخرێتە شوێنی دروست.
                </p>
              </div>
            )}

            {/* Drag overlay */}
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
              <div
                style={{ position: "absolute", left: box.pos.x, top: box.pos.y, width: BOX_W, userSelect: "none", touchAction: "none" }}
                onPointerDown={box.onPointerDown}
                onPointerMove={e => box.onPointerMove(e, maxX, Math.max(0, maxY))}
                onPointerUp={box.onPointerUp}
              >
                {/* Handle */}
                <div
                  className="flex items-center gap-1.5 px-2 rounded-t-lg cursor-grab active:cursor-grabbing bg-violet-600 text-white text-[10px] font-bold select-none"
                  style={{ height: HANDLE_H }}
                >
                  <GripVertical className="h-3 w-3 opacity-70 shrink-0" />
                  <PenLine className="h-3 w-3 opacity-70 shrink-0" />
                  <span>ئیمزا</span>
                  {showNotes && <><span className="opacity-40 mx-0.5">·</span><MessageSquare className="h-2.5 w-2.5 opacity-60 shrink-0" /><span>هامش</span></>}
                  {showDate  && <><span className="opacity-40 mx-0.5">·</span><Calendar    className="h-2.5 w-2.5 opacity-60 shrink-0" /><span>بەروار</span></>}
                  {showQr    && <><span className="opacity-40 mx-0.5">·</span><QrCode      className="h-2.5 w-2.5 opacity-60 shrink-0" /><span>QR</span></>}
                </div>

                {/* Box body */}
                <div className="border-2 border-violet-400 rounded-b-lg overflow-hidden bg-white/95 backdrop-blur-sm">
                  {/* Signature */}
                  <div className="flex items-center justify-center bg-violet-50/80" style={{ height: SIG_H }}>
                    {userSigUrl ? (
                      <img src={userSigUrl} alt="ئیمزا"
                        className="max-w-full max-h-full object-contain pointer-events-none px-2 py-1" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-violet-400/60" style={ku}>
                        <PenLine className="h-6 w-6" />
                        <span className="text-[9px]">ئیمزا نییە</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {showNotes && (
                    <>
                      <div className="h-px bg-violet-200" />
                      <div className="px-2 py-1.5 bg-blue-50/70 overflow-hidden"
                        style={{ height: NOTES_H, ...ku, fontSize: 10, lineHeight: "1.5" }}>
                        {notesText.trim() || <span className="text-blue-400/50" style={ku}>هامش لێرە دەخرێت...</span>}
                      </div>
                    </>
                  )}

                  {/* Date */}
                  {showDate && (
                    <>
                      <div className="h-px bg-violet-200" />
                      <div className="flex items-center justify-end gap-1.5 px-2 bg-emerald-50/70"
                        style={{ height: DATE_H, ...ku, fontSize: 11 }}>
                        <Calendar className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="font-semibold tabular-nums text-emerald-900/80">{todayStr}</span>
                      </div>
                    </>
                  )}

                  {/* QR indicator */}
                  {showQr && (
                    <>
                      <div className="h-px bg-violet-200" />
                      <div className="flex items-center justify-end gap-1.5 px-2 bg-orange-50/70"
                        style={{ height: QR_H, fontSize: 10 }}>
                        <QrCode className="h-3 w-3 text-orange-600 shrink-0" />
                        <span className="text-orange-800/70 font-semibold text-[10px]">QR</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image: show image preview with auto-stamp note ──────────────── */}
      {isImage && fileUrl && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="relative">
            <img
              src={fileUrl}
              alt="وێنەی هاوپێچ"
              className="w-full max-h-[500px] object-contain bg-gray-50"
            />
            {/* Stamp indicator overlay */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm border border-emerald-300 px-3 py-2 shadow-sm text-xs" style={ku}>
                <PenLine className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-800 font-semibold">ئیمزا + هامش لە کونجی خوارەوە دادەنرێت</span>
              </div>
              {showQr && (
                <div className="flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm border border-orange-300 px-3 py-2 shadow-sm text-xs" style={ku}>
                  <QrCode className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                  <span className="text-orange-800 font-semibold">کیوئار دادەنرێت</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Word / Excel / other: placeholder ───────────────────────────── */}
      {!isPdf && !isImage && (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-5 text-center" style={ku}>
            <div className={`rounded-2xl p-5 ${kind === "excel" ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
              {kind === "excel"
                ? <FileSpreadsheet className="h-12 w-12 text-emerald-600" />
                : <FileText        className="h-12 w-12 text-blue-600" />
              }
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {kind === "excel" ? "فایلی Excel" : "فایلی Word"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                یەک پەڕەی PDF مۆهردار دروست دەکرێت و لە شوێنی فایلی کۆی ئەسڵی دادەنرێت.
                ئیمزا، هامش، بەروار
                {showQr ? " و کیوئار" : ""}
                {" "}تێدادەنرێن.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {[
                { label: "ئیمزا", color: "bg-violet-100 text-violet-700 border-violet-200" },
                ...(showNotes && notesText.trim() ? [{ label: "هامش", color: "bg-blue-100 text-blue-700 border-blue-200" }] : []),
                ...(showDate ? [{ label: "بەروار", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }] : []),
                ...(showQr   ? [{ label: "QR کیوئار", color: "bg-orange-100 text-orange-700 border-orange-200" }] : []),
              ].map(item => (
                <span key={item.label} className={`px-3 py-1 rounded-full border font-semibold ${item.color}`}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pb-4" style={ku}>
        {isPdf
          ? "بۆکسەکە بجوڵێنە بۆ شوێنی دڵخواز، پاشان «پاشەکەوتکردنی ئیمزا» بکە."
          : "بژاردەکانت دیاری بکە، پاشان دوگمەکە بکە."}
      </p>
    </div>
  );
}
