import type { AddressInfo } from "node:net";
import type { ClientGameState, CommandResult, SessionData } from "@cincoreyes/contracts";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "./server.js";

type TestSocket = Socket;

function waitForState(socket: TestSocket, predicate: (state: ClientGameState) => boolean): Promise<ClientGameState> {
  return new Promise((resolve) => {
    const listener = (state: ClientGameState) => {
      if (!predicate(state)) return;
      socket.off("game:state", listener);
      resolve(state);
    };
    socket.on("game:state", listener);
  });
}

function command<T>(socket: TestSocket, event: string, payload: unknown): Promise<CommandResult<T>> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

describe("multiplayer server", () => {
  const clients: TestSocket[] = [];
  const servers: ReturnType<typeof createGameServer>[] = [];

  afterEach(async () => {
    clients.forEach((client) => client.disconnect());
    await Promise.all(
      servers.map(
        ({ httpServer, io }) =>
          new Promise<void>((resolve) => {
            io.close(() => httpServer.close(() => resolve()));
          }),
      ),
    );
  });

  it("keeps hands private and rejects actions outside the active turn", async () => {
    const server = createGameServer("*");
    servers.push(server);
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    const port = (server.httpServer.address() as AddressInfo).port;
    const host = createClient(`http://localhost:${port}`);
    const guest = createClient(`http://localhost:${port}`);
    clients.push(host, guest);
    await Promise.all([
      new Promise<void>((resolve) => host.once("connect", () => resolve())),
      new Promise<void>((resolve) => guest.once("connect", () => resolve())),
    ]);

    const created = await command<SessionData>(host, "room:create", { playerName: "Alice" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const joined = await command<SessionData>(guest, "room:join", { roomCode: created.data.roomCode, playerName: "Bob" });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;

    const hostStatePromise = waitForState(host, ({ phase }) => phase === "drawing");
    const guestStatePromise = waitForState(guest, ({ phase }) => phase === "drawing");
    const started = await command(host, "game:start", { actionId: crypto.randomUUID() });
    expect(started.ok).toBe(true);
    const [hostState, guestState] = await Promise.all([hostStatePromise, guestStatePromise]);
    expect(hostState.hand).toHaveLength(3);
    expect(guestState.hand).toHaveLength(3);
    expect(hostState.hand).not.toEqual(guestState.hand);
    expect(hostState.players.find(({ id }) => id === joined.data.playerId)?.cardCount).toBe(3);

    const inactive = hostState.activePlayerId === created.data.playerId ? guest : host;
    const rejected = await command(inactive, "turn:draw", { actionId: crypto.randomUUID(), source: "deck" });
    expect(rejected).toMatchObject({ ok: false, code: "NOT_YOUR_TURN" });

    const active = hostState.activePlayerId === created.data.playerId ? host : guest;
    const drawnStatePromise = waitForState(active, ({ phase, hand }) => phase === "discarding" && hand.length === 4);
    const drawn = await command(active, "turn:draw", { actionId: crypto.randomUUID(), source: "discard" });
    expect(drawn.ok).toBe(true);
    const drawnState = await drawnStatePromise;
    const cardToDiscard = drawnState.hand[0];
    expect(cardToDiscard).toBeDefined();

    const discardedStatePromise = waitForState(active, ({ phase, hand }) => phase === "drawing" && hand.length === 3);
    const discarded = await command(active, "turn:discard", {
      actionId: crypto.randomUUID(),
      cardId: cardToDiscard!.id,
    });
    expect(discarded.ok).toBe(true);
    await discardedStatePromise;
  });
});
