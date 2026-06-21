const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
const app = require("./app");
const { initDb } = require("./config/db");
const { registerSocketHandlers } = require("./sockets/socketHandler");
const { startScheduler } = require("./services/scheduler");

dotenv.config();

const server = http.createServer(app);

// Socket.io Setup
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const io = socketIo(server, {
  cors: {
    origin: corsOrigin.split(","),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Register WebSocket Event Handlers
registerSocketHandlers(io);

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Initialize SQLite Database & recreate tables
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
