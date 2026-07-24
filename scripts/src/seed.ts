import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

// Dynamic import AFTER dotenv loads env vars (ESM hoisting fix)
const { db, departmentsTable, rolesTable, usersTable, roleUserTable } = await import("@workspace/db");
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const departments = await db
    .insert(departmentsTable)
    .values([
      { name: "هۆبەى کارگێرى و خۆیەتى" },
      { name: "هۆبەى دەرکردە و وەرگرتە" },
      { name: "هۆبەى خزمەتگوزارى و چاككردنەوە" },
      { name: "هۆبەى کاروبارى فەرمانبەران و فێرکردنى ئامادەیی" },
      { name: "هۆبەى فێرکردنى بنەڕەتى" },
      { name: "هۆبەى ئەزموونەکان" },
      { name: "هۆبەى بڕوانامەکان" },
      { name: "هۆبەى ئەرشیف و دۆسیەکان" },
      { name: "هۆبەى ووردبینى" },
      { name: "هۆبەى مووچە" },
      { name: "هۆبەى چاڵاکى وەرزشى" },
      { name: "هۆبەى ژمێریارى" },
      { name: "هۆبەى یاسایى" },
      { name: "هۆبەى چاڵاکى قوتابخانەکان" },
      { name: "هۆبەى کۆگا" },
      { name: "یەکەى سەرپەرشتیارى و دلنیایی جۆریى" },
      { name: "هۆبەى پلان" },
      { name: "هۆبەى فرۆشگا" },
      { name: "هۆبەى بیناسازى" },
    ])
    .onConflictDoNothing()
    .returning();

  const existingDepartments = departments.length > 0 ? departments : await db.select().from(departmentsTable);
  const deptByName = new Map(existingDepartments.map((d) => [d.name, d.id]));

  const roles = await db
    .insert(rolesTable)
    .values([{ name: "Super Admin" }, { name: "فەرمانبەر" }])
    .onConflictDoNothing()
    .returning();

  const existingRoles = roles.length > 0 ? roles : await db.select().from(rolesTable);
  const roleByName = new Map(existingRoles.map((r) => [r.name, r.id]));

  // Create default system admin user (idempotent — skips if already exists)
  const defaultPassword = "Plan123";
  const hash = await bcrypt.hash(defaultPassword, 10);
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      username: "Ahmad",
      password: hash,
      full_name: "Ahmad",
      email: "ahmad@staff.local",
      is_system_admin: true,
    })
    .onConflictDoNothing()
    .returning({ id: usersTable.id, username: usersTable.username });

  if (adminUser) {
    console.log(`✓ Admin user created: ${adminUser.username} (id=${adminUser.id})`);
  } else {
    console.log(`ℹ Admin user 'Ahmad' already exists — skipped.`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
