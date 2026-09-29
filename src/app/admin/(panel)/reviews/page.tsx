import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { REVIEW_STATUS } from "@/lib/constants";
import { formatDateShort, formatDateTime } from "@/lib/time";
import { PAGE_SIZE, pageParam, sp } from "@/lib/admin/form";
import { setReviewStatus } from "@/lib/admin/review-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { b, Empty, FilterBar, FilterField, Flash, inputSm, PageHeader, Pager, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "口コミ" };

const include = { therapist: { select: { name: true } } } as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const q = await searchParams;
  const status = sp(q.status);
  const therapistId = sp(q.therapistId);
  const page = pageParam(q.page);
  const base: Prisma.ReviewWhereInput = { ...(therapistId ? { therapistId } : {}) };
  const orderBy = { createdAt: "desc" } as const;
  const skip = (page - 1) * PAGE_SIZE;

  let rows: Prisma.ReviewGetPayload<{ include: typeof include }>[];
  let total: number;
  if (status) {
    const where = { ...base, status };
    [rows, total] = await Promise.all([prisma.review.findMany({ where, include, orderBy, skip, take: PAGE_SIZE }), prisma.review.count({ where })]);
  } else {
    // 絞り込みなし: 承認待ちを先頭に、その後にその他を新しい順
    const pendingWhere = { ...base, status: "PENDING" };
    const otherWhere = { ...base, status: { not: "PENDING" } };
    const [pendingCount, otherCount] = await Promise.all([prisma.review.count({ where: pendingWhere }), prisma.review.count({ where: otherWhere })]);
    total = pendingCount + otherCount;
    const pending = skip < pendingCount ? await prisma.review.findMany({ where: pendingWhere, include, orderBy, skip, take: PAGE_SIZE }) : [];
    const rest = PAGE_SIZE - pending.length;
    const others = rest > 0 ? await prisma.review.findMany({ where: otherWhere, include, orderBy, skip: Math.max(0, skip - pendingCount), take: rest }) : [];
    rows = [...pending, ...others];
  }
  const therapists = await therapistOptions();

  return (
    <>
      <PageHeader title="口コミ" description="承認待ちの口コミは「公開」にするとサイトに表示されます。" />
      <Flash params={q} />
      <FilterBar action="/admin/reviews">
        <FilterField label="状態">
          <select name="status" defaultValue={status} className={inputSm}>
            <option value="">すべて (承認待ちを先頭)</option>
            {Object.entries(REVIEW_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="セラピスト">
          <select name="therapistId" defaultValue={therapistId} className={inputSm}>
            <option value="">すべて</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <Empty title="口コミがありません" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusPill status={r.status} labels={REVIEW_STATUS} />
                <span className="text-gold">{"★".repeat(r.rating)}</span>
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-muted">
                  {r.therapist.name} / {r.nickname} / ご利用 {formatDateShort(r.visitDate)} / 投稿 {formatDateTime(r.createdAt)}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-ink-soft">{r.body}</p>
              {r.shopReply && <p className="mt-2 rounded-lg bg-ivory p-2 text-xs text-muted">返信: {r.shopReply}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "PUBLISHED" && (
                  <form action={setReviewStatus.bind(null, r.id)}>
                    <input type="hidden" name="status" value="PUBLISHED" />
                    <button className={b("sm", "border-ok/40 text-ok")}>承認して公開</button>
                  </form>
                )}
                {r.status !== "HIDDEN" && (
                  <form action={setReviewStatus.bind(null, r.id)}>
                    <input type="hidden" name="status" value="HIDDEN" />
                    <button className={b("sm")}>非公開にする</button>
                  </form>
                )}
                <Link href={`/admin/reviews/${r.id}`} className={b("sm")}>
                  編集・返信
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/reviews" params={{ status, therapistId }} />
    </>
  );
}
