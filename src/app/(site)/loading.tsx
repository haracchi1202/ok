import { CardGridSkeleton, Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="container-page pt-10" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-10">
        <CardGridSkeleton count={4} />
      </div>
    </div>
  );
}
