import { createGameServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const { httpServer } = createGameServer(clientOrigins);

httpServer.listen(port, () => {
  console.log(`Cinq Royaumes server listening on http://localhost:${port}`);
});

function shutdown(): void {
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
