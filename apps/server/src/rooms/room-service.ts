import { randomBytes, randomUUID } from "node:crypto";
import type { Card, ClientGameState, DrawSource, GamePhase, MeldSubmission, Rank, RevealedMeld, SessionData } from "@cincoreyes/contracts";
import { createDeck, handScore, recycleDiscardPile, shuffle, validateMelds } from "@cincoreyes/game-engine";

interface PlayerState {
  id: string;
  name: string;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
  score: number;
  hand: Card[];
}

interface RoomState {
  code: string;
  version: number;
  phase: GamePhase;
  roundRank: Rank;
  players: PlayerState[];
  dealerIndex: number;
  activeIndex: number;
  drawPile: Card[];
  discardPile: Card[];
  wentOutPlayerId: string | null;
  finalTurnPlayerIds: Set<string>;
  revealedPlayerMelds: Map<string, RevealedMeld[]>;
  processedActions: Set<string>;
  phaseBeforePause: Exclude<GamePhase, "paused"> | null;
}

export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRoomCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (value) => roomAlphabet[value % roomAlphabet.length]).join("");
}

export class RoomService {
  private readonly rooms = new Map<string, RoomState>();
  private readonly sessions = new Map<string, { roomCode: string; playerId: string }>();

  create(playerName: string, socketId: string): SessionData {
    let code = createRoomCode();
    while (this.rooms.has(code)) code = createRoomCode();
    const player = this.createPlayer(playerName, socketId, true);
    const room: RoomState = {
      code,
      version: 1,
      phase: "lobby",
      roundRank: 3,
      players: [player],
      dealerIndex: 0,
      activeIndex: 0,
      drawPile: [],
      discardPile: [],
      wentOutPlayerId: null,
      finalTurnPlayerIds: new Set(),
      revealedPlayerMelds: new Map(),
      processedActions: new Set(),
      phaseBeforePause: null,
    };
    this.rooms.set(code, room);
    this.sessions.set(player.sessionToken, { roomCode: code, playerId: player.id });
    return { roomCode: code, playerId: player.id, sessionToken: player.sessionToken };
  }

  join(roomCode: string, playerName: string, socketId: string): SessionData {
    const room = this.getRoom(roomCode);
    if (room.phase !== "lobby") throw new GameError("GAME_STARTED", "La partie a déjà commencé.");
    if (room.players.length >= 7) throw new GameError("ROOM_FULL", "Cette salle est complète.");
    if (room.players.some((player) => player.name.localeCompare(playerName, undefined, { sensitivity: "base" }) === 0)) {
      throw new GameError("NAME_TAKEN", "Ce pseudo est déjà utilisé dans la salle.");
    }
    const player = this.createPlayer(playerName, socketId, false);
    room.players.push(player);
    this.sessions.set(player.sessionToken, { roomCode: room.code, playerId: player.id });
    this.bump(room);
    return { roomCode: room.code, playerId: player.id, sessionToken: player.sessionToken };
  }

  resume(sessionToken: string, socketId: string): SessionData {
    const session = this.sessions.get(sessionToken);
    if (!session) throw new GameError("SESSION_EXPIRED", "Cette session n’existe plus.");
    const room = this.getRoom(session.roomCode);
    const player = this.getPlayer(room, session.playerId);
    player.socketId = socketId;
    player.connected = true;
    if (room.phase === "paused") room.phase = room.phaseBeforePause ?? "drawing";
    room.phaseBeforePause = null;
    this.bump(room);
    return { ...session, sessionToken };
  }

  start(roomCode: string, playerId: string, actionId: string): void {
    const room = this.getRoom(roomCode);
    this.acceptAction(room, actionId);
    const player = this.getPlayer(room, playerId);
    if (!player.isHost) throw new GameError("HOST_ONLY", "Seul l’hôte peut lancer la partie.");
    if (room.players.length < 2) throw new GameError("NOT_ENOUGH_PLAYERS", "Il faut au moins deux joueurs.");
    if (room.phase !== "lobby") throw new GameError("INVALID_PHASE", "La partie est déjà lancée.");
    this.startRound(room);
  }

