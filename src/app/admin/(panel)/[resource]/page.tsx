import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { yen } from "@/lib/format";
import { getResource, type Column, type ResourceDef } from "@/lib/admin/resources";
import { delegate, relationInclude, type Row } from "@/lib/admin/crud";
import { PAGE_SIZE, pageParam, sp } from "@/lib/admin/form";
import { therapistOptions } from "@/lib/admin/queries";
import { b, Empty, FilterBar, FilterField, Flash, inputSm, PageHeader, Pager, Pill, tbl } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getResource((await params).resource)?.label ?? "管理" };
}

function Cell({ r, c, row }: { r: ResourceDef; c: Column; row: Row }) {
  const v = row[c.name];
  switch (c.kind) {
    case "bool":
      return v ? <Pill tone="ok">ON</Pill> : <Pill>OFF</Pill>;
    case "datetime":
      return <span className="whitespace-nowrap text-xs">{v instanceof Date ? formatDateTime(v) : "—"}</span>;
    case "select": {
      const f = r.fields.find((x) => x.name === c.name);
      return <>{f?.options?.[String(v)] ?? String(v)}</>;
    }
    case "yen":
      return <>{yen(Number(v))}</>;
    case "number":
      return <>{String(v ?? "")}</>;
    case "image":
      return v ? <img src={String(v).replace(/(?<!_t)\.webp$/, "_t.webp")} alt="" className="h-10 w-14 rounded object-cover" /> : <span className="text-xs text-muted">—</span>;
    case "therapist":
      return <>{(row.therapist as { name: string } | null)?.name ?? "—"}</>;
    case "therapistCount":
      return <>{(v as unknown[] | undefined)?.length ?? 0}名</>;
    default:
      return <>{String(v ?? "")}</>;
  }
}

export default async function ResourceListPage({ params, searchParams }: Props) {
  const r = getResource((await params).resource);
  if (!r) notFound();
  const user = await requireUser(r.roles ?? STAFF_ROLES);
  const q = await searchParams;
  const keyword = sp(q.q);
  const page = pageParam(q.page);

  const where: Record<string, unknown> = {};
  if (keyword) where.OR = r.search.map((f) => ({ [f]: { contains: keyword } }));
  const filterFields = (r.filters ?? []).map((n) => r.fields.find((f) => f.name === n)!).filter(Boolean);
  const isTherapist = r.ownerField && user.role === "THERAPIST";
  for (const f of filterFields) {
    const v = sp(q[f.name]);
    if (!v) continue;
    where[f.name] = f.type === "boolean" ? v === "1" : v;
  }
  if (isTherapist) where[r.ownerField!] = user.therapistId ?? "__none__";

  const d = delegate(r);
  const [rows, total, therapists] = await Promise.all([
    d.findMany({ where, orderBy: r.orderBy, include: relationInclude(r), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    d.count({ where }),
    filterFields.some((f) => f.type === "therapist") && !isTherapist ? therapistOptions() : Promise.resolve([]),
  ]);
  const paramsForPager = Object.fromEntries(Object.entries(q).map(([k, v]) => [k, sp(v)]));

  return (
    <>
      <PageHeader
        title={r.label}
        description={r.description}
        actions={
          <Link href={`/admin/${r.key}/new`} className={b("primary")}>
            ＋ 新規作成
          </Link>
        }
      />
      <Flash params={q} />
      <FilterBar action={`/admin/${r.key}`}>
        <FilterField label="キーワード">
          <input name="q" defaultValue={keyword} className={inputSm} placeholder="検索" />
        </FilterField>
        {filterFields
          .filter((f) => !(isTherapist && f.type === "therapist"))
          .map((f) => (
            <FilterField key={f.name} label={f.type === "boolean" ? f.label.replace(/する$/, "") : f.label}>
              <select name={f.name} defaultValue={sp(q[f.name])} className={inputSm}>
                <option value="">すべて</option>
                {f.type === "boolean" ? (
                  <>
                    <option value="1">ON</option>
                    <option value="0">OFF</option>
                  </>
                ) : f.type === "therapist" ? (
                  therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  Object.entries(f.options ?? {}).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))
                )}
              </select>
            </FilterField>
          ))}
      </FilterBar>

      {rows.length === 0 ? (
        <Empty description={keyword ? "条件に一致するデータがありません。" : "まだ登録されていません。"} href={`/admin/${r.key}/new`} label="新規作成" />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                {r.columns.map((c) => (
                  <th key={c.name} className={tbl.th}>
                    {c.label}
                  </th>
                ))}
                <th className={tbl.th}>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-ivory/60">
                  {r.columns.map((c, i) => (
                    <td key={c.name} className={tbl.td}>
                      {i === r.columns.findIndex((x) => x.kind !== "image") ? (
                        <Link href={`/admin/${r.key}/${row.id}`} className="font-medium text-ink hover:text-gold-deep hover:underline">
                          <Cell r={r} c={c} row={row} />
                        </Link>
                      ) : (
                        <Cell r={r} c={c} row={row} />
                      )}
                      {i === 0 && r.badges?.(row).map((x) => (
                        <span key={x.label} className="ml-1.5">
                          <Pill tone={x.tone}>{x.label}</Pill>
                        </span>
                      ))}
                    </td>
                  ))}
                  <td className={`${tbl.td} text-right`}>
                    <Link href={`/admin/${r.key}/${row.id}`} className={b("sm")}>
                      <Icon name="pen" className="h-3.5 w-3.5" />
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath={`/admin/${r.key}`} params={paramsForPager} />
    </>
  );
}
