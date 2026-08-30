import type { Card, Rank } from "@cincoreyes/contracts";
import { isWild } from "./deck.js";
import { isValidBook, isValidRun } from "./melds.js";

export function cardScore(card: Card, roundRank: Rank): number {
  if (card.rank === "joker") return 50;
  if (isWild(card, roundRank)) return 20;
  return card.rank;
}

export function handScore(cards: readonly Card[], roundRank: Rank): number {
  return cards.reduce((total, card) => total + cardScore(card, roundRank), 0);
}

export function deadwoodScore(cards: readonly Card[], roundRank: Rank): number {
  const fullMask = (1 << cards.length) - 1;
  const validMeldMasks: number[] = [];

  for (let mask = 0; mask <= fullMask; mask += 1) {
    const meldCards = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    if (meldCards.length >= 3 && (isValidBook(meldCards, roundRank) || isValidRun(meldCards, roundRank))) {
      validMeldMasks.push(mask);
    }
  }

  const memo = new Map<number, number>();
  const scoreRemaining = (remainingMask: number): number => {
    const cached = memo.get(remainingMask);
    if (cached !== undefined) return cached;

    const remainingCards = cards.filter((_, index) => (remainingMask & (1 << index)) !== 0);
    let minimumScore = handScore(remainingCards, roundRank);
    for (const meldMask of validMeldMasks) {
      if ((meldMask & remainingMask) !== meldMask) continue;
      minimumScore = Math.min(minimumScore, scoreRemaining(remainingMask & ~meldMask));
    }

    memo.set(remainingMask, minimumScore);
    return minimumScore;
  };

  return scoreRemaining(fullMask);
}
