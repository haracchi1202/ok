import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { RESERVATION_STATUS } from "@/lib/constants";
import { yen } from "@/lib/format";
import { formatDateShort, formatDateTime } from "@/lib/time";
import { PAGE_SIZE, pageParam } from "@/lib/admin/form";
import { reservationFilter, reservationWhere } from "@/lib/admin/reservations";
import { therapistOptions } from "@/lib/admin/queries";
import { b, Empty, FilterBar, FilterField, inputSm, PageHeader, Pager, StatusPill, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "予約管理" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const q = await searchParams;
  const f = reservationFilter(q);
  const page = pageParam(q.page);
  const where = reservationWhere(f);
  const [rows, total, therapists] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: [{ startAt: "desc" }],
      include: { therapist: { select: { name: true } }, course: { select: { name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.reservation.count({ where }),
    therapistOptions(),
  ]);
  const params = { ...f };
  const csv = `/admin/reservations/export?${new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <PageHeader
        title="予約管理"
        actions={
          <a href={csv} className={b("secondary")}>
            CSV エクスポート
          </a>
        }
      />
      <FilterBar action="/admin/reservations">
        <FilterField label="ステータス">
          <select name="status" defaultValue={f.status} className={inputSm}>
            <option value="">すべて</option>
            {Object.entries(RESERVATION_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="希望日 (から)">
          <input type="date" name="from" defaultValue={f.from} className={inputSm} />
        </FilterField>
        <FilterField label="希望日 (まで)">
          <input type="date" name="to" defaultValue={f.to} className={inputSm} />
        </FilterField>
        <FilterField label="セラピスト">
          <select name="therapistId" defaultValue={f.therapistId} className={inputSm}>
            <option value="">すべて</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="予約番号・名前・電話">
          <input name="q" defaultValue={f.q} className={inputSm} />
        </FilterField>
      </FilterBar>

      {rows.length === 0 ? (
        <Empty title="予約がありません" description="条件を変更してお試しください。" />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>予約番号</th>
                <th className={tbl.th}>希望日時</th>
                <th className={tbl.th}>お客様</th>
                <th className={tbl.th}>セラピスト</th>
                <th className={tbl.th}>コース</th>
                <th className={tbl.th}>見積</th>
                <th className={tbl.th}>状態</th>
                <th className={tbl.th}>受付</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ivory/60">
                  <td className={tbl.td}>
                    <Link href={`/admin/reservations/${r.id}`} className="font-medium hover:underline">
                      {r.reservationNo}
                    </Link>
                  </td>
                  <td className={`${tbl.td} whitespace-nowrap`}>
                    {formatDateShort(r.desiredDate)} {r.desiredTime}
                  </td>
                  <td className={tbl.td}>
                    {r.customerName}
                    {r.isRepeat && <span className="ml-1 text-xs text-muted">(リピート)</span>}
                  </td>
                  <td className={tbl.td}>{r.therapist?.name ?? "フリー"}</td>
                  <td className={`${tbl.td} text-xs`}>{r.course?.name ?? "—"}</td>
                  <td className={tbl.td}>{yen(r.estimatedTotal)}</td>
                  <td className={tbl.td}>
                    <StatusPill status={r.status} labels={RESERVATION_STATUS} />
                  </td>
                  <td className={`${tbl.td} text-xs whitespace-nowrap text-muted`}>{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/reservations" params={params} />
    </>
  );
}
