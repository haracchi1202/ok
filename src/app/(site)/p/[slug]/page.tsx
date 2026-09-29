import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return cmsMetadata(slug, `/p/${slug}`);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return <CmsPage slug="__none__" />;
  return <CmsPage slug={slug} />;
}
