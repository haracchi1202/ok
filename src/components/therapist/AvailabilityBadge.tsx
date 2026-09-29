import { Badge } from "@/components/ui/Badge";
import type { TherapistCardData } from "@/lib/therapists";

/** 現在の予約可否を1つのバッジで表す */
export function AvailabilityBadge({ t, className }: { t: Pick<TherapistCardData, "shift" | "canBookNow" | "nextAvailableLabel" | "availableSlotCount">; className?: string }) {
  if (!t.shift) return <Badge tone="muted" className={className}>本日お休み</Badge>;
  if (t.canBookNow) return <Badge tone="now" className={className}>● {t.nextAvailableLabel}〜 予約可</Badge>;
  if (t.nextAvailableLabel) return <Badge tone="ok" className={className}>{t.nextAvailableLabel}〜 空きあり</Badge>;
  return <Badge tone="muted" className={className}>本日受付終了</Badge>;
}

export function SlotStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "AVAILABLE":
      return <Badge tone="now">◎ 予約可能</Badge>;
    case "BOOKED":
      return <Badge tone="muted">✕ 予約済</Badge>;
    case "INQUIRY":
      return <Badge tone="warn">△ 要問い合わせ</Badge>;
    default:
      return <Badge tone="muted">− 受付終了</Badge>;
  }
}
