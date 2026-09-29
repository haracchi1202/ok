import type { TherapistCardData } from "./therapists";
import type { RankingWithEntries } from "./content";

/** ランキングの並び順でカードデータを返す */
export function rankingToCards(ranking: RankingWithEntries | null, cards: TherapistCardData[]): TherapistCardData[] {
  if (!ranking) return [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ranking.entries.map((e) => byId.get(e.therapistId)).filter((c): c is TherapistCardData => !!c);
}
