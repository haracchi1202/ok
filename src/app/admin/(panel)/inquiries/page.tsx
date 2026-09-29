import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { INQUIRY_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { PAGE_SIZE, pageParam, sp } from "@/lib/admin/form";
import { setInquiryStatus } from "@/lib/admin/misc-actions";
import { AutoSubmitSelect } from "@/components/admin/client";
import { Empty, FilterBar, FilterField, inputSm, PageHeader, Pager, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "お問い合わせ" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const q = await searchParams;
  const status = sp(q.status);
  const keyword = sp(q.q);
  const page = pageParam(q.page);
  const where = {
    ...(status ? { status } : {}),
    ...(keyword ? { OR: [{ name: { contains: keyword } }, { email: { contains: keyword } }, { message: { contains: keyword } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.inquiry.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="お問い合わせ" />
      <FilterBar action="/admin/inquiries">
        <FilterField label="状態">
          <select name="status" defaultValue={status} className={inputSm}>
            <option value="">すべて</option>
            {Object.entries(INQUIRY_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="キーワード">
          <input name="q" defaultValue={keyword} className={inputSm} />
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <Empty title="お問い合わせはありません" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={r.status} labels={INQUIRY_STATUS} />
                <span className="font-medium">{r.name}</span>
                <a href={`mailto:${r.email}`} className="text-sm text-gold-deep underline">
                  {r.email}
                </a>
                {r.phone && <span className="text-sm text-muted">{r.phone}</span>}
                <span className="text-xs text-muted">
                  {r.category} / {formatDateTime(r.createdAt)}
                </span>
                <span className="ml-auto">
                  <AutoSubmitSelect action={setInquiryStatus.bind(null, r.id)} name="status" value={r.status} options={INQUIRY_STATUS} />
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-ink-soft">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/inquiries" params={{ status, q: keyword }} />
    </>
  );
}
