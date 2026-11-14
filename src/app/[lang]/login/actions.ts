"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/i18n/config";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export type LoginState = { error: "invalid" | "unavailable" } | undefined;

const Credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

// Server actions can't read the [lang] root param, so forms post their language.
const formLocale = (formData: FormData): Locale => {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE;
};

/** Only same-site paths in the current language, so `next` can't redirect off-site. */
function safeReturn(next: FormDataEntryValue | null, prefix: string): string | null {
  return typeof next === "string" && next.startsWith(`${prefix}/`) && !next.startsWith("//") ? next : null;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = formLocale(formData);
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid" };

  let userId: string;
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, passwordHash: true } });
    // Unknown emails still pay for a hash check, so timing doesn't reveal which accounts exist.
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await DUMMY_HASH));
    if (!user?.passwordHash || !ok) return { error: "invalid" };
    userId = user.id;
    await createSession(userId);
  } catch {
    return { error: "unavailable" };
  }

  redirect(safeReturn(formData.get("next"), localePath(locale, "")) ?? localePath(locale, "/admin/upload"));
}

export async function logoutAction(formData: FormData) {
  const locale = formLocale(formData);
  try {
    await deleteSession();
  } catch {
    // The cookie is cleared regardless; a stale row expires on its own.
  }
  redirect(localePath(locale, "/"));
}
