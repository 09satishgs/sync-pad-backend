const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const sheetRoutes = require("./routes/sheet");
const workspaceRoutes = require("./routes/workspace");
const adminRoutes = require("./routes/admin");

const app = express();

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

// Mount REST Routes
app.use("/syncpad/api/auth", authRoutes);
app.use("/syncpad/api/workspaces", workspaceRoutes);
app.use("/syncpad/api/workspaces/:workspaceId/sheets", sheetRoutes);
app.use("/syncpad/api/admin", adminRoutes);

module.exports = app;
