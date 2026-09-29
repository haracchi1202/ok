"use client";

import { b } from "@/components/admin/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message === "FORBIDDEN" || error.message === "UNAUTHORIZED";
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-white p-10 text-center">
      <p className="text-lg font-semibold text-danger">{forbidden ? "この操作を行う権限がありません" : "エラーが発生しました"}</p>
      <p className="mt-1 text-sm text-muted">{forbidden ? "ログイン状態や権限をご確認ください。" : "時間をおいて再度お試しください。"}</p>
      <button type="button" onClick={reset} className={b("secondary", "mt-5")}>
        再読み込み
      </button>
    </div>
  );
}
