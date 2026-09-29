"use client";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { SlotStatusBadge } from "./AvailabilityBadge";

export type ScheduleDay = {
  date: string;
  label: string;
  weekend: "sat" | "sun" | null;
  schedule: {
    status: string;
    label: string;
    note: string;
    slots: { id: string; time24: string; label: string; status: string }[];
  } | null;
};

function summary(day: ScheduleDay) {
  const s = day.schedule;
  if (!s || s.status === "OFF") return { text: "お休み", tone: "text-ng" };
  if (s.status === "TBD") return { text: "調整中", tone: "text-warn" };
  const open = s.slots.filter((x) => x.status === "AVAILABLE").length;
  if (!s.slots.length) return { text: "要問い合わせ", tone: "text-warn" };
  if (open === 0) return { text: s.slots.some((x) => x.status === "INQUIRY") ? "要問い合わせ" : "満枠", tone: "text-ng" };
  return { text: `空き${open}枠`, tone: "text-ok" };
}

/**
 * 複数日の出勤表。日付をタップすると時間帯別の予約状況を展開する。
 * 予約可能な枠からはそのまま予約フォームへ (日時・セラピストを自動入力) 遷移できる。
 */
export function ScheduleTable({ days, slug, inquiryHref }: { days: ScheduleDay[]; slug: string; inquiryHref: string }) {
  const firstOpen = days.findIndex((d) => d.schedule?.slots.some((s) => s.status === "AVAILABLE"));
  const [open, setOpen] = useState<number | null>(firstOpen >= 0 ? firstOpen : null);
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-card)]">
      <div className="hidden grid-cols-[7rem_1fr_7rem_1fr_2rem] gap-3 border-b border-line bg-ivory px-4 py-2 text-xs text-muted sm:grid">
        <span>日付</span>
        <span>出勤時間</span>
        <span>予約状況</span>
        <span>備考</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {days.map((d, i) => {
          const sum = summary(d);
          const expandable = !!d.schedule?.slots.length && d.schedule.status === "WORKING";
          const isOpen = open === i && expandable;
          return (
            <li key={d.date}>
              <button
                type="button"
                disabled={!expandable}
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[5.5rem_1fr_auto_1.25rem] items-center gap-3 px-4 py-3.5 text-left enabled:hover:bg-ivory/60 sm:grid-cols-[7rem_1fr_7rem_1fr_2rem]"
              >
                <span className={cn("text-sm font-medium", d.weekend === "sat" && "text-[#3a6ea5]", d.weekend === "sun" && "text-rose")}>
                  {d.label}
                  {i === 0 && <span className="ml-1 text-[10px] text-gold-deep">本日</span>}
                </span>
                <span className="text-sm">{d.schedule && d.schedule.status === "WORKING" ? d.schedule.label : <span className="text-ng">−</span>}</span>
                <span className={cn("text-xs font-medium", sum.tone)}>{sum.text}</span>
                <span className="hidden truncate text-xs text-muted sm:block">{d.schedule?.note}</span>
                {expandable ? <Icon name="chevronDown" className={cn("h-4 w-4 text-muted transition", isOpen && "rotate-180")} /> : <span />}
              </button>
              {isOpen && d.schedule && (
                <div className="bg-ivory/60 px-4 pt-1 pb-4">
                  {d.schedule.note && <p className="mb-2 text-xs text-muted sm:hidden">※ {d.schedule.note}</p>}
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {d.schedule.slots.map((s) => (
                      <li key={s.id}>
                        {s.status === "AVAILABLE" ? (
                          <Link href={`/reserve?therapist=${slug}&date=${d.date}&time=${encodeURIComponent(s.time24)}`} className="flex items-center justify-between gap-2 rounded-xl border border-ok/30 bg-white px-3 py-2.5 transition hover:border-ok hover:bg-ok-soft">
                            <span className="text-sm font-medium">{s.label}〜</span>
                            <SlotStatusBadge status={s.status} />
                          </Link>
                        ) : s.status === "INQUIRY" ? (
                          <a href={inquiryHref} className="flex items-center justify-between gap-2 rounded-xl border border-warn/30 bg-white px-3 py-2.5 hover:bg-warn-soft">
                            <span className="text-sm">{s.label}〜</span>
                            <SlotStatusBadge status={s.status} />
                          </a>
                        ) : (
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white/50 px-3 py-2.5 text-ng">
                            <span className="text-sm">{s.label}〜</span>
                            <SlotStatusBadge status={s.status} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-muted">◎ をタップすると日時が入力された状態で予約フォームへ進みます。</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
