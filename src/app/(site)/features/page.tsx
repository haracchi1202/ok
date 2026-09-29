import type { Metadata } from "next";
import Link from "next/link";
import { getFeatures } from "@/lib/content";
import { formatDateLong } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "動画・特集", description: "セラピストのインタビューや動画、選び方のコツなどの特集コンテンツ。", alternates: { canonical: "/features" } };
export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const items = await getFeatures();
  return (
    <>
      <Breadcrumbs items={[{ name: "動画・特集" }]} />
      <PageHero en="FEATURES" title="動画・特集" />
      <div className="container-page mt-6">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <Link key={f.id} href={`/features/${f.slug}`} className="card group block overflow-hidden">
                <div className="relative aspect-video bg-ink-soft">
                  {f.imagePath && <img src={f.imagePath.replace(".webp", "_t.webp")} alt="" width={600} height={338} loading="lazy" className="h-full w-full object-cover" />}
                  {f.kind === "VIDEO" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85"><Icon name="play" filled className="h-5 w-5" /></span>
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[11px] tracking-widest text-gold-deep">{f.kind === "VIDEO" ? "MOVIE" : "FEATURE"} ・ {formatDateLong(f.publishedAt)}</p>
                  <h2 className="mt-1 font-serif text-base">{f.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{f.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="特集はまだありません" />
        )}
      </div>
    </>
  );
}
