"use client";

import { Button, EmptyState } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";

// retry() re-fetches the segment, so a passing database outage recovers without a reload.
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { dict } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState title={dict.error.title} action={<Button onClick={() => retry()}>{dict.error.retry}</Button>}>
        {dict.error.body}
      </EmptyState>
    </div>
  );
}
