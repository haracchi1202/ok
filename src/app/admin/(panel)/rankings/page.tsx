import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { RANKING_PERIODS, RANKING_TYPES, label } from "@/lib/constants";
import { formatDateShort } from "@/lib/time";
import { PAGE_SIZE, pageParam, sp } from "@/lib/admin/form";
import { b, Empty, FilterBar, FilterField, Flash, inputSm, PageHeader, Pager, Pill, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ランキング" };

export default async function RankingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const q = await searchParams;
  const type = sp(q.type);
  const period = sp(q.period);
  const page = pageParam(q.page);
  const where = { ...(type ? { type } : {}), ...(period ? { period } : {}) };
  const [rows, total] = await Promise.all([
    prisma.ranking.findMany({ where, orderBy: [{ periodStart: "desc" }, { type: "asc" }], include: { _count: { select: { entries: true } } }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.ranking.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        title="ランキング"
        actions={
          <Link href="/admin/rankings/new" className={b("primary")}>
            ＋ 新規作成
          </Link>
        }
      />
      <Flash params={q} />
      <FilterBar action="/admin/rankings">
        <FilterField label="種別">
          <select name="type" defaultValue={type} className={inputSm}>
            <option value="">すべて</option>
            {Object.entries(RANKING_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="期間">
          <select name="period" defaultValue={period} className={inputSm}>
            <option value="">すべて</option>
            {Object.entries(RANKING_PERIODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <Empty title="ランキングがありません" href="/admin/rankings/new" label="新規作成" />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>種別</th>
                <th className={tbl.th}>期間</th>
                <th className={tbl.th}>開始日</th>
                <th className={tbl.th}>タイトル</th>
                <th className={tbl.th}>人数</th>
                <th className={tbl.th}>作成</th>
                <th className={tbl.th}>公開</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ivory/60">
                  <td className={tbl.td}>
                    <Link href={`/admin/rankings/${r.id}`} className="font-medium hover:underline">
                      {label(RANKING_TYPES, r.type)}
                    </Link>
                  </td>
                  <td className={tbl.td}>{label(RANKING_PERIODS, r.period)}</td>
                  <td className={tbl.td}>{formatDateShort(r.periodStart)}</td>
                  <td className={tbl.td}>{r.title || "—"}</td>
                  <td className={tbl.td}>{r._count.entries}</td>
                  <td className={tbl.td}>{r.source === "AUTO" ? <Pill tone="gold">自動</Pill> : <Pill>手動</Pill>}</td>
                  <td className={tbl.td}>{r.isPublished ? <Pill tone="ok">公開</Pill> : <Pill>非公開</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/rankings" params={{ type, period }} />
    </>
  );
}
