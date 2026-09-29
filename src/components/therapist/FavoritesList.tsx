"use client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import type { TherapistCardData } from "@/lib/therapists";
import { TherapistGrid } from "./TherapistGrid";
import { EmptyState, CardGridSkeleton } from "@/components/ui/States";

export function FavoritesList({ cards }: { cards: TherapistCardData[] }) {
  const favs = useFavorites();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <CardGridSkeleton count={4} />;
  const items = favs.map((s) => cards.find((c) => c.slug === s)).filter((c): c is TherapistCardData => !!c);
  return (
    <TherapistGrid
      items={items}
      empty={<EmptyState icon="heart" title="お気に入りはまだありません" description="気になるセラピストのハートをタップすると、ここに保存されます。" actionHref="/therapists" actionLabel="セラピストを探す" />}
    />
  );
}
