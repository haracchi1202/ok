import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { filterTherapists, getActiveTags, getTherapistCards, parseSearchParams, sortTherapists } from "@/lib/therapists";
import { addDays, formatDateShort, isValidDateString, isWeekend, todayBusinessDate } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TherapistGrid } from "@/components/therapist/TherapistGrid";
import { SearchFilter } from "@/components/therapist/SearchFilter";
import { ReserveBand } from "@/components/site/ReserveBand";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { DatePicker } from "@/components/site/DatePicker";

export const metadata: Metadata = {
  title: "出勤スケジュール",
  description: "全セラピストの出勤スケジュールを日付ごとに確認できます。",
  alternates: { canonical: "/schedule" },
};
export const dynamic = "force-dynamic";

type Raw = Record<string, string | string[] | undefined>;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const today = todayBusinessDate();
  const reqDate = typeof raw.date === "string" && isValidDateString(raw.date) ? raw.date : today;
  const date = reqDate < today ? today : reqDate > addDays(today, 30) ? addDays(today, 30) : reqDate;
  const isToday = date === today;
  const params = parseSearchParams(raw);
  const [cards, tags] = await Promise.all([getTherapistCards(date), getActiveTags()]);
  // その日の出勤者のみ対象 ("本日出勤" は常に ON 扱い)
  const working = cards.filter((c) => c.shift);
  const items = sortTherapists(filterTherapists(working, { ...params, today: false, now: isToday ? params.now : false }), raw.sort ? params.sort : "shift");
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const qs = (d: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && k !== "date" && k !== "page") sp.set(k, v);
    if (d !== today) sp.set("date", d);
    const s = sp.toString();
    return s ? `/schedule?${s}` : "/schedule";
  };
  const dayLabel = (d: string, i: number) => (i === 0 ? "今日" : i === 1 ? "明日" : i === 2 ? "明後日" : formatDateShort(d));

  return (
    <>
      <Breadcrumbs items={[{ name: "スケジュール" }]} />
      <PageHero en="SCHEDULE" title="出勤スケジュール" lead="日付を切り替えて、全セラピストの出勤と空き状況を確認できます。" />
      <div className="container-page mt-4">
        <nav aria-label="日付の切り替え" className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          {days.map((d, i) => {
            const we = isWeekend(d);
            return (
              <Link
                key={d}
                href={qs(d)}
                scroll={false}
                aria-current={d === date ? "date" : undefined}
                className={cn(
                  "flex h-16 min-w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border text-sm transition",
                  d === date ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-gold",
                )}
              >
                <span className="text-[11px] opacity-70">{i < 3 ? formatDateShort(d) : ""}</span>
                <span className={cn(d !== date && we === "sat" && "text-[#3a6ea5]", d !== date && we === "sun" && "text-rose")}>{dayLabel(d, i)}</span>
              </Link>
            );
          })}
          <DatePicker value={date} min={today} max={addDays(today, 30)} />
        </nav>

        <h2 className="mt-6 font-serif text-lg">
          {formatDateLongWithDay(date)} の出勤
          <span className="ml-2 font-sans text-sm text-muted">{working.length}名</span>
        </h2>
        <div className="mt-4">
          <Suspense>
            <SearchFilter tags={tags.map((t) => ({ name: t.name, slug: t.slug, group: t.group }))} total={items.length} hideKeys={isToday ? ["today"] : ["today", "now"]} />
          </Suspense>
        </div>
        <div className="mt-6">
          {working.length === 0 ? (
            <EmptyState icon="calendar" title="この日の出勤情報はまだありません" description="出勤は随時更新されます。別の日付もご確認ください。" />
          ) : (
            <TherapistGrid items={items} dateLabel={isToday ? "本日" : formatDateShort(date)} />
          )}
        </div>
      </div>
      <ReserveBand />
    </>
  );
}

function formatDateLongWithDay(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日（${formatDateShort(d).match(/\((.)\)/)?.[1]}）`;
}
