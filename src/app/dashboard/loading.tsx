import { Card, Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-80 w-full" />
      </Card>
    </div>
  );
}
