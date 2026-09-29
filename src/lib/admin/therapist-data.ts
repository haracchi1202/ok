import "server-only";
import { prisma } from "@/lib/db";
import { toJstDateString } from "@/lib/time";
import type { TherapistValues } from "@/components/admin/TherapistForm";

type T = NonNullable<Awaited<ReturnType<typeof loadTherapist>>>;

export function loadTherapist(id: string) {
  return prisma.therapist.findUnique({
    where: { id },
    include: {
      tags: { select: { tagId: true } },
      answers: true,
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

/** セラピストフォームに渡す値と選択肢 */
export async function therapistFormProps(t: T | null) {
  const [tags, questions, areas] = await Promise.all([
    prisma.tag.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, group: true } }),
    prisma.profileQuestion.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const values: TherapistValues = t
    ? {
        slug: t.slug,
        name: t.name,
        nameKana: t.nameKana,
        age: String(t.age),
        height: String(t.height),
        catchCopy: t.catchCopy,
        shopComment: t.shopComment,
        selfMessage: t.selfMessage,
        status: t.status,
        isNewcomer: t.isNewcomer,
        joinedAt: toJstDateString(t.joinedAt),
        canOvernight: t.canOvernight,
        nominationFee: t.nominationFee === null ? "" : String(t.nominationFee),
        recommendOrder: String(t.recommendOrder),
        popularityScore: String(t.popularityScore),
        repeatScore: String(t.repeatScore),
        currentAreaId: t.currentAreaId ?? "",
        videoUrl: t.videoUrl ?? "",
        snsX: t.snsX ?? "",
        snsInstagram: t.snsInstagram ?? "",
        snsTiktok: t.snsTiktok ?? "",
      }
    : { status: "ACTIVE", isNewcomer: true, joinedAt: toJstDateString(new Date()), recommendOrder: "100", popularityScore: "0", repeatScore: "0" };
  const answers = new Map(t?.answers.map((a) => [a.questionId, a.answer]) ?? []);
  return {
    values,
    tagIds: t?.tags.map((x) => x.tagId) ?? [],
    tags,
    areas,
    questions: questions.map((q) => ({ id: q.id, question: q.question, answer: answers.get(q.id) ?? "" })),
  };
}
