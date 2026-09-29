import { yen } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

type Course = { id: string; name: string; minutes: number; price: number; description: string; isOvernight: boolean };

export function PriceTable({ courses }: { courses: Course[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <div key={c.id} className="card flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-base">{c.name}</h3>
            {c.isOvernight && <Badge tone="rank">お泊まり</Badge>}
          </div>
          <p className="mt-2 font-display text-3xl tracking-wide text-ink">
            {yen(c.price)}
            <span className="ml-1 font-sans text-xs text-muted">／{c.minutes >= 600 ? `${c.minutes / 60}時間` : `${c.minutes}分`}（税込）</span>
          </p>
          {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
        </div>
      ))}
    </div>
  );
}

export function FeeList({ rows }: { rows: { label: string; value: string; note?: string }[] }) {
  return (
    <dl className="divide-y divide-line rounded-2xl bg-paper px-5 shadow-[var(--shadow-card)]">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="text-sm">
            {r.label}
            {r.note && <span className="ml-2 text-xs text-muted">{r.note}</span>}
          </dt>
          <dd className="font-medium whitespace-nowrap">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
