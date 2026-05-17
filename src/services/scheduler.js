const { dbRun, dbGet, dbAll } = require('../config/db');
const { createBlankLiveSheet } = require('../routes/sheet');

const startScheduler = (io) => {
  // Run check every 30 seconds
  const INTERVAL_MS = 30000;

  console.log('Auto-archiver scheduler started (checking every 30s).');

  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      
      // Find expired live sheets
      const expiredSheets = await dbAll(
        "SELECT * FROM sheets WHERE status = 'live' AND expires_at < ?",
        [now]
      );

      for (const sheet of expiredSheets) {
        console.log(`Auto-archiving expired live sheet ID: ${sheet.id}`);

        // Update status to archived and set title to auto-archived with a date timestamp
        const timestamp = new Date(sheet.created_at).toLocaleString();
        const title = `Auto-Archived (${timestamp})`;

        await dbRun(
          "UPDATE sheets SET status = 'archived', title = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [title, sheet.id]
        );

        // Create a new blank live sheet
        const newLiveSheet = await createBlankLiveSheet();

        // Broadcast to all clients that the live sheet was auto-archived
        io.emit('live_sheet_archived', {
          message: 'The previous live sheet expired and was auto-archived.',
          newLiveSheet
        });

        // Also broadcast update to saved/archived list
        io.emit('sheets_list_updated');
      }
    } catch (error) {
      console.error('Error in auto-archiver scheduler:', error);
    }
  }, INTERVAL_MS);
};

module.exports = {
  startScheduler
};
