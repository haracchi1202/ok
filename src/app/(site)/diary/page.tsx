import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { publishedDiaryWhere } from "@/lib/content";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DiaryCard } from "@/components/content/DiaryCard";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { TherapistSelectNav } from "@/components/content/TherapistSelectNav";

export const dynamic = "force-dynamic";
const PER = 16;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { therapist } = await searchParams;
  const t = therapist ? await prisma.therapist.findFirst({ where: { slug: therapist, status: "ACTIVE" } }) : null;
  return { title: t ? `${t.name}の日記` : "セラピスト日記", description: "セラピストたちの日常をお届けする日記。", alternates: { canonical: t ? `/diary?therapist=${t.slug}` : "/diary" } };
}

export default async function DiaryListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const therapists = await prisma.therapist.findMany({ where: { status: "ACTIVE" }, orderBy: { recommendOrder: "asc" }, select: { id: true, slug: true, name: true } });
  const t = therapists.find((x) => x.slug === sp.therapist);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...publishedDiaryWhere(), ...(t ? { therapistId: t.id } : {}) };
  const [items, total] = await Promise.all([
    prisma.diary.findMany({
      where,
      include: { therapist: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
      orderBy: { publishedAt: "desc" },
      take: PER,
      skip: (page - 1) * PER,
    }),
    prisma.diary.count({ where }),
  ]);
  return (
    <>
      <Breadcrumbs items={t ? [{ name: "日記", href: "/diary" }, { name: t.name }] : [{ name: "日記" }]} />
      <PageHero en="DIARY" title={t ? `${t.name}の日記` : "セラピスト日記"} lead={`${total}件`}>
        <div className="mt-4">
          <TherapistSelectNav therapists={therapists} current={t?.slug ?? ""} basePath="/diary" />
        </div>
      </PageHero>
      <div className="container-page mt-6">
        {items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {items.map((d) => <DiaryCard key={d.id} d={d} showTherapist={!t} />)}
          </div>
        ) : (
          <EmptyState title="日記はまだありません" />
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PER)} basePath="/diary" params={{ therapist: t?.slug }} />
      </div>
    </>
  );
}
