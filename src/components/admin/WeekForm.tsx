"use client";

import { useState } from "react";
import type { FormState } from "@/lib/admin/form";
import { SCHEDULE_STATUS } from "@/lib/constants";
import { FormMessage, SubmitButton, useAdminForm } from "./client";
import { b } from "./ui";

export type WeekRow = { date: string; label: string; status: string; start: string; end: string; note: string };

const cell = "h-10 w-full rounded-lg border border-line bg-white px-2 text-sm";

export function WeekForm({ rows, prev, action }: { rows: WeekRow[]; prev: WeekRow[]; action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const [data, setData] = useState(rows);
  const set = (i: number, patch: Partial<WeekRow>) => setData((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const copyPrev = () => setData((d) => d.map((r, i) => ({ ...r, status: prev[i].status, start: prev[i].start, end: prev[i].end, note: prev[i].note })));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyPrev} className={b("secondary")}>
          前週をコピー
        </button>
        <button type="button" onClick={() => setData((d) => d.map((r) => ({ ...r, start: d[0].start, end: d[0].end, status: d[0].status })))} className={b("secondary")}>
          1 日目の内容を全日に適用
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-ivory text-left text-xs text-muted">
              <th className="px-3 py-2">日付</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2">開始</th>
              <th className="px-3 py-2">終了</th>
              <th className="px-3 py-2">メモ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.date} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  <input type="hidden" name={`date_${i}`} value={r.date} />
                  {r.label}
                  {state.errors?.[`row_${i}`] && <p className="mt-1 text-xs font-normal text-danger">{state.errors[`row_${i}`]}</p>}
                </td>
                <td className="px-3 py-2">
                  <select name={`status_${i}`} value={r.status} onChange={(e) => set(i, { status: e.target.value })} className={cell} aria-label={`${r.label} 状態`}>
                    <option value="">未登録</option>
                    {Object.entries(SCHEDULE_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="time" name={`start_${i}`} value={r.start} onChange={(e) => set(i, { start: e.target.value })} className={cell} aria-label={`${r.label} 開始`} disabled={!r.status} />
                </td>
                <td className="px-3 py-2">
                  <input type="time" name={`end_${i}`} value={r.end} onChange={(e) => set(i, { end: e.target.value })} className={cell} aria-label={`${r.label} 終了`} disabled={!r.status} />
                </td>
                <td className="px-3 py-2">
                  <input name={`note_${i}`} value={r.note} onChange={(e) => set(i, { note: e.target.value })} maxLength={200} className={cell} aria-label={`${r.label} メモ`} disabled={!r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">「未登録」にした日は出勤が削除されます (予約済みの枠がある日は削除されません)。終了が開始以前の時刻なら翌日扱いです。</p>
      <SubmitButton pending={pending}>1 週間分を保存</SubmitButton>
    </form>
  );
}
