export const suits = ["stars", "hearts", "clubs", "spades", "diamonds"] as const;
export type Suit = (typeof suits)[number];

export const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Rank = (typeof ranks)[number];
export const disconnectedPlayerKickDelayMs = 60_000;

export interface Card {
  id: string;
  rank: Rank | "joker";
  suit: Suit | "joker";
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  cardCount: number;
  connected: boolean;
  disconnectedAt: number | null;
  isHost: boolean;
}

export interface RevealedMeld {
  type: "book" | "run";
  cards: Card[];
}

export interface RevealedPlayerMelds {
  playerId: string;
  melds: RevealedMeld[];
}

export type GamePhase = "lobby" | "drawing" | "discarding" | "round-ended" | "game-ended" | "paused";

export interface ClientGameState {
  roomCode: string;
  version: number;
  phase: GamePhase;
  roundRank: Rank;
  players: PublicPlayer[];
  activePlayerId: string | null;
  dealerPlayerId: string | null;
  discardTop: Card | null;
  drawPileCount: number;
  hand: Card[];
  wentOutPlayerId: string | null;
  finalTurnPlayerIds: string[];
  revealedPlayerMelds: RevealedPlayerMelds[];
}

export interface MeldSubmission {
  cardIds: string[];
  type: "book" | "run";
}

export type DrawSource = "deck" | "discard";
