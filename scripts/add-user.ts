// Creates a sign-in account, or resets an existing one's password, and prints
// a one-off generated password to hand over privately.
//
//   npm run user:add -- someone@sickkids.ca [--name "Full Name"] [--admin]

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { name: { type: "string" }, admin: { type: "boolean", default: false } },
  });
  const email = positionals[0]?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error('Usage: npm run user:add -- someone@sickkids.ca [--name "Full Name"] [--admin]');

  const password = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);
  const role = values.admin ? "ADMIN" : "PH_USER";
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // Signs the account out everywhere along with the password change.
    await db.$transaction([
      db.user.update({ where: { email }, data: { passwordHash, role, ...(values.name ? { name: values.name } : {}) } }),
      db.session.deleteMany({ where: { userId: existing.id } }),
    ]);
  } else {
    await db.user.create({ data: { email, name: values.name, role, passwordHash } });
  }

  console.log(`${existing ? "Reset password for" : "Created"} ${email} (${role}).`);
  console.log(`Password: ${password}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
