"use client";

import { useActionState } from "react";
import { Button, inputClass } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { locale, dict } = useI18n();
  const l = dict.login;
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-text">
          {l.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-text">
          {l.password}
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-surface px-4 py-3 text-sm text-danger ring-1 ring-danger-border">
          {l.errors[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? l.submitting : l.submit}
      </Button>
    </form>
  );
}
