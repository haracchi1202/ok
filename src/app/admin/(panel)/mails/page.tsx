import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { PAGE_SIZE, pageParam } from "@/lib/admin/form";
import { Empty, PageHeader, Pager, Pill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "メールログ" };

export default async function MailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(STAFF_ROLES);
  const page = pageParam((await searchParams).page);
  const [rows, total] = await Promise.all([
    prisma.mailLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.mailLog.count(),
  ]);
  return (
    <>
      <PageHeader title="メールログ" description="送信 (または SMTP 未設定時に記録) されたメールの履歴です。" />
      {rows.length === 0 ? (
        <Empty title="メールの記録はありません" />
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-white">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                  <Pill tone={m.status === "SENT" ? "ok" : m.status === "FAILED" ? "danger" : "gray"}>{m.status}</Pill>
                  <span className="font-medium">{m.subject}</span>
                  <span className="text-muted">→ {m.to}</span>
                  <span className="ml-auto text-xs text-muted">{formatDateTime(m.createdAt)}</span>
                </summary>
                <pre className="border-t border-line p-3 text-xs whitespace-pre-wrap text-ink-soft">{m.body}</pre>
                {m.error && <p className="border-t border-line p-3 text-xs text-danger">{m.error}</p>}
              </details>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/mails" params={{}} />
    </>
  );
}
