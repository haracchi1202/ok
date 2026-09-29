"use client";
import { useRouter } from "next/navigation";

/** セラピストで絞り込むセレクト (口コミ・日記一覧用) */
export function TherapistSelectNav({ therapists, current, basePath }: { therapists: { slug: string; name: string }[]; current: string; basePath: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="セラピストで絞り込む"
      value={current}
      onChange={(e) => router.push(e.target.value ? `${basePath}?therapist=${e.target.value}` : basePath)}
      className="field h-9 w-auto rounded-full py-0 text-sm"
    >
      <option value="">すべてのセラピスト</option>
      {therapists.map((t) => (
        <option key={t.slug} value={t.slug}>{t.name}</option>
      ))}
    </select>
  );
}
