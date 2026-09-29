import { Icon } from "@/components/ui/Icon";

export function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl bg-paper shadow-[var(--shadow-card)]">
      {items.map((f) => (
        <details key={f.id} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start gap-3 py-4 text-[15px]">
            <span className="font-display text-gold">Q</span>
            <span className="flex-1">{f.question}</span>
            <Icon name="chevronDown" className="mt-1 h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <div className="flex gap-3 pb-5 text-sm text-ink-soft">
            <span className="font-display text-rose">A</span>
            <p className="flex-1 whitespace-pre-line">{f.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
