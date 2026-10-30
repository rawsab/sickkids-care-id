import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload results" };

export default function UploadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Upload test results"
        lead="Check a results file before saving it. Only de-identified weekly totals are stored; the file itself is not kept."
      />
      <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <UploadForm />
        </div>
      </section>
    </>
  );
}
