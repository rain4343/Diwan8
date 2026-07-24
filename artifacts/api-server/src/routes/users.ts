import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, ilike, and, inArray } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable, rolesTable, roleUserTable, departmentsTable } from "@workspace/db";
import { requireSystemAdmin } from "../middleware/requireAuth";
import {
  CreateUserBody,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
  DeleteUserParams,
  GetUserRolesParams,
  AssignRoleParams,
  AssignRoleBody,
  RemoveRoleParams,
  ListUsersQueryParams,
} from "@workspace/api-zod";

const router = Router();

// ── Signature upload setup ─────────────────────────────────────
const sigUploadDir = path.join(process.cwd(), "uploads", "signatures");
fs.mkdirSync(sigUploadDir, { recursive: true });

const sigStorage = multer.diskStorage({
  destination: sigUploadDir,
  filename: (_req, _file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.png`);
  },
});

const sigUpload = multer({
  storage: sigStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("PNG files only"));
    }
  },
});

// ── Avatar upload setup ────────────────────────────────────────
const avatarUploadDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: avatarUploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
    cb(null, `${unique}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (["image/png", "image/jpeg"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("PNG or JPG files only"));
    }
  },
});

// ── Helpers ───────────────────────────────────────────────────
async function getUserWithRoles(id: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      full_name: usersTable.full_name,
      username: usersTable.username,
      email: usersTable.email,
      phone: usersTable.phone,
      avatar_image: usersTable.avatar_image,
      department_id: usersTable.department_id,
      department_name: departmentsTable.name,
      signature_image: usersTable.signature_image,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.department_id, departmentsTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) return null;

  const roles = await db
    .select({ id: rolesTable.id, name: rolesTable.name })
    .from(roleUserTable)
    .innerJoin(rolesTable, eq(roleUserTable.role_id, rolesTable.id))
    .where(eq(roleUserTable.user_id, id));

  return { ...user, roles };
}

// GET /users/uploads/signatures/:filename  — serve signature images
router.get("/users/uploads/signatures/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(sigUploadDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
  return res.sendFile(filePath);
});

// GET /users/uploads/avatars/:filename  — serve avatar images
router.get("/users/uploads/avatars/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(avatarUploadDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
  return res.sendFile(filePath);
});

// GET /users
router.get("/users", async (req, res) => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [];
  if (params.department_id) conditions.push(eq(usersTable.department_id, params.department_id));
  if (params.search) conditions.push(ilike(usersTable.full_name, `%${params.search}%`));

  const baseQuery = db
    .select({
      id: usersTable.id,
      full_name: usersTable.full_name,
      username: usersTable.username,
      email: usersTable.email,
      department_id: usersTable.department_id,
      department_name: departmentsTable.name,
      signature_image: usersTable.signature_image,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.department_id, departmentsTable.id));

  const users = conditions.length > 0
    ? await baseQuery.where(and(...conditions)).orderBy(usersTable.full_name)
    : await baseQuery.orderBy(usersTable.full_name);

  const userIds = users.map((u) => u.id);
  let roleMap: Record<number, { id: number; name: string }[]> = {};

  if (userIds.length > 0) {
    const roleRows = await db
      .select({ user_id: roleUserTable.user_id, role_id: rolesTable.id, role_name: rolesTable.name })
      .from(roleUserTable)
      .innerJoin(rolesTable, eq(roleUserTable.role_id, rolesTable.id))
      .where(inArray(roleUserTable.user_id, userIds));

    for (const r of roleRows) {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push({ id: r.role_id, name: r.role_name });
    }
  }

  let result = users.map((u) => ({ ...u, roles: roleMap[u.id] ?? [] }));
  if (params.role_id) {
    result = result.filter((u) => u.roles.some((r: { id: number }) => r.id === params.role_id));
  }

  return res.json(result);
});

// POST /users
router.post("/users", requireSystemAdmin, async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { role_ids, ...userData } = parsed.data;

  // Validate role_ids exist before writing
  if (role_ids && role_ids.length > 0) {
    const foundRoles = await db.select({ id: rolesTable.id }).from(rolesTable).where(inArray(rolesTable.id, role_ids));
    if (foundRoles.length !== role_ids.length) {
      return res.status(400).json({ error: "One or more role IDs are invalid" });
    }
  }

  // Check uniqueness
  const [existingUsername] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, userData.username)).limit(1);
  if (existingUsername) return res.status(409).json({ error: "Username already exists" });

  const [existingEmail] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, userData.email)).limit(1);
  if (existingEmail) return res.status(409).json({ error: "Email already exists" });

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Transactional insert
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values({ ...userData, password: hashedPassword }).returning();
    if (role_ids && role_ids.length > 0) {
      await tx.insert(roleUserTable).values(role_ids.map((role_id) => ({ user_id: user.id, role_id }))).onConflictDoNothing();
    }
    return user;
  });

  const userWithRoles = await getUserWithRoles(result.id);
  return res.status(201).json(userWithRoles);
});

