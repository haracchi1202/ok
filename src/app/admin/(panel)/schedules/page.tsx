import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, formatDateShort, formatShift, formatShiftTime, isValidDateString, todayBusinessDate, toJstTime } from "@/lib/time";
import { sp } from "@/lib/admin/form";
import { saveShift, setSlotStatus } from "@/lib/admin/schedule-actions";
import { slotMinutes } from "@/lib/admin/slots";
import { ScheduleRow } from "@/components/admin/ScheduleRow";
import { b, Empty, inputSm, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "出勤・予約枠" };

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const q = await searchParams;
  const today = todayBusinessDate();
  const date = isValidDateString(sp(q.date)) ? sp(q.date) : today;
  const isTherapist = user.role === "THERAPIST";

  const therapists = await prisma.therapist.findMany({
    where: isTherapist ? { id: user.therapistId ?? "__none__" } : { status: "ACTIVE" },
    orderBy: [{ recommendOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { thumbPath: true } },
      schedules: { where: { date }, include: { slots: { orderBy: { startAt: "asc" } } } },
    },
  });
  const step = await slotMinutes();
  const working = therapists.filter((t) => t.schedules[0]?.status === "WORKING").length;
  const link = (d: string) => `/admin/schedules?date=${d}`;

  return (
    <>
      <PageHeader
        title="出勤・予約枠"
        description={`営業日ごとの出勤を登録すると、${step}分単位の予約枠が自動生成されます。終了時刻が開始より前の場合は翌日として扱います。`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
        <Link href={link(addDays(date, -1))} className={b("secondary", "px-3")} aria-label="前日">
          <Icon name="chevronLeft" className="h-4 w-4" />
        </Link>
        <p className="min-w-28 text-center text-lg font-semibold">{formatDateShort(date)}</p>
        <Link href={link(addDays(date, 1))} className={b("secondary", "px-3")} aria-label="翌日">
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
        <Link href={link(today)} className={b("secondary")}>
          今日
        </Link>
        <form action="/admin/schedules" className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={date} className={inputSm} aria-label="日付を選択" />
          <button className={b("secondary")}>表示</button>
        </form>
        <p className="ml-auto text-sm text-muted">
          出勤 <span className="font-semibold text-ink">{working}</span> 名 / {therapists.length} 名
        </p>
      </div>

      {therapists.length === 0 ? (
        <Empty title="対象のセラピストがいません" description={isTherapist ? "アカウントにセラピストが紐づいていません。" : "公開中のセラピストを登録してください。"} />
      ) : (
        <ul className="space-y-3">
          {therapists.map((t) => {
            const s = t.schedules[0];
            return (
              <ScheduleRow
                key={`${t.id}-${date}`}
                name={t.name}
                thumb={t.images[0]?.thumbPath ?? null}
                initial={s ? { start: toJstTime(s.startAt), end: toJstTime(s.endAt), status: s.status, note: s.note } : null}
                shiftLabel={s ? (s.status === "WORKING" ? formatShift(s.startAt, s.endAt, date) : s.status === "OFF" ? "休み" : "調整中") : null}
                slots={s?.slots.map((x) => ({ id: x.id, label: `${formatShiftTime(x.startAt, date)}〜`, status: x.status })) ?? []}
                save={saveShift.bind(null, t.id, date)}
                setSlot={setSlotStatus}
                weekHref={`/admin/schedules/week?therapistId=${t.id}&start=${date}`}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}
