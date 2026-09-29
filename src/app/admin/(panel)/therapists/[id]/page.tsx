import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { deleteTherapist, photoAction, saveTherapist, uploadPhotos } from "@/lib/admin/therapist-actions";
import { loadTherapist, therapistFormProps } from "@/lib/admin/therapist-data";
import { TherapistForm } from "@/components/admin/TherapistForm";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { ConfirmForm } from "@/components/admin/client";
import { b, Flash, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "セラピスト編集" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TherapistEditPage({ params, searchParams }: Props) {
  await requireUser(STAFF_ROLES);
  const { id } = await params;
  const t = await loadTherapist(id);
  if (!t) notFound();
  const props = await therapistFormProps(t);
  return (
    <>
      <PageHeader
        title={`${t.name} の編集`}
        back={{ href: "/admin/therapists", label: "セラピスト一覧" }}
        actions={
          <>
            <a href={`/therapists/${t.slug}`} target="_blank" rel="noopener noreferrer" className={b("secondary")}>
              公開ページ
            </a>
            <ConfirmForm action={deleteTherapist.bind(null, t.id)} confirmText="このセラピストと関連データ (出勤・日記・口コミ等) を削除します。よろしいですか？ 通常は「退店」ステータスへの変更をおすすめします。">
              <button type="submit" className={b("danger")}>
                削除
              </button>
            </ConfirmForm>
          </>
        }
      />
      <Flash params={await searchParams} />
      <div className="space-y-5">
        <PhotoManager photos={t.images} upload={uploadPhotos.bind(null, t.id)} act={photoAction.bind(null, t.id)} />
        <TherapistForm mode="full" {...props} action={saveTherapist.bind(null, t.id)} cancelHref="/admin/therapists" />
      </div>
    </>
  );
}
