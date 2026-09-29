import { CardGridSkeleton, Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="container-page pt-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-12 w-full rounded-full" />
      <div className="mt-8">
        <CardGridSkeleton />
      </div>
    </div>
  );
}
