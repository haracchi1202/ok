import Link from "next/link";
import { cn } from "@/lib/cn";

/** 特徴タグ。href を渡すとそのタグで絞り込んだ一覧へ遷移する */
export function TagChip({ name, slug, linked = false, className }: { name: string; slug?: string; linked?: boolean; className?: string }) {
  const cls = cn("chip", linked && "hover:border-gold hover:text-gold-deep", className);
  if (linked && slug)
    return (
      <Link href={`/therapists?tags=${slug}`} className={cls}>
        #{name}
      </Link>
    );
  return <span className={cls}>#{name}</span>;
}
