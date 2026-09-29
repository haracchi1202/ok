import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { navFor } from "@/lib/admin/nav";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AdminShell nav={navFor(user.role)} userName={user.name} roleLabel={ROLES[user.role]}>
      {children}
    </AdminShell>
  );
}
