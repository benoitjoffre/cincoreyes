import { createGameServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);
const clientOriginConfig = [process.env.CLIENT_ORIGIN, process.env.CLIENT_HOST].filter(Boolean).join(",") || "http://localhost:5173";
const clientOrigins = clientOriginConfig
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => (/^https?:\/\//.test(origin) ? origin : `https://${origin}`));
const { httpServer } = createGameServer(clientOrigins);

httpServer.listen(port, () => {
  console.log(`Cinq Royaumes server listening on http://localhost:${port}`);
});

function shutdown(): void {
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
