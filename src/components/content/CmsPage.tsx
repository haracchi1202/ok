import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { stripMarkup, truncate } from "@/lib/format";
import { formatDateLong } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RichText } from "@/components/ui/RichText";

/** 管理画面「固定ページ」で編集する CMS ページ */
export async function cmsMetadata(slug: string, path: string): Promise<Metadata> {
  const p = await getPage(slug);
  if (!p) return { title: "ページが見つかりません" };
  return { title: p.title, description: p.seoDescription || truncate(stripMarkup(p.body), 110), alternates: { canonical: path } };
}

export async function CmsPage({ slug, en, children }: { slug: string; en?: string; children?: React.ReactNode }) {
  const p = await getPage(slug);
  if (!p) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: p.title }]} />
      <PageHero en={en} title={p.title} />
      <div className="container-page mt-6 max-w-3xl">
        <div className="card p-6 text-[15px] sm:p-8">
          <RichText text={p.body} />
          <p className="mt-8 text-right text-xs text-muted">最終更新：{formatDateLong(p.updatedAt)}</p>
        </div>
        {children}
      </div>
    </>
  );
}
