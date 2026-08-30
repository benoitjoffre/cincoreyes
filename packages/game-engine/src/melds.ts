import type { Card, MeldSubmission, Rank } from "@cincoreyes/contracts";
import { isWild } from "./deck.js";

export function isValidBook(cards: readonly Card[], roundRank: Rank): boolean {
  if (cards.length < 3) return false;
  const naturalCards = cards.filter((card) => !isWild(card, roundRank));
  return naturalCards.every((card) => card.rank === naturalCards[0]?.rank);
}

export function isValidRun(cards: readonly Card[], roundRank: Rank): boolean {
  if (cards.length < 3) return false;
  const naturalCards = cards.filter((card) => !isWild(card, roundRank));
  if (naturalCards.length === 0) return true;
  if (!naturalCards.every((card) => card.suit === naturalCards[0]?.suit)) return false;

  const values = naturalCards.map((card) => card.rank as number).sort((left, right) => left - right);
  if (new Set(values).size !== values.length) return false;

  const gaps = values.slice(1).reduce((total, value, index) => total + value - (values[index] ?? value) - 1, 0);
  const wildCount = cards.length - naturalCards.length;
  return gaps <= wildCount && values.at(-1)! - values[0]! < cards.length;
}

export function validateMelds(hand: readonly Card[], melds: readonly MeldSubmission[], roundRank: Rank): boolean {
  const handById = new Map(hand.map((card) => [card.id, card]));
  const submittedIds = melds.flatMap((meld) => meld.cardIds);
  if (submittedIds.length !== hand.length || new Set(submittedIds).size !== submittedIds.length) return false;

  return melds.every((meld) => {
    const cards = meld.cardIds.map((id) => handById.get(id));
    if (cards.some((card) => card === undefined)) return false;
    return meld.type === "book" ? isValidBook(cards as Card[], roundRank) : isValidRun(cards as Card[], roundRank);
  });
}

export function findValidMelds(hand: readonly Card[], roundRank: Rank): MeldSubmission[] | null {
  if (hand.length === 0) return [];
  if (hand.length < 3) return null;

  const [firstCard, ...remainingCards] = hand;
  if (!firstCard) return null;

  for (let mask = 0; mask < 2 ** remainingCards.length; mask += 1) {
    const cards = [firstCard, ...remainingCards.filter((_, index) => (mask & (1 << index)) !== 0)];
    if (cards.length < 3) continue;

    const selectedIds = new Set(cards.map(({ id }) => id));
    const rest = hand.filter(({ id }) => !selectedIds.has(id));
    const remainderMelds = findValidMelds(rest, roundRank);
    if (remainderMelds === null) continue;

    if (isValidBook(cards, roundRank)) {
      return [{ type: "book", cardIds: cards.map(({ id }) => id) }, ...remainderMelds];
    }
    if (isValidRun(cards, roundRank)) {
      return [{ type: "run", cardIds: cards.map(({ id }) => id) }, ...remainderMelds];
    }
  }

  return null;
}
