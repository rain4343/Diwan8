import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app, { sessionMiddleware } from "./app";
import { setupSocketIO } from "./socket";
import { logger } from "./lib/logger";
import { seedPermissions } from "./lib/seedPermissions";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  path: "/api/socket.io",
  cors: { origin: true, credentials: true },
});

// Share Express session with Socket.IO
io.engine.use(sessionMiddleware);

setupSocketIO(io);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  // Ensure all permission rows exist in the DB (idempotent)
  seedPermissions().catch((e) => logger.warn({ err: e }, "seedPermissions failed"));
});
