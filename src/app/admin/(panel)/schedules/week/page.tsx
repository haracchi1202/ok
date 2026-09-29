import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, formatDateShort, isValidDateString, todayBusinessDate, toJstTime } from "@/lib/time";
import { sp } from "@/lib/admin/form";
import { saveWeek } from "@/lib/admin/schedule-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { WeekForm, type WeekRow } from "@/components/admin/WeekForm";
import { b, Empty, inputSm, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "週間一括入力" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const q = await searchParams;
  const start = isValidDateString(sp(q.start)) ? sp(q.start) : todayBusinessDate();
  const isTherapist = user.role === "THERAPIST";
  const therapistId = isTherapist ? user.therapistId : sp(q.therapistId);
  if (isTherapist && sp(q.therapistId) && sp(q.therapistId) !== user.therapistId) redirect("/admin?denied=1");

  const options = isTherapist ? [] : await therapistOptions();
  const therapist = therapistId ? await prisma.therapist.findUnique({ where: { id: therapistId }, select: { id: true, name: true } }) : null;

  let rows: WeekRow[] = [];
  let prev: WeekRow[] = [];
  if (therapist) {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const prevDates = dates.map((d) => addDays(d, -7));
    const list = await prisma.schedule.findMany({ where: { therapistId: therapist.id, date: { in: [...dates, ...prevDates] } } });
    const byDate = new Map(list.map((s) => [s.date, s]));
    const toRow = (d: string): WeekRow => {
      const s = byDate.get(d);
      return { date: d, label: formatDateShort(d), status: s?.status ?? "", start: s ? toJstTime(s.startAt) : "", end: s ? toJstTime(s.endAt) : "", note: s?.note ?? "" };
    };
    rows = dates.map(toRow);
    prev = prevDates.map(toRow);
  }
  const href = (d: string) => `/admin/schedules/week?therapistId=${therapist?.id ?? ""}&start=${d}`;

  return (
    <>
      <PageHeader title="週間一括入力" back={{ href: `/admin/schedules?date=${start}`, label: "出勤・予約枠" }} description={therapist ? `${therapist.name} / ${formatDateShort(start)} から 7 日間` : undefined} />
      <form action="/admin/schedules/week" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3">
        {!isTherapist && (
          <select name="therapistId" defaultValue={therapist?.id ?? ""} className={inputSm} aria-label="セラピスト">
            <option value="">セラピストを選択</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <input type="date" name="start" defaultValue={start} className={inputSm} aria-label="開始日" />
        <button className={b("secondary")}>表示</button>
        {therapist && (
          <span className="ml-auto flex gap-2">
            <Link href={href(addDays(start, -7))} className={b("secondary")}>
              ← 前週
            </Link>
            <Link href={href(addDays(start, 7))} className={b("secondary")}>
              翌週 →
            </Link>
          </span>
        )}
      </form>
      {therapist ? (
        <WeekForm key={`${therapist.id}-${start}`} rows={rows} prev={prev} action={saveWeek.bind(null, therapist.id)} />
      ) : (
        <Empty title="セラピストを選択してください" />
      )}
    </>
  );
}
