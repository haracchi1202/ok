import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getResource } from "@/lib/admin/resources";
import { delegate, relationInclude, toFormValues } from "@/lib/admin/crud";
import { deleteResource, saveResource } from "@/lib/admin/crud-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { ConfirmForm } from "@/components/admin/client";
import { b, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ resource: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getResource((await params).resource);
  return { title: r ? `${r.label} 編集` : "管理" };
}

export default async function ResourceEditPage({ params }: Props) {
  const { resource, id } = await params;
  const r = getResource(resource);
  if (!r) notFound();
  const user = await requireUser(r.roles ?? STAFF_ROLES);
  const row = await delegate(r).findUnique({ where: { id }, include: relationInclude(r) });
  if (!row) notFound();
  const isTherapist = r.ownerField && user.role === "THERAPIST";
  if (isTherapist && row[r.ownerField!] !== user.therapistId) redirect("/admin?denied=1");

  const needTherapists = r.fields.some((f) => f.type === "therapist" || f.type === "therapists");
  const therapists = needTherapists ? await therapistOptions() : [];
  const publicPath = r.publicPath?.(row);
  return (
    <>
      <PageHeader
        title={`${r.label}を編集`}
        description={`最終更新: ${row.updatedAt instanceof Date ? formatDateTime(row.updatedAt) : "—"}`}
        back={{ href: `/admin/${r.key}`, label: `${r.label}一覧` }}
        actions={
          <>
            {publicPath && (
              <a href={publicPath} target="_blank" rel="noopener noreferrer" className={b("secondary")}>
                公開ページを見る
              </a>
            )}
            <ConfirmForm action={deleteResource.bind(null, r.key, id)}>
              <button type="submit" className={b("danger")}>
                削除
              </button>
            </ConfirmForm>
          </>
        }
      />
      <ResourceForm
        fields={r.fields}
        values={toFormValues(r, row)}
        therapists={therapists}
        action={saveResource.bind(null, r.key, id)}
        cancelHref={`/admin/${r.key}`}
        hidden={isTherapist ? [r.ownerField!] : []}
      />
    </>
  );
}
