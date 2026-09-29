import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { THERAPIST_STATUS } from "@/lib/constants";
import { PAGE_SIZE, pageParam, sp } from "@/lib/admin/form";
import { b, Empty, FilterBar, FilterField, Flash, inputSm, PageHeader, Pager, Pill, StatusPill, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "セラピスト" };

export default async function TherapistListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const q = await searchParams;
  const keyword = sp(q.q);
  const status = sp(q.status);
  const page = pageParam(q.page);
  const where = {
    ...(keyword ? { OR: [{ name: { contains: keyword } }, { nameKana: { contains: keyword } }, { slug: { contains: keyword } }] } : {}),
    ...(status ? { status } : {}),
    ...(q.newcomer === "1" ? { isNewcomer: true } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.therapist.findMany({
      where,
      orderBy: [{ status: "asc" }, { recommendOrder: "asc" }, { name: "asc" }],
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { thumbPath: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.therapist.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="セラピスト"
        actions={
          <Link href="/admin/therapists/new" className={b("primary")}>
            ＋ 新規登録
          </Link>
        }
      />
      <Flash params={q} />
      <FilterBar action="/admin/therapists">
        <FilterField label="名前・ふりがな">
          <input name="q" defaultValue={keyword} className={inputSm} />
        </FilterField>
        <FilterField label="ステータス">
          <select name="status" defaultValue={status} className={inputSm}>
            <option value="">すべて</option>
            {Object.entries(THERAPIST_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="newcomer" value="1" defaultChecked={q.newcomer === "1"} />
          新人のみ
        </label>
      </FilterBar>
      {rows.length === 0 ? (
        <Empty description="条件に一致するセラピストがいません。" href="/admin/therapists/new" label="新規登録" />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>写真</th>
                <th className={tbl.th}>名前</th>
                <th className={tbl.th}>ステータス</th>
                <th className={tbl.th}>タグ</th>
                <th className={tbl.th}>おすすめ順</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-ivory/60">
                  <td className={tbl.td}>
                    {t.images[0] ? <img src={t.images[0].thumbPath} alt="" className="h-14 w-11 rounded object-cover" /> : <div className="h-14 w-11 rounded bg-ng-soft" />}
                  </td>
                  <td className={tbl.td}>
                    <Link href={`/admin/therapists/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <span className="ml-1 text-xs text-muted">
                      {t.age}歳 / {t.height}cm
                    </span>
                    {t.isNewcomer && (
                      <span className="ml-1.5">
                        <Pill tone="rose">新人</Pill>
                      </span>
                    )}
                  </td>
                  <td className={tbl.td}>
                    <StatusPill status={t.status} labels={THERAPIST_STATUS} />
                  </td>
                  <td className={`${tbl.td} max-w-xs text-xs text-muted`}>{t.tags.map((x) => x.tag.name).join("、") || "—"}</td>
                  <td className={tbl.td}>{t.recommendOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/therapists" params={{ q: keyword, status, newcomer: sp(q.newcomer) }} />
    </>
  );
}
