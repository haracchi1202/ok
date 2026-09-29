"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 空き状況ページを定期的に再取得する (タブが非表示のときは更新しない) */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
