import { createServer } from "node:http";
import type { ClientToServerEvents, ServerToClientEvents } from "@cincoreyes/contracts";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { RoomService } from "./rooms/room-service.js";
import { registerHandlers } from "./socket/register-handlers.js";

export function createGameServer(clientOrigin: string | string[] = "http://localhost:5173") {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_request, response) => response.json({ status: "ok" }));

  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: clientOrigin },
    maxHttpBufferSize: 32_000,
  });
  const rooms = new RoomService();
  io.on("connection", (socket) => registerHandlers(io, socket, rooms));

  return { app, httpServer, io };
}
