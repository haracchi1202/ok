"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormState } from "@/lib/admin/form";
import { RANKING_PERIODS, RANKING_TYPES } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";
import { b } from "./ui";

type Entry = { key: string; therapistId: string; rank: string; score: string; previousRank: number | null };
type Values = { type: string; period: string; periodStart: string; title: string; isPublished: boolean };

let seq = 0;
const newKey = () => `e${++seq}`;

export function RankingForm({
  values,
  entries: initial,
  therapists,
  action,
}: {
  values: Values;
  entries: { therapistId: string; rank: number; score: number; previousRank: number | null }[];
  therapists: { id: string; name: string }[];
  action: (s: FormState, fd: FormData) => Promise<FormState>;
}) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const e = state.errors ?? {};
  const [rows, setRows] = useState<Entry[]>(() => initial.map((x) => ({ key: newKey(), therapistId: x.therapistId, rank: String(x.rank), score: String(x.score), previousRank: x.previousRank })));
  const update = (i: number, patch: Partial<Entry>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const cell = "h-10 w-full rounded-lg border border-line bg-white px-2 text-sm";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 sm:p-6">
        <Field label="種別" name="type" error={e.type} required>
          <select id="type" name="type" defaultValue={values.type} className="field">
            {Object.entries(RANKING_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="期間" name="period" error={e.period} required>
          <select id="period" name="period" defaultValue={values.period} className="field">
            {Object.entries(RANKING_PERIODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="集計開始日" name="periodStart" error={e.periodStart} required hint="デイリー: 当日 / 週間: 開始日から7日間 / 月間: 開始日から1か月">
          <input id="periodStart" name="periodStart" type="date" defaultValue={values.periodStart} className="field" />
        </Field>
        <Field label="タイトル (任意)" name="title" error={e.title}>
          <input id="title" name="title" defaultValue={values.title} maxLength={100} className="field" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={values.isPublished} className="h-4 w-4 accent-ink" />
          公開する
        </label>
      </div>

      <div className="rounded-xl border border-line bg-white p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">順位 ({rows.length} 名)</h2>
          <button
            type="button"
            className={b("sm")}
            onClick={() => setRows((r) => [...r, { key: newKey(), therapistId: "", rank: String(r.length + 1), score: "0", previousRank: null }])}
          >
            ＋ 行を追加
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">エントリーがありません。行を追加するか、保存後に「自動集計」を実行してください。</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key}>
                <div className="grid grid-cols-[4rem_1fr_5rem_auto] items-center gap-2 sm:grid-cols-[5rem_1fr_7rem_6rem_auto]">
                  <input name="entry_rank" type="number" min={1} value={r.rank} onChange={(ev) => update(i, { rank: ev.target.value })} className={cell} aria-label="順位" />
                  <select name="entry_therapistId" value={r.therapistId} onChange={(ev) => update(i, { therapistId: ev.target.value })} className={cell} aria-label="セラピスト">
                    <option value="">選択してください</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <input name="entry_score" type="number" min={0} value={r.score} onChange={(ev) => update(i, { score: ev.target.value })} className={cell} aria-label="スコア" />
                  <span className="hidden text-xs text-muted sm:block">前回: {r.previousRank ?? "NEW"}</span>
                  <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className={b("smDanger")} aria-label="この行を削除">
                    削除
                  </button>
                </div>
                {e[`entry_${i}`] && <p className="mt-1 text-xs text-danger">{e[`entry_${i}`]}</p>}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">前回順位は保存時に、同じ種別・期間の直前のランキングから自動で設定されます。</p>
      </div>

      <div className="flex gap-2">
        <SubmitButton pending={pending} />
        <Link href="/admin/rankings" className={b("secondary")}>
          一覧へ戻る
        </Link>
      </div>
    </form>
  );
}
