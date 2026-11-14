import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";

const COOKIE = "careid_session";
const SESSION_HOURS = 12;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db.session.create({ data: { id: digest(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (token) await db.session.deleteMany({ where: { id: digest(token) } });
}

/** The signed-in user, or null. Memoised per request; a database outage counts as signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await db.session.findUnique({
      where: { id: digest(token) },
      select: { expiresAt: true, user: { select: { id: true, email: true, name: true } } },
    });
    return session && session.expiresAt > new Date() ? session.user : null;
  } catch {
    return null;
  }
});

/** For pages only signed-in users may see: sends everyone else to sign in, then back. */
export async function requireUser(locale: Locale, returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, returnTo))}`);
  return user;
}