  draw(roomCode: string, playerId: string, actionId: string, source: DrawSource): void {
    const room = this.getRoom(roomCode);
    this.acceptAction(room, actionId);
    this.assertTurn(room, playerId, "drawing");
    const player = this.getPlayer(room, playerId);
    if (source === "discard") {
      const card = room.discardPile.pop();
      if (!card) throw new GameError("EMPTY_DISCARD", "La défausse est vide.");
      player.hand.push(card);
    } else {
      this.ensureDrawPile(room);
      const card = room.drawPile.pop();
      if (!card) throw new GameError("EMPTY_DECK", "La pioche est vide.");
      player.hand.push(card);
    }
    room.phase = "discarding";
    this.bump(room);
  }

  discard(roomCode: string, playerId: string, actionId: string, cardId: string): void {
    const room = this.getRoom(roomCode);
    this.acceptAction(room, actionId);
    this.assertTurn(room, playerId, "discarding");
    this.removeAndDiscard(room, this.getPlayer(room, playerId), cardId);
    this.finishTurn(room, playerId);
  }

  goOut(roomCode: string, playerId: string, actionId: string, melds: MeldSubmission[], discardCardId?: string): void {
    const room = this.getRoom(roomCode);
    this.acceptAction(room, actionId);
    this.assertTurn(room, playerId, ["drawing", "discarding"]);
    const player = this.getPlayer(room, playerId);
    if (room.phase === "discarding" && !discardCardId) {
      throw new GameError("DISCARD_REQUIRED", "Choisissez une carte à défausser avant de sortir.");
    }
    if (room.phase === "drawing" && discardCardId) {
      throw new GameError("INVALID_DISCARD", "Aucune défausse n’est nécessaire avant la pioche.");
    }
    const remainingHand = discardCardId ? player.hand.filter((card) => card.id !== discardCardId) : player.hand;
    if (discardCardId && remainingHand.length === player.hand.length) {
      throw new GameError("CARD_NOT_FOUND", "Cette carte n’est pas dans votre main.");
    }
    if (!validateMelds(remainingHand, melds, room.roundRank)) {
      throw new GameError("INVALID_MELDS", "Les groupes ne couvrent pas une main valide.");
    }
    const cardsById = new Map(remainingHand.map((card) => [card.id, card]));
    room.revealedPlayerMelds.set(
      playerId,
      melds.map((meld) => ({
        type: meld.type,
        cards: meld.cardIds.flatMap((cardId) => {
          const card = cardsById.get(cardId);
          return card ? [card] : [];
        }),
      })),
    );
    if (discardCardId) this.removeAndDiscard(room, player, discardCardId);
    player.hand = [];
    if (!room.wentOutPlayerId) {
      room.wentOutPlayerId = playerId;
      room.finalTurnPlayerIds = new Set(room.players.filter(({ id }) => id !== playerId).map(({ id }) => id));
    } else {
      room.finalTurnPlayerIds.delete(playerId);
    }
    this.finishTurn(room, playerId);
  }

