import type { ClientToServerEvents, CommandResult, ServerToClientEvents, SessionData } from "@cincoreyes/contracts";
import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { GameError, RoomService } from "../rooms/room-service.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const nameSchema = z.string().trim().min(1).max(24);
const roomSchema = z.string().trim().toUpperCase().length(6);
const actionSchema = z.string().uuid();
const meldSchema = z.object({ cardIds: z.array(z.string()).min(3), type: z.enum(["book", "run"]) });

function failure(error: unknown): CommandResult<never> {
  if (error instanceof GameError) return { ok: false, code: error.code, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, code: "INVALID_INPUT", message: "Les données envoyées sont invalides." };
  console.error(error);
  return { ok: false, code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." };
}

export function registerHandlers(io: GameServer, socket: GameSocket, rooms: RoomService): void {
  const broadcast = (roomCode: string) => {
    for (const socketId of rooms.getSocketIds(roomCode)) {
      const identity = rooms.findPlayerBySocket(socketId);
      if (identity) io.to(socketId).emit("game:state", rooms.view(identity.roomCode, identity.playerId));
    }
  };

  const sessionCommand = (execute: () => SessionData, acknowledge: (result: CommandResult<SessionData>) => void) => {
    try {
      const session = execute();
      socket.join(session.roomCode);
      acknowledge({ ok: true, data: session });
      broadcast(session.roomCode);
    } catch (error) {
      acknowledge(failure(error));
    }
  };

  const gameCommand = (
    payload: unknown,
    schema: z.ZodType,
    execute: (identity: { roomCode: string; playerId: string }, parsed: any) => void,
    acknowledge: (result: CommandResult) => void,
  ) => {
    try {
      const parsed = schema.parse(payload);
      const identity = rooms.findPlayerBySocket(socket.id);
      if (!identity) throw new GameError("NOT_IN_ROOM", "Vous n’êtes pas dans une salle.");
      execute(identity, parsed);
      acknowledge({ ok: true, data: undefined });
      broadcast(identity.roomCode);
    } catch (error) {
      acknowledge(failure(error));
    }
  };

  socket.on("room:create", (payload, acknowledge) =>
    sessionCommand(() => rooms.create(nameSchema.parse(payload.playerName), socket.id), acknowledge),
  );
  socket.on("room:join", (payload, acknowledge) =>
    sessionCommand(() => rooms.join(roomSchema.parse(payload.roomCode), nameSchema.parse(payload.playerName), socket.id), acknowledge),
  );
  socket.on("room:resume", (payload, acknowledge) =>
    sessionCommand(() => rooms.resume(z.string().min(20).parse(payload.sessionToken), socket.id), acknowledge),
  );
  socket.on("game:start", (payload, acknowledge) =>
    gameCommand(
      payload,
      z.object({ actionId: actionSchema }),
      (identity, parsed) => rooms.start(identity.roomCode, identity.playerId, parsed.actionId),
      acknowledge,
    ),
  );
  socket.on("turn:draw", (payload, acknowledge) =>
    gameCommand(
      payload,
      z.object({ actionId: actionSchema, source: z.enum(["deck", "discard"]) }),
      (identity, parsed) => rooms.draw(identity.roomCode, identity.playerId, parsed.actionId, parsed.source),
      acknowledge,
    ),
  );
  socket.on("turn:discard", (payload, acknowledge) =>
    gameCommand(
      payload,
      z.object({ actionId: actionSchema, cardId: z.string() }),
      (identity, parsed) => rooms.discard(identity.roomCode, identity.playerId, parsed.actionId, parsed.cardId),
      acknowledge,
    ),
  );
  socket.on("turn:go-out", (payload, acknowledge) =>
    gameCommand(
      payload,
      z.object({ actionId: actionSchema, melds: z.array(meldSchema).min(1), discardCardId: z.string().optional() }),
      (identity, parsed) => rooms.goOut(identity.roomCode, identity.playerId, parsed.actionId, parsed.melds, parsed.discardCardId),
      acknowledge,
    ),
  );

  socket.on("disconnect", () => {
    const roomCode = rooms.disconnect(socket.id);
    if (roomCode) broadcast(roomCode);
  });
}
