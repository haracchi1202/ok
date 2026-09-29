import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ADMIN_ONLY, requireUser } from "@/lib/auth";
import { ROLES, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { b, Empty, Flash, PageHeader, Pill, tbl } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "管理ユーザー" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireUser(ADMIN_ONLY);
  const users = await prisma.adminUser.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }], include: { therapist: { select: { name: true } } } });
  return (
    <>
      <PageHeader
        title="管理ユーザー"
        actions={
          <Link href="/admin/users/new" className={b("primary")}>
            ＋ ユーザー追加
          </Link>
        }
      />
      <Flash params={await searchParams} />
      {users.length === 0 ? (
        <Empty />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>名前</th>
                <th className={tbl.th}>メール</th>
                <th className={tbl.th}>権限</th>
                <th className={tbl.th}>セラピスト</th>
                <th className={tbl.th}>状態</th>
                <th className={tbl.th}>最終ログイン</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ivory/60">
                  <td className={tbl.td}>
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                      {u.name}
                    </Link>
                    {u.id === me.id && <span className="ml-1 text-xs text-muted">(自分)</span>}
                  </td>
                  <td className={tbl.td}>{u.email}</td>
                  <td className={tbl.td}>
                    <Pill tone={u.role === "ADMIN" ? "ink" : u.role === "STAFF" ? "gold" : "rose"}>{label(ROLES, u.role)}</Pill>
                  </td>
                  <td className={tbl.td}>{u.therapist?.name ?? "—"}</td>
                  <td className={tbl.td}>{u.isActive ? <Pill tone="ok">有効</Pill> : <Pill>無効</Pill>}</td>
                  <td className={`${tbl.td} text-xs text-muted`}>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
