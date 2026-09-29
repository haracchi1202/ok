import type { Metadata } from "next";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { saveTherapist } from "@/lib/admin/therapist-actions";
import { therapistFormProps } from "@/lib/admin/therapist-data";
import { TherapistForm } from "@/components/admin/TherapistForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "セラピスト新規登録" };

export default async function TherapistNewPage() {
  await requireUser(STAFF_ROLES);
  const props = await therapistFormProps(null);
  return (
    <>
      <PageHeader title="セラピスト新規登録" description="写真は登録後に追加できます。" back={{ href: "/admin/therapists", label: "セラピスト一覧" }} />
      <TherapistForm mode="full" {...props} action={saveTherapist.bind(null, null)} cancelHref="/admin/therapists" />
    </>
  );
}
