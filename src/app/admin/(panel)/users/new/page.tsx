import type { Metadata } from "next";
import { ADMIN_ONLY, requireUser } from "@/lib/auth";
import { saveUser } from "@/lib/admin/user-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { UserForm } from "@/components/admin/UserForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ユーザー追加" };

export default async function UserNewPage() {
  await requireUser(ADMIN_ONLY);
  return (
    <>
      <PageHeader title="ユーザー追加" back={{ href: "/admin/users", label: "管理ユーザー" }} />
      <UserForm
        isNew
        isSelf={false}
        values={{ email: "", name: "", role: "STAFF", therapistId: "", isActive: true }}
        therapists={await therapistOptions()}
        action={saveUser.bind(null, null)}
      />
    </>
  );
}
