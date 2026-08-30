import type { Card } from "@cincoreyes/contracts";
import { describe, expect, it } from "vitest";
import { createDeck, deadwoodScore, findValidMelds, handScore, isValidBook, isValidRun } from "./index.js";

function card(id: string, rank: Card["rank"], suit: Card["suit"]): Card {
  return { id, rank, suit };
}

describe("Five Kings rules", () => {
  it("creates two complete 58-card decks with unique identifiers", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(116);
    expect(new Set(deck.map(({ id }) => id))).toHaveLength(116);
  });

  it("validates books using the round rank as wild", () => {
    expect(isValidBook([card("a", 8, "hearts"), card("b", 8, "stars"), card("wild", 5, "clubs")], 5)).toBe(true);
  });

  it("fills gaps in runs with wild cards", () => {
    expect(isValidRun([card("a", 6, "diamonds"), card("wild", "joker", "joker"), card("b", 8, "diamonds")], 3)).toBe(true);
  });

  it("rejects duplicate natural ranks in runs", () => {
    expect(isValidRun([card("a", 6, "diamonds"), card("b", 6, "diamonds"), card("c", 7, "diamonds")], 3)).toBe(false);
  });

  it("scores jokers and round wild cards", () => {
    expect(handScore([card("joker", "joker", "joker"), card("wild", 7, "clubs"), card("natural", 10, "stars")], 7)).toBe(80);
  });

  it("scores only cards outside valid melds", () => {
    const hand = [
      card("jack-stars", 11, "stars"),
      card("jack-hearts", 11, "hearts"),
      card("jack-clubs", 11, "clubs"),
      card("joker", "joker", "joker"),
      card("five", 5, "diamonds"),
    ];

    expect(deadwoodScore(hand, 3)).toBe(5);
  });

  it("chooses the meld arrangement with the lowest remaining score", () => {
    const hand = [
      card("ten-stars", 10, "stars"),
      card("ten-hearts", 10, "hearts"),
      card("ten-clubs", 10, "clubs"),
      card("jack-stars", 11, "stars"),
      card("queen-stars", 12, "stars"),
      card("joker", "joker", "joker"),
    ];

    expect(deadwoodScore(hand, 3)).toBe(0);
  });

  it("automatically finds a book after choosing the discard", () => {
    const hand = [card("spade-five", 5, "spades"), card("heart-five", 5, "hearts"), card("diamond-five", 5, "diamonds")];

    expect(findValidMelds(hand, 3)).toEqual([
      {
        type: "book",
        cardIds: ["spade-five", "heart-five", "diamond-five"],
      },
    ]);
  });

  it("automatically partitions a hand into multiple groups", () => {
    const hand = [
      card("heart-five", 5, "hearts"),
      card("spade-five", 5, "spades"),
      card("diamond-five", 5, "diamonds"),
      card("star-seven", 7, "stars"),
      card("star-eight", 8, "stars"),
      card("star-nine", 9, "stars"),
    ];

    expect(findValidMelds(hand, 3)).toHaveLength(2);
  });
});
