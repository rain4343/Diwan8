import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

// Dynamic import AFTER dotenv loads env vars (ESM hoisting fix)
const { db, usersTable } = await import("@workspace/db");
import bcrypt from "bcryptjs";

const username = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] ?? username;

if (!username || !password) {
  console.error("Usage: tsx create-user.ts <username> <password> [full_name]");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

const [user] = await db
  .insert(usersTable)
  .values({
    username,
    password: hash,
    full_name: fullName,
    email: `${username}@staff.local`,
    is_system_admin: true,
  })
  .onConflictDoNothing()
  .returning({ id: usersTable.id, username: usersTable.username });

if (user) {
  console.log(`✓ User created: ${user.username} (id=${user.id})`);
} else {
  console.log(`⚠ User '${username}' already exists — no changes made.`);
}

process.exit(0);
