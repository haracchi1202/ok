"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/admin/form";
import { SCHEDULE_STATUS, SLOT_STATUS } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { AutoSubmitSelect, FormMessage, useAdminForm } from "./client";
import { b, Pill, STATUS_TONES } from "./ui";

export type SlotView = { id: string; label: string; status: string };

type Props = {
  name: string;
  thumb: string | null;
  initial: { start: string; end: string; status: string; note: string } | null;
  shiftLabel: string | null;
  slots: SlotView[];
  save: (s: FormState, fd: FormData) => Promise<FormState>;
  setSlot: (slotId: string, fd: FormData) => Promise<void>;
  weekHref: string;
};

/** 終了時刻が開始時刻以前 / 早朝なら「翌」と表示 */
function nextDay(start: string, end: string) {
  if (!start || !end) return false;
  const h = Number(end.slice(0, 2));
  return end <= start || h < 6;
}

export function ScheduleRow({ name, thumb, initial, shiftLabel, slots, save, setSlot, weekHref }: Props) {
  const { state, onSubmit, pending } = useAdminForm(save);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const counts = slots.reduce<Record<string, number>>((a, s) => ((a[s.status] = (a[s.status] ?? 0) + 1), a), {});

  return (
    <li className="rounded-xl border border-line bg-white">
      <form onSubmit={onSubmit} className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[180px_1fr_auto] lg:items-end">
        <div className="flex items-center gap-3">
          {thumb ? <img src={thumb} alt="" className="h-12 w-9 rounded object-cover" /> : <div className="h-12 w-9 rounded bg-ng-soft" />}
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="text-xs text-muted">{shiftLabel ?? "未登録"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[110px_130px_130px_1fr]">
          <label className="text-xs text-muted">
            状態
            <select name="status" defaultValue={initial?.status ?? "WORKING"} className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink">
              {Object.entries(SCHEDULE_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            開始
            <input type="time" name="start" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">
            終了 {nextDay(start, end) && <span className="text-gold-deep">(翌日)</span>}
            <input type="time" name="end" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink" />
          </label>
          <label className="col-span-2 text-xs text-muted sm:col-span-1">
            メモ
            <input name="note" defaultValue={initial?.note ?? ""} maxLength={200} className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="save" disabled={pending} className={b("primary")}>
            {pending ? "保存中…" : "保存"}
          </button>
          {initial && (
            <button
              type="submit"
              name="intent"
              value="delete"
              disabled={pending}
              className={b("secondary")}
              onClick={(e) => {
                if (!window.confirm("この日の出勤を削除しますか？")) e.preventDefault();
              }}
            >
              削除
            </button>
          )}
          <a href={weekHref} className={b("secondary")} title="週間一括入力">
            週間
          </a>
        </div>
        {(state.message || state.error || state.warnings?.length) && (
          <div className="lg:col-span-3">
            <FormMessage state={state} />
          </div>
        )}
      </form>

      {slots.length > 0 && (
        <div className="border-t border-line px-3 py-2 sm:px-4">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 text-left text-xs text-muted">
            <Icon name="chevronDown" className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            予約枠 {slots.length} 件
            {Object.entries(counts).map(([k, n]) => (
              <Pill key={k} tone={STATUS_TONES[k]}>
                {SLOT_STATUS[k as keyof typeof SLOT_STATUS] ?? k} {n}
              </Pill>
            ))}
          </button>
          {open && (
            <ul className="mt-3 grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4 lg:grid-cols-6">
              {slots.map((s) => (
                <li key={s.id} className={cn("rounded-lg border p-2", s.status === "AVAILABLE" ? "border-ok/30 bg-ok-soft/40" : s.status === "BOOKED" ? "border-rose/30 bg-rose-soft/40" : "border-line bg-ivory")}>
                  <p className="mb-1 text-sm font-medium">{s.label}</p>
                  <AutoSubmitSelect action={setSlot.bind(null, s.id)} name="status" value={s.status} options={SLOT_STATUS} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
