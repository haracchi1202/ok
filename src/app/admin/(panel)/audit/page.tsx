import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ADMIN_ONLY, requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { pageParam, sp } from "@/lib/admin/form";
import { Empty, FilterBar, FilterField, inputSm, PageHeader, Pager, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "操作ログ" };

const SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(ADMIN_ONLY);
  const q = await searchParams;
  const entity = sp(q.entity);
  const action = sp(q.action);
  const page = pageParam(q.page);
  const where = { ...(entity ? { entity } : {}), ...(action ? { action } : {}) };
  const [rows, total, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, email: true } } }, skip: (page - 1) * SIZE, take: SIZE }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="操作ログ" />
      <FilterBar action="/admin/audit">
        <FilterField label="対象">
          <select name="entity" defaultValue={entity} className={inputSm}>
            <option value="">すべて</option>
            {entities.map((e) => (
              <option key={e.entity} value={e.entity}>
                {e.entity}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="操作">
          <input name="action" defaultValue={action} className={inputSm} placeholder="create / update / login…" />
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <Empty title="ログがありません" />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>日時</th>
                <th className={tbl.th}>ユーザー</th>
                <th className={tbl.th}>操作</th>
                <th className={tbl.th}>対象</th>
                <th className={tbl.th}>詳細</th>
                <th className={tbl.th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${tbl.td} text-xs whitespace-nowrap`}>{formatDateTime(r.createdAt)}</td>
                  <td className={tbl.td}>{r.actor?.name ?? "—"}</td>
                  <td className={tbl.td}>{r.action}</td>
                  <td className={`${tbl.td} text-xs`}>
                    {r.entity}
                    {r.entityId && <span className="block text-muted">{r.entityId}</span>}
                  </td>
                  <td className={`${tbl.td} max-w-sm text-xs break-all text-muted`}>{r.detail.slice(0, 300)}</td>
                  <td className={`${tbl.td} text-xs text-muted`}>{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={SIZE} basePath="/admin/audit" params={{ entity, action }} />
    </>
  );
}
