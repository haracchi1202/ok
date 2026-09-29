import Link from "next/link";
import { b } from "@/components/admin/ui";

export default function AdminNotFound() {
  return (
    <div className="rounded-xl border border-line bg-white p-10 text-center">
      <p className="text-lg font-semibold">ページが見つかりません</p>
      <p className="mt-1 text-sm text-muted">URL が間違っているか、データが削除された可能性があります。</p>
      <Link href="/admin" className={b("secondary", "mt-5")}>
        ダッシュボードへ
      </Link>
    </div>
  );
}
