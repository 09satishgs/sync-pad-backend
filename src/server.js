const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb } = require('./config/db');
const { sheetService } = require('./config/di');
const authRoutes = require('./routes/auth');
const sheetRoutes = require('./routes/sheet');
const { startScheduler } = require('./services/scheduler');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS settings - dynamic from env, credentials true is mandatory for cookies
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
console.log(`Configuring CORS for origin: ${corsOrigin}`);

const corsOptions = {
  origin: corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret_key_sync_pad_12345'));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sheets', sheetRoutes);

// Socket.io Setup
const io = socketIo(server, {
  cors: {
    origin: corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Socket state tracking
io.on('connection', (socket) => {
  console.log(`Device connected: ${socket.id}`);
  socket.viewingSheetId = null;

  // Client notifies which sheet they are actively viewing
  socket.on('client_viewing_sheet', ({ sheetId }) => {
    // Leave previous sheet rooms
    if (socket.viewingSheetId) {
      socket.leave(`sheet_${socket.viewingSheetId}`);
    }

    socket.viewingSheetId = sheetId;
    socket.join(`sheet_${sheetId}`);
    console.log(`Device ${socket.id} is now viewing sheet: ${sheetId}`);
  });

  // Client sends real-time editing keystrokes
  socket.on('client_edit_sheet', async ({ sheetId, content }) => {
    try {
      // 1. Broadcast the content update immediately to all other clients viewing the SAME sheet
      socket.to(`sheet_${sheetId}`).emit('server_sheet_content_updated', {
        sheetId,
        content
      });

      // 2. Fetch sheet details to get the title for background notifications
      const sheet = await sheetService.getSheetById(sheetId);
      const title = sheet ? sheet.title : 'Untitled';

      // 3. Broadcast background notification to all OTHER devices NOT viewing this sheet
      // We can scan all connected sockets and emit to those not viewing the sheet
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.id !== socket.id && s.viewingSheetId !== sheetId) {
          s.emit('server_sheet_background_updated', {
            sheetId,
            title,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 4. Persist the changes to the SQLite database
      await sheetService.updateSheetContent(sheetId, content);
    } catch (err) {
      console.error('Error handling client_edit_sheet:', err);
    }
  });

  // Trigger list refresh across all devices when sheets are saved, deleted, etc.
  socket.on('client_sheets_list_modified', () => {
    io.emit('sheets_list_updated');
  });

  socket.on('disconnect', () => {
    console.log(`Device disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Initialize SQLite Tables & Seed default data
    await initDb();
    console.log('SQLite database initialized successfully.');

    // 2. Start the cron scheduler for auto-archiving
    startScheduler(io);

    // 3. Listen on port
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`SyncPad Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
