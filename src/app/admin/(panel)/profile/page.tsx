import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { photoAction, saveMyProfile, uploadPhotos } from "@/lib/admin/therapist-actions";
import { loadTherapist, therapistFormProps } from "@/lib/admin/therapist-data";
import { TherapistForm } from "@/components/admin/TherapistForm";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { Empty, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "マイプロフィール" };

export default async function MyProfilePage() {
  const user = await requireUser(["THERAPIST"]);
  const t = user.therapistId ? await loadTherapist(user.therapistId) : null;
  if (!t) return <Empty title="セラピスト情報が紐づいていません" description="管理者にお問い合わせください。" />;
  const props = await therapistFormProps(t);
  return (
    <>
      <PageHeader title="マイプロフィール" description="キャッチコピー・メッセージ・プロフィール回答・SNS・写真を編集できます。" />
      <div className="space-y-5">
        <PhotoManager photos={t.images} upload={uploadPhotos.bind(null, t.id)} act={photoAction.bind(null, t.id)} />
        <TherapistForm mode="self" {...props} action={saveMyProfile} />
      </div>
    </>
  );
}
