import type { Metadata } from "next";
import { getTherapistCards } from "@/lib/therapists";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FavoritesList } from "@/components/therapist/FavoritesList";

export const metadata: Metadata = { title: "お気に入り", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const cards = await getTherapistCards();
  return (
    <>
      <Breadcrumbs items={[{ name: "お気に入り" }]} />
      <PageHero en="FAVORITES" title="お気に入り" lead="お気に入りはこのブラウザに保存されます（ログイン不要）。" />
      <div className="container-page mt-6">
        <FavoritesList cards={cards} />
      </div>
    </>
  );
}
