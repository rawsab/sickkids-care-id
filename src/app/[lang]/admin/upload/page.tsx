import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { UploadForm } from "./upload-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.upload.metaTitle };
}

export default async function UploadPage() {
  const { locale, dict } = await getI18n();
  await requireUser(locale, "/admin/upload");
  return (
    <>
      <PageHeader
        eyebrow={dict.upload.eyebrow}
        title={dict.upload.title}
        lead={dict.upload.lead}
      />
      <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <UploadForm />
        </div>
      </section>
    </>
  );
}
