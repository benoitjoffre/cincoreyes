import { ranks, suits, type Card, type Rank } from "@cincoreyes/contracts";

export type RandomSource = () => number;

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (let copy = 1; copy <= 2; copy += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ id: `${copy}-${suit}-${rank}`, rank, suit });
      }
    }

    for (let joker = 1; joker <= 3; joker += 1) {
      cards.push({ id: `${copy}-joker-${joker}`, rank: "joker", suit: "joker" });
    }
  }

  return cards;
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const swapped = shuffled[swapIndex];
    if (current === undefined || swapped === undefined) continue;
    shuffled[index] = swapped;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

export function isWild(card: Card, roundRank: Rank): boolean {
  return card.rank === "joker" || card.rank === roundRank;
}

export function recycleDiscardPile(discardPile: readonly Card[], random: RandomSource = Math.random) {
  if (discardPile.length < 2) return { drawPile: [] as Card[], discardPile: [...discardPile] };
  const top = discardPile.at(-1);
  if (!top) return { drawPile: [] as Card[], discardPile: [] as Card[] };
  return { drawPile: shuffle(discardPile.slice(0, -1), random), discardPile: [top] };
}
