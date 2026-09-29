import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTherapistCards } from "@/lib/therapists";
import { formatDateLong } from "@/lib/time";
import { stripMarkup, truncate } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RichText } from "@/components/ui/RichText";
import { TherapistRow } from "@/components/therapist/TherapistGrid";
import { ReserveBand } from "@/components/site/ReserveBand";
import { siteUrl } from "@/lib/settings";
import { JsonLd } from "@/components/ui/JsonLd";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
const load = (slug: string) => prisma.event.findFirst({ where: { slug, isPublished: true }, include: { therapists: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await load((await params).slug);
  if (!e) return { title: "イベントが見つかりません" };
  return { title: e.title, description: truncate(e.summary || stripMarkup(e.body), 110), alternates: { canonical: `/events/${e.slug}` }, openGraph: { images: e.imagePath ? [e.imagePath] : undefined } };
}

export default async function EventDetail({ params }: Props) {
  const e = await load((await params).slug);
  if (!e) notFound();
  const ids = new Set(e.therapists.map((x) => x.therapistId));
  const members = (await getTherapistCards()).filter((c) => ids.has(c.id));
  return (
    <>
      <Breadcrumbs items={[{ name: "イベント", href: "/events" }, { name: e.title }]} />
      <article className="container-page mt-6 max-w-3xl">
        {e.imagePath && <img src={e.imagePath} alt="" className="w-full rounded-2xl" />}
        <h1 className="mt-6 text-2xl">{e.title}</h1>
        {(e.startsAt || e.endsAt) && <p className="mt-2 text-sm text-muted">開催期間：{e.startsAt ? formatDateLong(e.startsAt) : ""}〜{e.endsAt ? formatDateLong(e.endsAt) : ""}</p>}
        {e.summary && <p className="mt-4 font-serif text-lg text-ink-soft">{e.summary}</p>}
        <div className="card mt-6 p-6 text-[15px]"><RichText text={e.body} /></div>
      </article>
      {members.length > 0 && (
        <section className="container-page mt-12">
          <h2 className="mb-4 text-lg">対象セラピスト</h2>
          <TherapistRow items={members} />
        </section>
      )}
      <ReserveBand />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.summary, startDate: e.startsAt?.toISOString(), endDate: e.endsAt?.toISOString(), url: `${siteUrl}/events/${e.slug}`, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode" }} />
    </>
  );
}
