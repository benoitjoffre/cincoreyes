import type { ClientGameState, DrawSource, MeldSubmission } from "./game.js";

export type CommandResult<T = undefined> = { ok: true; data: T } | { ok: false; code: string; message: string };

export interface SessionData {
  roomCode: string;
  playerId: string;
  sessionToken: string;
}

export interface ClientToServerEvents {
  "room:create": (payload: { playerName: string }, acknowledge: (result: CommandResult<SessionData>) => void) => void;
  "room:join": (payload: { roomCode: string; playerName: string }, acknowledge: (result: CommandResult<SessionData>) => void) => void;
  "room:resume": (payload: { sessionToken: string }, acknowledge: (result: CommandResult<SessionData>) => void) => void;
  "game:start": (payload: { actionId: string }, acknowledge: (result: CommandResult) => void) => void;
  "turn:draw": (payload: { actionId: string; source: DrawSource }, acknowledge: (result: CommandResult) => void) => void;
  "turn:discard": (payload: { actionId: string; cardId: string }, acknowledge: (result: CommandResult) => void) => void;
  "turn:go-out": (
    payload: { actionId: string; melds: MeldSubmission[]; discardCardId: string },
    acknowledge: (result: CommandResult) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "game:state": (state: ClientGameState) => void;
  "game:error": (error: { code: string; message: string }) => void;
}