// GET /users/:id
router.get("/users/:id", async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user ID" });
  const user = await getUserWithRoles(parsed.data.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

// PATCH /users/:id
router.patch("/users/:id", async (req, res) => {
  const paramParsed = UpdateUserParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid user ID" });
  const { id } = paramParsed.data;

  // Users may update their own basic profile fields (name/email/phone/password
  // via the Profile page); only the system administrator may edit other users
  // or change role/department assignments.
  const isSelf = req.session?.userId === id;
  const isSystemAdmin = !!req.session?.isSystemAdmin;
  if (!isSelf && !isSystemAdmin) {
    return res.status(403).json({ error: "تەنها بەڕێوەبەری سیستم دەسەڵاتی دەستکاریکردنی ئەم فەرمانبەرەی هەیە" });
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { role_ids, department_id, ...userData } = parsed.data;
  if ((role_ids !== undefined || department_id !== undefined) && !isSystemAdmin) {
    return res.status(403).json({ error: "تەنها بەڕێوەبەری سیستم دەسەڵاتی گۆڕینی ڕۆڵ و هۆبەی هەیە" });
  }

  // Validate role_ids exist before writes
  if (role_ids !== undefined && role_ids.length > 0) {
    const foundRoles = await db.select({ id: rolesTable.id }).from(rolesTable).where(inArray(rolesTable.id, role_ids));
    if (foundRoles.length !== role_ids.length) {
      return res.status(400).json({ error: "One or more role IDs are invalid" });
    }
  }

  const [exists] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!exists) return res.status(404).json({ error: "User not found" });

  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }

  const updateFields: Record<string, unknown> = { ...userData };
  if (department_id !== undefined) updateFields.department_id = department_id;

  // Transactional update
  await db.transaction(async (tx) => {
    if (Object.keys(updateFields).length > 0) {
      await tx.update(usersTable).set({ ...updateFields, updated_at: new Date() }).where(eq(usersTable.id, id));
    }
    if (role_ids !== undefined) {
      await tx.delete(roleUserTable).where(eq(roleUserTable.user_id, id));
      if (role_ids.length > 0) {
        await tx.insert(roleUserTable).values(role_ids.map((role_id) => ({ user_id: id, role_id }))).onConflictDoNothing();
      }
    }
  });

  const result = await getUserWithRoles(id);
  return res.json(result);
});

// DELETE /users/:id
router.delete("/users/:id", requireSystemAdmin, async (req, res) => {
  const parsed = DeleteUserParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user ID" });

  if (req.session?.userId === parsed.data.id) {
    return res.status(400).json({ error: "ناتوانیت هەژماری خۆت بسڕیتەوە" });
  }

  const [user] = await db.delete(usersTable).where(eq(usersTable.id, parsed.data.id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(204).send();
});

// GET /users/:id/roles
router.get("/users/:id/roles", async (req, res) => {
  const parsed = GetUserRolesParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user ID" });

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, parsed.data.id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const roles = await db
    .select({ id: rolesTable.id, name: rolesTable.name })
    .from(roleUserTable)
    .innerJoin(rolesTable, eq(roleUserTable.role_id, rolesTable.id))
    .where(eq(roleUserTable.user_id, parsed.data.id));

  return res.json(roles);
});

// POST /users/:id/roles
router.post("/users/:id/roles", requireSystemAdmin, async (req, res) => {
  const paramParsed = AssignRoleParams.safeParse(req.params);
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid user ID" });
  const { id } = paramParsed.data;

  const parsed = AssignRoleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [role] = await db.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, parsed.data.role_id)).limit(1);
  if (!role) return res.status(404).json({ error: "Role not found" });

  await db.insert(roleUserTable).values({ user_id: id, role_id: parsed.data.role_id }).onConflictDoNothing();

  const result = await getUserWithRoles(id);
  return res.json(result);
});

// DELETE /users/:id/roles/:roleId
router.delete("/users/:id/roles/:roleId", requireSystemAdmin, async (req, res) => {
  const parsed = RemoveRoleParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });
  const { id, roleId } = parsed.data;

  await db.delete(roleUserTable).where(and(eq(roleUserTable.user_id, id), eq(roleUserTable.role_id, roleId)));

  const result = await getUserWithRoles(id);
  if (!result) return res.status(404).json({ error: "User not found" });
  return res.json(result);
});

// POST /users/:id/avatar  — upload profile picture (PNG or JPG)
router.post("/users/:id/avatar", avatarUpload.single("avatar"), async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user ID" });
  const { id } = parsed.data;

  // Only the user themselves may update their own avatar
  if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
  if (req.session.userId !== id) return res.status(403).json({ error: "دەسەڵاتت نییە" });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const [exists] = await db
    .select({ id: usersTable.id, avatar_image: usersTable.avatar_image })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!exists) return res.status(404).json({ error: "User not found" });

  // Delete old avatar file if present
  if (exists.avatar_image) {
    const oldPath = path.join(avatarUploadDir, path.basename(exists.avatar_image));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await db.update(usersTable).set({ avatar_image: req.file.filename, updated_at: new Date() }).where(eq(usersTable.id, id));

  const result = await getUserWithRoles(id);
  return res.json(result);
});

// POST /users/:id/signature  — upload PNG signature image
router.post("/users/:id/signature", sigUpload.single("signature"), async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user ID" });
  const { id } = parsed.data;

  // Only the user themselves, or the system administrator, may replace a signature
  if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
  if (req.session.userId !== id && !req.session.isSystemAdmin) return res.status(403).json({ error: "دەسەڵاتت نییە" });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const [exists] = await db
    .select({ id: usersTable.id, signature_image: usersTable.signature_image })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!exists) return res.status(404).json({ error: "User not found" });

  // Delete old signature file if present
  if (exists.signature_image) {
    const oldPath = path.join(sigUploadDir, path.basename(exists.signature_image));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const relPath = req.file.filename;
  await db.update(usersTable).set({ signature_image: relPath, updated_at: new Date() }).where(eq(usersTable.id, id));

  const result = await getUserWithRoles(id);
  return res.json(result);
});

export default router;
