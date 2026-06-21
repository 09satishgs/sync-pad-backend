const jwt = require("jsonwebtoken");
const { sheetService } = require("../config/di");
const { ERRORS } = require("../constants/constants");

// Helper to extract cached roles from WebSocket request cookies
const getRolesFromSocket = (socket) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return [];

    const cookies = cookieHeader.split(";").reduce((acc, curr) => {
      const [key, value] = curr.split("=").map((c) => c.trim());
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});

    const token = cookies.token;
    if (!token) return [];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_jwt_secret_key_sync_pad_12345",
    );
    return decoded.roles || [];
  } catch (err) {
    console.error("Socket JWT verification error:", err.message);
    return [];
  }
};

// Socket state tracking
const sheetLocks = new Map(); // sheetId -> { socketId, username }

const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`Device connected: ${socket.id}`);
    socket.viewingSheetId = null;
    socket.username = null;

    // Helper to update lock on sheet change/disconnect
    const checkAndTransferLock = async (sheetId) => {
      const lock = sheetLocks.get(sheetId);
      if (!lock || lock.socketId !== socket.id) return;

      const socketsInRoom = await io.in(`sheet_${sheetId}`).fetchSockets();
      const eligibleSockets = socketsInRoom.filter((s) => s.id !== socket.id);

      if (eligibleSockets.length > 0) {
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
      try {
        const sheet = await sheetService.getSheetById(sheetId);
        if (!sheet) {
          console.warn(`Device ${socket.id} requested non-existing sheet ${sheetId}`);
          return;
        }

        // Authorization Check
        const roles = getRolesFromSocket(socket);
        const hasAccess = roles.some((r) => r.workspace_id === sheet.workspace_id);
        if (!hasAccess) {
          console.warn(
            `Block unauthorized socket viewing request from ${username} (${socket.id}) for sheet ${sheetId}`,
          );
          socket.emit("unauthorized_access", {
            message: ERRORS.UNAUTHORIZED_NOT_WORKSPACE_MEMBER,
          });
          return;
        }

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

        // Check lock for live sheet
        if (sheet.status === "live") {
          const lock = sheetLocks.get(sheetId);
          let lockActive = false;

          if (lock) {
            const activeSocket = io.sockets.sockets.get(lock.socketId);
            if (activeSocket && activeSocket.viewingSheetId === sheetId) {
              lockActive = true;
            }
          }

          if (lockActive) {
            socket.emit("sheet_lock_status", {
              isLocked: true,
              lockedBy: lock.username,
              lockedBySocketId: lock.socketId,
            });
          } else {
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
        if (!sheet) return;

        // Authorization Check
        const roles = getRolesFromSocket(socket);
        const hasAccess = roles.some((r) => r.workspace_id === sheet.workspace_id);
        if (!hasAccess) return;

        if (sheet.status === "live") {
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
        const sheet = await sheetService.getSheetById(sheetId);
        if (!sheet) return;

        // Authorization Check
        const roles = getRolesFromSocket(socket);
        const hasAccess = roles.some((r) => r.workspace_id === sheet.workspace_id);
        if (!hasAccess) return;

        // Server-side lock enforcement
        const lock = sheetLocks.get(sheetId);
        if (lock && lock.socketId !== socket.id) {
          console.warn(
            `Block unauthorized edit from ${socket.id} for sheet ${sheetId}`,
          );
          return;
        }

        // 1. Broadcast the content update immediately
        socket.to(`sheet_${sheetId}`).emit("server_sheet_content_updated", {
          sheetId,
          content,
        });

        // 2. Fetch sheet title
        const title = sheet.title || "Untitled";

        // 3. Broadcast background notification to all OTHER devices NOT viewing this sheet
        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.id !== socket.id && s.viewingSheetId !== sheetId) {
            // Verify that this socket also has access to this workspace before notifying
            const socketRoles = getRolesFromSocket(s);
            const socketHasAccess = socketRoles.some(
              (r) => r.workspace_id === sheet.workspace_id,
            );
            if (socketHasAccess) {
              s.emit("server_sheet_background_updated", {
                sheetId,
                title,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        // 4. Persist the changes
        await sheetService.updateSheetContent(sheetId, content);
      } catch (err) {
        console.error("Error handling client_edit_sheet:", err);
      }
    });

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
};

module.exports = { registerSocketHandlers };
