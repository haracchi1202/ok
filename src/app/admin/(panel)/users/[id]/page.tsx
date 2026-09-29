import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ADMIN_ONLY, requireUser } from "@/lib/auth";
import { saveUser } from "@/lib/admin/user-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { UserForm } from "@/components/admin/UserForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ユーザー編集" };

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser(ADMIN_ONLY);
  const { id } = await params;
  const u = await prisma.adminUser.findUnique({ where: { id } });
  if (!u) notFound();
  return (
    <>
      <PageHeader title={`${u.name} の編集`} back={{ href: "/admin/users", label: "管理ユーザー" }} />
      <UserForm
        isNew={false}
        isSelf={u.id === me.id}
        values={{ email: u.email, name: u.name, role: u.role, therapistId: u.therapistId ?? "", isActive: u.isActive }}
        therapists={await therapistOptions()}
        action={saveUser.bind(null, u.id)}
      />
    </>
  );
}
