import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { deleteReview, saveReview } from "@/lib/admin/review-actions";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { ConfirmForm } from "@/components/admin/client";
import { b, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "口コミ編集" };

export default async function ReviewEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(STAFF_ROLES);
  const { id } = await params;
  const r = await prisma.review.findUnique({ where: { id }, include: { therapist: { select: { name: true } } } });
  if (!r) notFound();
  return (
    <>
      <PageHeader
        title="口コミ編集"
        description={`${r.therapist.name} への口コミ / 投稿 ${formatDateTime(r.createdAt)}`}
        back={{ href: "/admin/reviews", label: "口コミ一覧" }}
        actions={
          <ConfirmForm action={deleteReview.bind(null, r.id)}>
            <button className={b("danger")}>削除</button>
          </ConfirmForm>
        }
      />
      <ReviewForm values={r} action={saveReview.bind(null, r.id)} />
    </>
  );
}
