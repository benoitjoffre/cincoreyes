import type { Card, GamePhase } from "@cincoreyes/contracts";
import { describe, expect, it } from "vitest";
import { RoomService } from "./room-service.js";

interface MutableTestRoom {
  phase: GamePhase;
  activeIndex: number;
  players: Array<{ id: string; hand: Card[] }>;
  discardPile: Card[];
}

describe("RoomService revealed melds", () => {
  it("reveals the outgoing player's melds to every player", () => {
    const service = new RoomService();
    const host = service.create("Alice", "host-socket");
    const guest = service.join(host.roomCode, "Bob", "guest-socket");
    service.start(host.roomCode, host.playerId, crypto.randomUUID());

    const rooms = (service as unknown as { rooms: Map<string, MutableTestRoom> }).rooms;
    const room = rooms.get(host.roomCode);
    expect(room).toBeDefined();
    if (!room) return;

    const activePlayer = room.players[room.activeIndex];
    expect(activePlayer).toBeDefined();
    if (!activePlayer) return;

    const book: Card[] = [
      { id: "seven-stars", rank: 7, suit: "stars" },
      { id: "seven-hearts", rank: 7, suit: "hearts" },
      { id: "seven-clubs", rank: 7, suit: "clubs" },
    ];
    const discard: Card = { id: "nine-spades", rank: 9, suit: "spades" };
    activePlayer.hand = [...book, discard];
    room.phase = "discarding";

    service.goOut(host.roomCode, activePlayer.id, crypto.randomUUID(), [{ type: "book", cardIds: book.map(({ id }) => id) }], discard.id);

    const hostView = service.view(host.roomCode, host.playerId);
    const guestView = service.view(host.roomCode, guest.playerId);
    expect(hostView.wentOutPlayerId).toBe(activePlayer.id);
    expect(hostView.revealedPlayerMelds).toEqual([{ playerId: activePlayer.id, melds: [{ type: "book", cards: book }] }]);
    expect(guestView.revealedPlayerMelds).toEqual(hostView.revealedPlayerMelds);

    const waitingPlayerId = activePlayer.id === host.playerId ? guest.playerId : host.playerId;
    const waitingPlayerView = waitingPlayerId === host.playerId ? hostView : guestView;
    expect(waitingPlayerView.hand).toHaveLength(3);
    expect(waitingPlayerView.hand).not.toEqual(book);
  });

  it("allows a complete hand to go out before drawing", () => {
    const service = new RoomService();
    const host = service.create("Alice", "host-socket");
    service.join(host.roomCode, "Bob", "guest-socket");
    service.start(host.roomCode, host.playerId, crypto.randomUUID());

    const rooms = (service as unknown as { rooms: Map<string, MutableTestRoom> }).rooms;
    const room = rooms.get(host.roomCode);
    expect(room).toBeDefined();
    if (!room) return;

    const activePlayer = room.players[room.activeIndex];
    expect(activePlayer).toBeDefined();
    if (!activePlayer) return;

    const book: Card[] = [
      { id: "eight-stars", rank: 8, suit: "stars" },
      { id: "eight-hearts", rank: 8, suit: "hearts" },
      { id: "eight-clubs", rank: 8, suit: "clubs" },
    ];
    activePlayer.hand = book;
    const discardBeforeGoingOut = room.discardPile.at(-1);

    service.goOut(host.roomCode, activePlayer.id, crypto.randomUUID(), [{ type: "book", cardIds: book.map(({ id }) => id) }]);

    const activeView = service.view(host.roomCode, activePlayer.id);
    expect(activeView.hand).toEqual([]);
    expect(activeView.discardTop).toEqual(discardBeforeGoingOut);
    expect(activeView.revealedPlayerMelds).toEqual([{ playerId: activePlayer.id, melds: [{ type: "book", cards: book }] }]);
  });
});
