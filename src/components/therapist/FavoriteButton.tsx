"use client";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function FavoriteButton({ slug, name, variant = "icon" }: { slug: string; name: string; variant?: "icon" | "button" }) {
  const favs = useFavorites();
  const active = favs.includes(slug);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(slug);
  };
  if (variant === "button")
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-[15px] tracking-wider transition",
          active ? "border-rose bg-rose-soft text-rose" : "border-line bg-white text-ink hover:border-rose hover:text-rose",
        )}
      >
        <Icon name="heart" filled={active} className="h-5 w-5" />
        {active ? "お気に入り済み" : "お気に入り"}
      </button>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `${name}をお気に入りから外す` : `${name}をお気に入りに追加`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition",
        active ? "bg-white text-rose" : "bg-black/25 text-white hover:bg-black/40",
      )}
    >
      <Icon name="heart" filled={active} className="h-[18px] w-[18px]" />
    </button>
  );
}
