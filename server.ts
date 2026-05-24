/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Attach Socket.io to the server with generic CORS allowance
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Type definition for players in the waiting queue
  interface QueuePlayer {
    socketId: string;
    role: 'cat' | 'rat';
  }

  // Separate Cat and Rat waiting queues to strict 1v1 pairing
  let catQueue: QueuePlayer[] = [];
  let ratQueue: QueuePlayer[] = [];

  // Helper routine to safely remove a player from all waiting queues
  const removePlayerFromQueues = (socketId: string) => {
    catQueue = catQueue.filter(p => p.socketId !== socketId);
    ratQueue = ratQueue.filter(p => p.socketId !== socketId);
  };

  /**
   * Core Matchmaking Logic:
   * Generates a 1v1 pair if both queues have at least one candidate.
   * Cat can never be paired with Cat, and Rat can never be paired with Rat.
   * Creates a private room ID (UUID) and broadcasts 'matchFound' to both participants.
   */
  const tryMatchPlayers = () => {
    if (catQueue.length > 0 && ratQueue.length > 0) {
      // Pop players from FIFO queues
      const catPlayer = catQueue.shift()!;
      const ratPlayer = ratQueue.shift()!;

      // Create a unique private room ID (UUID)
      const roomId = crypto.randomUUID();

      const catSocket = io.sockets.sockets.get(catPlayer.socketId);
      const ratSocket = io.sockets.sockets.get(ratPlayer.socketId);

      if (catSocket && ratSocket) {
        // Force sockets to join the matched room
        catSocket.join(roomId);
        ratSocket.join(roomId);

        // Map session details to sockets for reconnection/disconnection handling
        (catSocket as any).roomId = roomId;
        (catSocket as any).opponentId = ratPlayer.socketId;
        (ratSocket as any).roomId = roomId;
        (ratSocket as any).opponentId = catPlayer.socketId;

        // Emit matchFound events with respective asymmetrical roles
        catSocket.emit("matchFound", {
          roomId,
          role: "cat",
          opponentId: ratPlayer.socketId
        });

        ratSocket.emit("matchFound", {
          roomId,
          role: "rat",
          opponentId: catPlayer.socketId
        });

        console.log(`[MATCHMAKER] Matched Room: ${roomId} | Cat (${catPlayer.socketId}) <-> Rat (${ratPlayer.socketId})`);
      } else {
        // If either socket disconnected or was invalidated, re-queue the one that is still active
        if (catSocket && !ratSocket) {
          catQueue.unshift(catPlayer);
        } else if (!catSocket && ratSocket) {
          ratQueue.unshift(ratPlayer);
        }
      }
    }
  };

  io.on("connection", (socket) => {
    console.log(`[CONNECTION] User connected: ${socket.id}`);

    // Listening for player entering matchmaking with a specific role
    socket.on("joinQueue", (data: { role: 'cat' | 'rat' }) => {
      // Clear any pre-existing queue registration for safety
      removePlayerFromQueues(socket.id);

      console.log(`[QUEUE] Player ${socket.id} joins as: ${data.role}`);

      if (data.role === "cat") {
        catQueue.push({ socketId: socket.id, role: "cat" });
      } else if (data.role === "rat") {
        ratQueue.push({ socketId: socket.id, role: "rat" });
      }

      // Check if a pair is available immediately
      tryMatchPlayers();
    });

    // Handle cancel queue / leave matchmaking
    socket.on("leaveQueue", () => {
      console.log(`[QUEUE] Player left queue: ${socket.id}`);
      removePlayerFromQueues(socket.id);
    });

    // Live asymmetrical position / movement updates
    socket.on("playerUpdate", (data: { roomId: string; x: number; y: number; tx: number; ty: number; vx: number; vy: number; dir?: string }) => {
      socket.to(data.roomId).emit("opponentUpdate", data);
    });

    // Relay placement of baits or traps between opponents
    socket.on("trapPlaced", (data: { roomId: string; x: number; y: number; id: string }) => {
      socket.to(data.roomId).emit("opponentTrapPlaced", data);
    });

    // Sync game-over states or actions
    socket.on("gameStateChange", (data: { roomId: string; state: string; details?: any }) => {
      socket.to(data.roomId).emit("opponentGameStateChange", data);
    });

    // Connection loss cleanup: remove from queues & inform opponents
    socket.on("disconnect", () => {
      console.log(`[DISCONNECT] User disconnected: ${socket.id}`);
      removePlayerFromQueues(socket.id);

      const roomId = (socket as any).roomId;
      const opponentId = (socket as any).opponentId;

      if (roomId && opponentId) {
        io.to(opponentId).emit("opponentDisconnected");
        const oppSocket = io.sockets.sockets.get(opponentId);
        if (oppSocket) {
          oppSocket.leave(roomId);
          delete (oppSocket as any).roomId;
          delete (oppSocket as any).opponentId;
        }
      }
    });
  });

  // Keep routing endpoints safe
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      playersSearchingCats: catQueue.length,
      playersSearchingRats: ratQueue.length
    });
  });

  // Set up Vite as dev middleware or serve pre-compiled static content in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Matchmaker & Game server listening on http://localhost:${PORT}`);
  });
}

startServer();
