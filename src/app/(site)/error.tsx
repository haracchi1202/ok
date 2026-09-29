"use client";
import { ErrorState } from "@/components/ui/States";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-20">
      <ErrorState message={error.digest ? `エラーコード: ${error.digest}` : undefined} onRetry={reset} />
    </div>
  );
}
