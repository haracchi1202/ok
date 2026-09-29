import type { Metadata } from "next";
import Link from "next/link";
import { getEvents } from "@/lib/content";
import { formatDateLong } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "イベント・キャンペーン", description: "開催中・開催予定のイベントとキャンペーン。", alternates: { canonical: "/events" } };
export const dynamic = "force-dynamic";

function period(s: Date | null, e: Date | null) {
  if (!s && !e) return "";
  return `${s ? formatDateLong(s) : ""}〜${e ? formatDateLong(e) : ""}`;
}

export default async function EventsPage() {
  const events = await getEvents();
  const now = new Date();
  const status = (s: Date | null, e: Date | null) => (e && e < now ? "終了" : s && s > now ? "開催予定" : "開催中");
  return (
    <>
      <Breadcrumbs items={[{ name: "イベント" }]} />
      <PageHero en="EVENTS" title="イベント・キャンペーン" />
      <div className="container-page mt-6">
        {events.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const st = status(ev.startsAt, ev.endsAt);
              return (
                <Link key={ev.id} href={`/events/${ev.slug}`} className={`card group block overflow-hidden ${st === "終了" ? "opacity-60" : ""}`}>
                  <div className="aspect-video bg-ink-soft">
                    {ev.imagePath && <img src={ev.imagePath.replace(".webp", "_t.webp")} alt="" width={600} height={338} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <Badge tone={st === "開催中" ? "now" : st === "開催予定" ? "rank" : "muted"}>{st}</Badge>
                    <h2 className="mt-2 font-serif text-base">{ev.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{ev.summary}</p>
                    <p className="mt-2 text-xs text-muted">{period(ev.startsAt, ev.endsAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="現在開催中のイベントはありません" />
        )}
      </div>
    </>
  );
}
