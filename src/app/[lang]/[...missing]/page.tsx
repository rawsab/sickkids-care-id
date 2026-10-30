import { notFound } from "next/navigation";

// Unmatched paths under a language render [lang]/not-found.tsx inside the
// localized layout, rather than Next's bare English default.
export default function Missing() {
  notFound();
}
