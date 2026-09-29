import type { PriceResult } from "@/lib/pricing";
import { yen } from "@/lib/format";
import { cn } from "@/lib/cn";

/** 料金明細 + 合計 */
export function PriceBreakdown({ result, dark }: { result: PriceResult; dark?: boolean }) {
  return (
    <div>
      <dl className={cn("divide-y text-sm", dark ? "divide-white/10" : "divide-line")}>
        {result.lines.map((l) => (
          <div key={l.key} className="flex items-baseline justify-between gap-3 py-2">
            <dt>
              {l.label}
              {l.detail && <span className={cn("ml-2 text-xs", dark ? "text-ivory/60" : "text-muted")}>{l.detail}</span>}
            </dt>
            <dd className={cn("whitespace-nowrap tabular-nums", l.amount < 0 && "text-rose")}>{l.amount < 0 ? `−${yen(-l.amount)}` : yen(l.amount)}</dd>
          </div>
        ))}
      </dl>
      <div className={cn("mt-3 flex items-end justify-between border-t pt-3", dark ? "border-white/20" : "border-ink/20")}>
        <span className="text-sm">
          合計
          {result.totalMinutes > 0 && <span className={cn("ml-2 text-xs", dark ? "text-ivory/60" : "text-muted")}>{result.totalMinutes >= 600 ? "お泊まり" : `${result.totalMinutes}分`}</span>}
        </span>
        <span className="font-display text-4xl tracking-wide tabular-nums" aria-live="polite">
          {yen(result.total)}
        </span>
      </div>
      {result.warnings.length > 0 && (
        <ul className={cn("mt-3 space-y-1 text-xs", dark ? "text-gold-soft" : "text-warn")}>
          {result.warnings.map((w) => (
            <li key={w}>※ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
