import { Icon } from "./Icon";

export function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex text-gold" aria-label={`評価 ${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" filled={i <= Math.round(rating)} className={className} />
      ))}
    </span>
  );
}
