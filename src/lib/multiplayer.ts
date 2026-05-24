/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentRoomId: string | null = null;
let currentRole: "cat" | "rat" | null = null;

export interface MatchData {
  roomId: string;
  role: "cat" | "rat";
  opponentId: string;
}

/**
 * Singleton socket client resolver.
 * Ensures the socket connects to Port 3000 where our Express server resides.
 */
export function getSocket(): Socket | null {
  return socket;
}

export function getCurrentRoomId(): string | null {
  return currentRoomId;
}

export function getCurrentRole(): "cat" | "rat" | null {
  return currentRole;
}

export function setCurrentRoomDetails(roomId: string | null, role: "cat" | "rat" | null) {
  currentRoomId = roomId;
  currentRole = role;
}

/**
 * Initializes and establishes the Socket.io connection.
 */
export function connectMultiplayer(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("[SOCKET] Connected! Socket ID:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("[SOCKET] Disconnected from server.");
    });
  }
  return socket;
}

/**
 * Closes the socket connection and cleans up references.
 */
export function disconnectMultiplayer() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentRoomId = null;
  currentRole = null;
}

/**
 * Enqueues the player into the matchmaking process with the designated role.
 */
export function joinAsymmetricQueue(role: "cat" | "rat") {
  const s = connectMultiplayer();
  s.emit("joinQueue", { role });
  console.log(`[SOCKET] Enlisted in queue as: ${role}`);
}

/**
 * Cancels active waiting or leaves search.
 */
export function leaveAsymmetricQueue() {
  if (socket) {
    socket.emit("leaveQueue");
    console.log("[SOCKET] Withdrew from waiting queue");
  }
}
