import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RESERVATION_STATUS, SCHEDULE_STATUS } from "@/lib/constants";
import { formatDateShort, formatDateTime, formatShift, todayBusinessDate, toJstTime } from "@/lib/time";
import { Empty, Flash, PageHeader, StatCard, StatusPill, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ダッシュボード" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-gold-deep underline">
            すべて見る
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

async function TherapistDashboard({ therapistId }: { therapistId: string | null }) {
  const today = todayBusinessDate();
  const [schedule, diaryCount] = therapistId
    ? await Promise.all([
        prisma.schedule.findUnique({ where: { therapistId_date: { therapistId, date: today } } }),
        prisma.diary.count({ where: { therapistId } }),
      ])
    : [null, 0];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label={`本日 ${formatDateShort(today)} の出勤`}
        value={schedule ? (schedule.status === "WORKING" ? formatShift(schedule.startAt, schedule.endAt, today) : SCHEDULE_STATUS[schedule.status as keyof typeof SCHEDULE_STATUS]) : "未登録"}
        href="/admin/schedules"
      />
      <StatCard label="写メ日記" value={`${diaryCount} 件`} href="/admin/diaries" />
      <StatCard label="プロフィール" value="編集する" href="/admin/profile" />
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const q = await searchParams;
  if (user.role === "THERAPIST") {
    return (
      <>
        <PageHeader title={`こんにちは、${user.name}さん`} description="出勤・予約枠、写メ日記、プロフィールを管理できます。" />
        <Flash params={q} />
        <TherapistDashboard therapistId={user.therapistId} />
      </>
    );
  }

  const today = todayBusinessDate();
  const since = new Date(Date.now() - 30 * 86400000);
  const [todays, working, byStatus, newInquiries, pendingReviews, popular, audits] = await Promise.all([
    prisma.reservation.findMany({
      where: { desiredDate: today, status: { not: "CANCELLED" } },
      include: { therapist: { select: { name: true } }, course: { select: { name: true, minutes: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.schedule.count({ where: { date: today, status: "WORKING", therapist: { status: "ACTIVE" } } }),
    prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.reservation.groupBy({
      by: ["therapistId"],
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" }, therapistId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { therapistId: "desc" } },
      take: 5,
    }),
    user.role === "ADMIN"
      ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } })
      : Promise.resolve([]),
  ]);
  const popularNames = await prisma.therapist.findMany({
    where: { id: { in: popular.map((p) => p.therapistId!).filter(Boolean) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(popularNames.map((t) => [t.id, t.name]));
  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

  return (
    <>
      <PageHeader title="ダッシュボード" description={`本日の営業日: ${formatDateShort(today)}`} />
      <Flash params={q} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="本日の予約" value={`${todays.length} 件`} href={`/admin/reservations?from=${today}&to=${today}`} />
        <StatCard label="本日の出勤セラピスト" value={`${working} 名`} href={`/admin/schedules?date=${today}`} />
        <StatCard label="未対応のお問い合わせ" value={`${newInquiries} 件`} href="/admin/inquiries?status=NEW" tone={newInquiries ? "warn" : undefined} />
        <StatCard label="承認待ちの口コミ" value={`${pendingReviews} 件`} href="/admin/reviews?status=PENDING" tone={pendingReviews ? "warn" : undefined} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(RESERVATION_STATUS).map(([k, v]) => (
          <StatCard key={k} label={`予約: ${v}`} value={statusCount[k] ?? 0} href={`/admin/reservations?status=${k}`} tone={k === "PENDING" && statusCount[k] ? "warn" : undefined} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="本日の予約" href={`/admin/reservations?from=${today}&to=${today}`}>
            {todays.length === 0 ? (
              <Empty title="本日の予約はありません" />
            ) : (
              <div className={tbl.wrap}>
                <table className="w-full text-sm">
                  <tbody>
                    {todays.map((r) => (
                      <tr key={r.id}>
                        <td className={`${tbl.td} whitespace-nowrap`}>{toJstTime(r.startAt)}</td>
                        <td className={tbl.td}>
                          <Link href={`/admin/reservations/${r.id}`} className="font-medium hover:underline">
                            {r.customerName} 様
                          </Link>
                          <p className="text-xs text-muted">{r.reservationNo}</p>
                        </td>
                        <td className={tbl.td}>{r.therapist?.name ?? "フリー"}</td>
                        <td className={`${tbl.td} text-xs`}>{r.course ? `${r.course.name}` : "—"}</td>
                        <td className={tbl.td}>
                          <StatusPill status={r.status} labels={RESERVATION_STATUS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
        <Section title="人気セラピスト (直近30日の予約数)">
          {popular.length === 0 ? (
            <p className="text-sm text-muted">データがありません</p>
          ) : (
            <ol className="space-y-2">
              {popular.map((p, i) => (
                <li key={p.therapistId} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-xs text-gold-deep">{i + 1}</span>
                    <Link href={`/admin/therapists/${p.therapistId}`} className="hover:underline">
                      {nameOf.get(p.therapistId!) ?? "—"}
                    </Link>
                  </span>
                  <span className="text-muted">{p._count._all} 件</span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      {user.role === "ADMIN" && (
        <div className="mt-4">
          <Section title="最近の操作ログ" href="/admin/audit">
            {audits.length === 0 ? (
              <p className="text-sm text-muted">ログはありません</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {audits.map((a) => (
                  <li key={a.id} className="flex flex-wrap gap-x-3 py-1.5">
                    <span className="text-xs text-muted">{formatDateTime(a.createdAt)}</span>
                    <span>{a.actor?.name ?? "—"}</span>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted">
                      {a.entity} {a.entityId && `#${a.entityId.slice(-6)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
