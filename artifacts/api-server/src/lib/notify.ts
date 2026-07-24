import { db, notificationsTable } from "@workspace/db";
import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setIo(io: SocketIOServer) {
  _io = io;
}

export async function sendNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
) {
  const [notif] = await db
    .insert(notificationsTable)
    .values({ user_id: userId, type, title, message, data: data ?? null })
    .returning();

  // Push real-time via Socket.IO if socket is connected
  if (_io && notif) {
    _io.to(`user:${userId}`).emit("notification", notif);
  }

  return notif;
}
