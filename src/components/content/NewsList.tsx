import Link from "next/link";
import { formatDateLong } from "@/lib/time";
import { Badge } from "@/components/ui/Badge";

type N = { slug: string; title: string; category: string; isImportant: boolean; publishedAt: Date };
const CAT: Record<string, string> = { NEWS: "お知らせ", IMPORTANT: "重要", TOPICS: "トピックス" };

export function NewsList({ items }: { items: N[] }) {
  return (
    <ul className="divide-y divide-line rounded-2xl bg-paper px-4 shadow-[var(--shadow-card)]">
      {items.map((n) => (
        <li key={n.slug}>
          <Link href={`/news/${n.slug}`} className="flex flex-col gap-1 py-3.5 hover:text-gold-deep sm:flex-row sm:items-center sm:gap-4">
            <span className="flex items-center gap-2 text-xs text-muted">
              <time dateTime={n.publishedAt.toISOString()}>{formatDateLong(n.publishedAt)}</time>
              <Badge tone={n.isImportant ? "danger" : "outline"}>{CAT[n.category] ?? n.category}</Badge>
            </span>
            <span className="text-sm">{n.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
