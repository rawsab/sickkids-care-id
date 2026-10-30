import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { locale, dict } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState title={dict.notFound.title} action={<ButtonLink href={localePath(locale, "/")}>{dict.notFound.home}</ButtonLink>}>
        {dict.notFound.body}
      </EmptyState>
    </div>
  );
}
