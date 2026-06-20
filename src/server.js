const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { initDb } = require("./config/db");
const { sheetService } = require("./config/di");
const authRoutes = require("./routes/auth");
const sheetRoutes = require("./routes/sheet");
const { startScheduler } = require("./services/scheduler");

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS settings - dynamic from env, credentials true is mandatory for cookies
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
console.log(`Configuring CORS for origin: ${corsOrigin}`);

const corsOptions = {
  origin: corsOrigin.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(
  cookieParser(
    process.env.COOKIE_SECRET || "dev_cookie_secret_key_sync_pad_12345",
  ),
);

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/sheets", sheetRoutes);

// Socket.io Setup
const io = socketIo(server, {
  cors: {
    origin: corsOrigin.split(","),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Socket state tracking
const sheetLocks = new Map(); // sheetId -> { socketId, username }

io.on("connection", (socket) => {
  console.log(`Device connected: ${socket.id}`);
  socket.viewingSheetId = null;
  socket.username = null;

  // Helper to update lock on sheet change/disconnect
  const checkAndTransferLock = async (sheetId) => {
    const lock = sheetLocks.get(sheetId);
    if (!lock || lock.socketId !== socket.id) return; // Only process if this socket held the lock

    // Find other sockets in the sheet room
    const socketsInRoom = await io.in(`sheet_${sheetId}`).fetchSockets();
    // Filter out the current socket since it is leaving/disconnecting
    const eligibleSockets = socketsInRoom.filter((s) => s.id !== socket.id);

    if (eligibleSockets.length > 0) {
      // Assign to the first eligible socket
      const nextSocket = eligibleSockets[0];
      sheetLocks.set(sheetId, {
        socketId: nextSocket.id,
        username: nextSocket.username,
      });
      io.to(`sheet_${sheetId}`).emit("sheet_lock_status", {
        isLocked: true,
        lockedBy: nextSocket.username,
        lockedBySocketId: nextSocket.id,
      });
      console.log(
        `Lock for sheet ${sheetId} transferred to ${nextSocket.username} (${nextSocket.id})`,
      );
    } else {
      sheetLocks.delete(sheetId);
      console.log(`Lock for sheet ${sheetId} released (no active viewers)`);
    }
  };

  // Client notifies which sheet they are actively viewing
  socket.on("client_viewing_sheet", async ({ sheetId, username }) => {
    const prevSheetId = socket.viewingSheetId;

    // Leave previous sheet rooms
    if (prevSheetId) {
      socket.leave(`sheet_${prevSheetId}`);
      await checkAndTransferLock(prevSheetId);
    }

    socket.viewingSheetId = sheetId;
    socket.username = username;
    socket.join(`sheet_${sheetId}`);
    console.log(
      `Device ${socket.id} (${username}) is now viewing sheet: ${sheetId}`,
    );

    // Check if sheet is live
    try {
      const sheet = await sheetService.getSheetById(sheetId);
      if (sheet && sheet.status === "live") {
        const lock = sheetLocks.get(sheetId);
        let lockActive = false;

        if (lock) {
          // Verify if lock holder is still connected and in the room
          const activeSocket = io.sockets.sockets.get(lock.socketId);
          if (activeSocket && activeSocket.viewingSheetId === sheetId) {
            lockActive = true;
          }
        }

        if (lockActive) {
          // Tell this socket who has the lock
          socket.emit("sheet_lock_status", {
            isLocked: true,
            lockedBy: lock.username,
            lockedBySocketId: lock.socketId,
          });
        } else {
          // Auto-assign lock to the joining user
          sheetLocks.set(sheetId, {
            socketId: socket.id,
            username: username,
          });
          io.to(`sheet_${sheetId}`).emit("sheet_lock_status", {
            isLocked: true,
            lockedBy: username,
            lockedBySocketId: socket.id,
          });
        }
      } else {
        // Not a live sheet, send status saying it's not locked
        socket.emit("sheet_lock_status", {
          isLocked: false,
          lockedBy: null,
          lockedBySocketId: null,
        });
      }
    } catch (err) {
      console.error("Error in client_viewing_sheet lock check:", err);
    }
  });

  // Client requests to take control of the editing lock
  socket.on("client_take_control_sheet", async ({ sheetId, username }) => {
    try {
      const sheet = await sheetService.getSheetById(sheetId);
      if (sheet && sheet.status === "live") {
        sheetLocks.set(sheetId, {
          socketId: socket.id,
          username: username,
        });
        io.to(`sheet_${sheetId}`).emit("sheet_lock_status", {
          isLocked: true,
          lockedBy: username,
          lockedBySocketId: socket.id,
        });
        console.log(
          `User ${username} (${socket.id}) took control of sheet ${sheetId}`,
        );
      }
    } catch (err) {
      console.error("Error in client_take_control_sheet:", err);
    }
  });

  // Client sends real-time editing keystrokes
  socket.on("client_edit_sheet", async ({ sheetId, content }) => {
    try {
      // Server-side lock enforcement: check if there's a lock and if this socket has it
      const lock = sheetLocks.get(sheetId);
      if (lock && lock.socketId !== socket.id) {
        console.warn(
          `Block unauthorized edit from ${socket.id} for sheet ${sheetId}`,
        );
        return; // Reject edits if not lock holder
      }

      // 1. Broadcast the content update immediately to all other clients viewing the SAME sheet
      socket.to(`sheet_${sheetId}`).emit("server_sheet_content_updated", {
        sheetId,
        content,
      });

      // 2. Fetch sheet details to get the title for background notifications
      const sheet = await sheetService.getSheetById(sheetId);
      const title = sheet ? sheet.title : "Untitled";

      // 3. Broadcast background notification to all OTHER devices NOT viewing this sheet
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.id !== socket.id && s.viewingSheetId !== sheetId) {
          s.emit("server_sheet_background_updated", {
            sheetId,
            title,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Persist the changes to the SQLite database
      await sheetService.updateSheetContent(sheetId, content);
    } catch (err) {
      console.error("Error handling client_edit_sheet:", err);
    }
  });

  // Trigger list refresh across all devices when sheets are saved, deleted, etc.
  socket.on("client_sheets_list_modified", () => {
    io.emit("sheets_list_updated");
  });

  socket.on("disconnect", async () => {
    console.log(`Device disconnected: ${socket.id}`);
    if (socket.viewingSheetId) {
      await checkAndTransferLock(socket.viewingSheetId);
    }
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Initialize SQLite Tables & Seed default data
    await initDb();
    console.log("SQLite database initialized successfully.");

    // 2. Start the cron scheduler for auto-archiving
    startScheduler(io);

    // 3. Listen on port
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`SyncPad Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
