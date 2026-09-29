import "server-only";
import { prisma } from "@/lib/db";
import { THERAPIST_STATUS } from "@/lib/constants";

/** セレクト用のセラピスト一覧 (非公開・退店も含む) */
export async function therapistOptions() {
  const list = await prisma.therapist.findMany({ select: { id: true, name: true, status: true }, orderBy: [{ status: "asc" }, { recommendOrder: "asc" }, { name: "asc" }] });
  return list.map((t) => ({ id: t.id, name: t.status === "ACTIVE" ? t.name : `${t.name} (${THERAPIST_STATUS[t.status as keyof typeof THERAPIST_STATUS] ?? t.status})` }));
}
