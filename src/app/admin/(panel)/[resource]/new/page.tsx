import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { toFormValues } from "@/lib/admin/crud";
import { saveResource } from "@/lib/admin/crud-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ resource: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getResource((await params).resource);
  return { title: r ? `${r.label} 新規作成` : "管理" };
}

export default async function ResourceNewPage({ params }: Props) {
  const r = getResource((await params).resource);
  if (!r) notFound();
  const user = await requireUser(r.roles ?? STAFF_ROLES);
  const needTherapists = r.fields.some((f) => f.type === "therapist" || f.type === "therapists");
  const therapists = needTherapists ? await therapistOptions() : [];
  const hidden = r.ownerField && user.role === "THERAPIST" ? [r.ownerField] : [];
  return (
    <>
      <PageHeader title={`${r.label}を作成`} back={{ href: `/admin/${r.key}`, label: `${r.label}一覧` }} />
      <ResourceForm
        fields={r.fields}
        values={toFormValues(r, null)}
        therapists={therapists}
        action={saveResource.bind(null, r.key, null)}
        cancelHref={`/admin/${r.key}`}
        hidden={hidden}
      />
    </>
  );
}