  disconnect(socketId: string): string | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((candidate) => candidate.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.socketId = null;
      if (room.phase !== "lobby" && room.phase !== "game-ended" && room.phase !== "paused") {
        room.phaseBeforePause = room.phase;
        room.phase = "paused";
      }
      this.bump(room);
      return room.code;
    }
    return null;
  }

  getSocketIds(roomCode: string): string[] {
    return this.getRoom(roomCode).players.flatMap(({ socketId }) => (socketId ? [socketId] : []));
  }

  findPlayerBySocket(socketId: string): { roomCode: string; playerId: string } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((candidate) => candidate.socketId === socketId);
      if (player) return { roomCode: room.code, playerId: player.id };
    }
    return null;
  }

  view(roomCode: string, playerId: string): ClientGameState {
    const room = this.getRoom(roomCode);
    const viewer = this.getPlayer(room, playerId);
    return {
      roomCode: room.code,
      version: room.version,
      phase: room.phase,
      roundRank: room.roundRank,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        cardCount: player.hand.length,
        connected: player.connected,
        isHost: player.isHost,
      })),
      activePlayerId: room.phase === "lobby" ? null : (room.players[room.activeIndex]?.id ?? null),
      dealerPlayerId: room.phase === "lobby" ? null : (room.players[room.dealerIndex]?.id ?? null),
      discardTop: room.discardPile.at(-1) ?? null,
      drawPileCount: room.drawPile.length,
      hand: viewer.hand,
      wentOutPlayerId: room.wentOutPlayerId,
      finalTurnPlayerIds: [...room.finalTurnPlayerIds],
      revealedPlayerMelds: [...room.revealedPlayerMelds].map(([revealedPlayerId, melds]) => ({
        playerId: revealedPlayerId,
        melds,
      })),
    };
  }

  private createPlayer(name: string, socketId: string, isHost: boolean): PlayerState {
    return {
      id: randomUUID(),
      name,
      sessionToken: randomBytes(32).toString("base64url"),
      socketId,
      connected: true,
      isHost,
      score: 0,
      hand: [],
    };
  }

  private startRound(room: RoomState): void {
    const deck = shuffle(createDeck());
    room.players.forEach((player) => {
      player.hand = [];
    });
    for (let cardIndex = 0; cardIndex < room.roundRank; cardIndex += 1) {
      for (const player of room.players) {
        const card = deck.pop();
        if (card) player.hand.push(card);
      }
    }
    const firstDiscard = deck.pop();
    room.drawPile = deck;
    room.discardPile = firstDiscard ? [firstDiscard] : [];
    room.activeIndex = (room.dealerIndex + 1) % room.players.length;
    room.wentOutPlayerId = null;
    room.finalTurnPlayerIds.clear();
    room.revealedPlayerMelds.clear();
    room.processedActions.clear();
    room.phase = "drawing";
    this.bump(room);
  }

  private finishTurn(room: RoomState, playerId: string): void {
    if (room.wentOutPlayerId) room.finalTurnPlayerIds.delete(playerId);
    if (room.wentOutPlayerId && room.finalTurnPlayerIds.size === 0) {
      this.finishRound(room);
      return;
    }
    room.activeIndex = (room.activeIndex + 1) % room.players.length;
    room.phase = "drawing";
    this.bump(room);
  }

  private finishRound(room: RoomState): void {
    room.players.forEach((player) => {
      player.score += handScore(player.hand, room.roundRank);
    });
    if (room.roundRank === 13) {
      room.phase = "game-ended";
      this.bump(room);
      return;
    }
    room.roundRank = (room.roundRank + 1) as Rank;
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
    this.startRound(room);
  }

  private removeAndDiscard(room: RoomState, player: PlayerState, cardId: string): void {
    const index = player.hand.findIndex((card) => card.id === cardId);
    if (index < 0) throw new GameError("CARD_NOT_FOUND", "Cette carte n’est pas dans votre main.");
    const [card] = player.hand.splice(index, 1);
    if (card) room.discardPile.push(card);
  }

  private ensureDrawPile(room: RoomState): void {
    if (room.drawPile.length > 0) return;
    const recycled = recycleDiscardPile(room.discardPile);
    room.drawPile = recycled.drawPile;
    room.discardPile = recycled.discardPile;
  }

  private assertTurn(room: RoomState, playerId: string, expectedPhase: GamePhase | readonly GamePhase[]): void {
    if (room.phase === "paused") throw new GameError("GAME_PAUSED", "La partie attend un joueur déconnecté.");
    const expectedPhases = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
    if (!expectedPhases.includes(room.phase)) throw new GameError("INVALID_PHASE", "Cette action n’est pas disponible maintenant.");
    if (room.players[room.activeIndex]?.id !== playerId) throw new GameError("NOT_YOUR_TURN", "Ce n’est pas votre tour.");
  }

  private acceptAction(room: RoomState, actionId: string): void {
    if (room.processedActions.has(actionId)) throw new GameError("DUPLICATE_ACTION", "Cette action a déjà été traitée.");
    room.processedActions.add(actionId);
    if (room.processedActions.size > 200) room.processedActions.delete(room.processedActions.values().next().value ?? "");
  }

  private getRoom(code: string): RoomState {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new GameError("ROOM_NOT_FOUND", "Salle introuvable.");
    return room;
  }

  private getPlayer(room: RoomState, playerId: string): PlayerState {
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new GameError("PLAYER_NOT_FOUND", "Joueur introuvable.");
    return player;
  }

  private bump(room: RoomState): void {
    room.version += 1;
  }
}
