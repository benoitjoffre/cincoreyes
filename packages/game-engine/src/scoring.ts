import type { Card, Rank } from "@cincoreyes/contracts";
import { isWild } from "./deck.js";

export function cardScore(card: Card, roundRank: Rank): number {
  if (card.rank === "joker") return 50;
  if (isWild(card, roundRank)) return 20;
  return card.rank;
}

export function handScore(cards: readonly Card[], roundRank: Rank): number {
  return cards.reduce((total, card) => total + cardScore(card, roundRank), 0);
}
