const { sheetService } = require('../config/di');
const { MESSAGES } = require('../constants/constants');

const startScheduler = (io) => {
  // Run check every 30 seconds
  const INTERVAL_MS = 30000;

  console.log('Auto-archiver scheduler started (checking every 30s).');

  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const archivedResults = await sheetService.autoArchiveExpiredSheets(now);

      for (const result of archivedResults) {
        if (result.archived) {
          console.log(`Auto-archived expired live sheet ID: ${result.oldSheetId}`);
        } else {
          console.log(`Deleted empty expired live sheet ID: ${result.oldSheetId}`);
        }

        // Broadcast to all clients that the live sheet was auto-archived/deleted
        io.emit('live_sheet_archived', {
          message: result.archived ? MESSAGES.AUTO_ARCHIVE_MESSAGE : MESSAGES.AUTO_DELETE_MESSAGE,
          newLiveSheet: result.newLiveSheet
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
