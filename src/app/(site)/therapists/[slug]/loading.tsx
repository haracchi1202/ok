import { Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="container-page grid gap-8 pt-8 lg:grid-cols-[5fr_6fr]">
      <Skeleton className="aspect-[3/4] w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
