"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { calculatePrice, campaignApplicable, isLateNightTime, RULE_KEYS, type PriceMaster } from "@/lib/pricing";
import { displayTimeOption } from "@/lib/time";
import { yen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { PriceBreakdown } from "./PriceBreakdown";
import Link from "next/link";

export type SimState = {
  therapist: string; // slug
  repeat: boolean;
  course: string;
  ext: number;
  area: string;
  time: string;
  lateNight: boolean;
  options: string[];
  campaign: string;
};

export function stateToQuery(s: SimState, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (s.therapist) p.set("therapist", s.therapist);
  if (s.repeat) p.set("repeat", "1");
  if (s.course) p.set("course", s.course);
  if (s.ext) p.set("ext", String(s.ext));
  if (s.area) p.set("area", s.area);
  if (s.time) p.set("time", s.time);
  if (s.lateNight) p.set("late", "1");
  if (s.options.length) p.set("options", s.options.join(","));
  if (s.campaign) p.set("campaign", s.campaign);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

/**
 * 料金シミュレーター。選択内容は URL に反映され (リロード・共有可能)、
 * 「この内容で予約」で同じ条件を予約フォームへ引き継ぐ。
 */
export function PriceSimulator({ master, initial, times }: { master: PriceMaster; initial: SimState; times: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [s, setS] = useState<SimState>(initial);
  const set = <K extends keyof SimState>(k: K, v: SimState[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const therapist = master.therapists.find((t) => t.slug === s.therapist);
  const course = master.courses.find((c) => c.id === s.course);
  const result = useMemo(
    () =>
      calculatePrice(
        {
          therapistId: therapist?.id ?? null,
          isRepeat: s.repeat,
          courseId: s.course,
          extensionCount: s.ext,
          areaId: s.area,
          lateNight: s.lateNight,
          optionIds: s.options,
          campaignId: s.campaign || null,
        },
        master,
      ),
    [s, therapist, master],
  );

  useEffect(() => {
    const q = stateToQuery(s);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [s, pathname, router]);

  const extUnit = master.rules[RULE_KEYS.extensionUnit] ?? 30;
  const extFee = master.rules[RULE_KEYS.extensionFee] ?? 0;
  const reserveHref = `/reserve?${stateToQuery(s)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <Step n={1} title="セラピスト">
          <select value={s.therapist} onChange={(e) => set("therapist", e.target.value)} className="field">
            <option value="">フリー（指名なし）</option>
            {master.therapists.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
                {t.nominationFee !== null ? `（指名料 ${yen(t.nominationFee)}）` : ""}
              </option>
            ))}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="ご利用回数">
            {[
              [false, "初めて指名する"],
              [true, "リピート（本指名）"],
            ].map(([v, label]) => (
              <button key={String(v)} type="button" role="radio" aria-checked={s.repeat === v} onClick={() => set("repeat", v as boolean)} className={cn("chip h-11 justify-center text-sm", s.repeat === v && "chip-active")}>
                {label as string}
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="コース">
          <div className="grid gap-2 sm:grid-cols-2">
            {master.courses.map((c) => (
              <label key={c.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 transition", s.course === c.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-gold")}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="course" value={c.id} checked={s.course === c.id} onChange={() => set("course", c.id)} className="accent-ink" />
                  <span className="text-sm">{c.name}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">{yen(c.price)}</span>
              </label>
            ))}
          </div>
          {course && !course.isOvernight && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-line">
              <span className="text-sm">
                延長 <span className="text-xs text-muted">（{extUnit}分 {yen(extFee)}）</span>
              </span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set("ext", Math.max(0, s.ext - 1))} disabled={s.ext === 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-40" aria-label="延長を減らす">
                  <Icon name="minus" className="h-4 w-4" />
                </button>
                <span className="w-16 text-center text-sm tabular-nums" aria-live="polite">{s.ext * extUnit}分</span>
                <button type="button" onClick={() => set("ext", Math.min(12, s.ext + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-lg leading-none" aria-label="延長を増やす">
                  ＋
                </button>
              </div>
            </div>
          )}
          {course?.isOvernight && therapist && (
            <p className="mt-2 text-xs text-warn">※ お泊まりコースは対応セラピストのみご利用いただけます。</p>
          )}
        </Step>

        <Step n={3} title="エリア・時間">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="field-label">ご利用エリア</span>
              <select value={s.area} onChange={(e) => set("area", e.target.value)} className="field">
                <option value="">選択してください</option>
                {master.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}（交通費 {a.transportFee ? yen(a.transportFee) : "無料"}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">開始時間（任意）</span>
              <select
                value={s.time}
                onChange={(e) => setS((p) => ({ ...p, time: e.target.value, lateNight: isLateNightTime(e.target.value, master.rules) }))}
                className="field"
              >
                <option value="">未定</option>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {displayTimeOption(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={s.lateNight} onChange={(e) => set("lateNight", e.target.checked)} className="h-5 w-5 accent-ink" />
            深夜の利用（{String(master.rules[RULE_KEYS.lateNightStart] ?? 24)}時〜翌{(master.rules[RULE_KEYS.lateNightEnd] ?? 29) - 24}時の開始）
          </label>
        </Step>

        {master.options.length > 0 && (
          <Step n={4} title="オプション">
            <div className="grid gap-2 sm:grid-cols-2">
              {master.options.map((o) => {
                const on = s.options.includes(o.id);
                return (
                  <label key={o.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3", on ? "border-ink ring-1 ring-ink" : "border-line hover:border-gold")}>
                    <span className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={on} onChange={() => set("options", on ? s.options.filter((x) => x !== o.id) : [...s.options, o.id])} className="h-4 w-4 accent-ink" />
                      {o.name}
                    </span>
                    <span className="text-sm tabular-nums">+{yen(o.price)}</span>
                  </label>
                );
              })}
            </div>
          </Step>
        )}

        {master.campaigns.length > 0 && (
          <Step n={5} title="キャンペーン">
            <div className="grid gap-2">
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm", !s.campaign ? "border-ink ring-1 ring-ink" : "border-line")}>
                <input type="radio" name="campaign" checked={!s.campaign} onChange={() => set("campaign", "")} className="accent-ink" />
                利用しない
              </label>
              {master.campaigns.map((c) => {
                const reason = campaignApplicable(c, { isRepeat: s.repeat }, course);
                return (
                  <label key={c.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm", s.campaign === c.id ? "border-ink ring-1 ring-ink" : "border-line", reason && "opacity-60")}>
                    <input type="radio" name="campaign" checked={s.campaign === c.id} onChange={() => set("campaign", c.id)} className="mt-1 accent-ink" />
                    <span className="flex-1">
                      {c.name}
                      <span className="ml-2 text-rose">{c.discountType === "PERCENT" ? `${c.value}%OFF` : `−${yen(c.value)}`}</span>
                      {reason && <span className="block text-xs text-muted">{reason}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </Step>
        )}
      </div>

      {/* 結果 (PC: 追従 / スマホ: 下部) */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl bg-night p-6 text-ivory shadow-xl">
          <p className="font-display text-[11px] tracking-[0.35em] text-gold-soft">ESTIMATE</p>
          <h2 className="mt-1 text-lg">お見積り</h2>
          <div className="mt-4">
            <PriceBreakdown result={result} dark />
          </div>
          <Link href={reserveHref} className={cn("mt-6 flex h-14 items-center justify-center gap-2 rounded-full bg-gold text-white transition hover:bg-gold-deep", !result.isComplete && "opacity-90")}>
            <Icon name="calendar" /> この内容で予約
          </Link>
          <p className="mt-3 text-center text-[11px] text-ivory/50">選択内容は予約フォームに自動で反映されます</p>
        </div>
      </aside>

      {/* スマホ用 合計表示バー */}
      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted">お見積り合計</p>
            <p className="font-display text-2xl leading-none tabular-nums">{yen(result.total)}</p>
          </div>
          <Link href={reserveHref} className="flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm text-white">
            <Icon name="calendar" className="h-4 w-4" /> この内容で予約
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-3 text-base">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-display text-xs text-ivory">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
