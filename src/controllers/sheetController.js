const { ERRORS, MESSAGES } = require('../constants/constants');

class SheetController {
  constructor(sheetService) {
    this.sheetService = sheetService;
  }

  async getLive(req, res) {
    const { workspaceId } = req.params;
    try {
      const liveSheet = await this.sheetService.getLiveOrCreate(workspaceId, req.user.roles || []);
      return res.json(liveSheet);
    } catch (error) {
      console.error('Error fetching live sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async updateLive(req, res) {
    const { workspaceId } = req.params;
    const { content } = req.body;
    try {
      const updatedSheet = await this.sheetService.updateLiveContent(workspaceId, content, req.user.roles || []);
      return res.json(updatedSheet);
    } catch (error) {
      console.error('Error updating live sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async saveLive(req, res) {
    const { workspaceId } = req.params;
    const { title, category_id } = req.body;
    try {
      const result = await this.sheetService.saveLiveSheet(workspaceId, title, category_id, req.user.roles || []);
      return res.json({
        message: MESSAGES.SHEET_SAVED_SUCCESS_SHORT,
        savedSheetId: result.savedSheetId
      });
    } catch (error) {
      console.error('Error saving live sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async archiveLive(req, res) {
    const { workspaceId } = req.params;
    const { title, category_id } = req.body;
    try {
      const result = await this.sheetService.archiveLiveSheet(workspaceId, title, category_id, req.user.roles || []);
      return res.json({
        message: MESSAGES.SHEET_ARCHIVED_SUCCESS_SHORT,
        archivedSheetId: result.archivedSheetId
      });
    } catch (error) {
      console.error('Error archiving live sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async deleteLive(req, res) {
    const { workspaceId } = req.params;
    try {
      const result = await this.sheetService.deleteLiveSheet(workspaceId, req.user.roles || []);
      return res.json(result);
    } catch (error) {
      console.error('Error deleting live sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getSaved(req, res) {
    const { workspaceId } = req.params;
    try {
      const sheets = await this.sheetService.getSavedSheets(workspaceId, req.user.roles || []);
      return res.json(sheets);
    } catch (error) {
      console.error('Error fetching saved sheets:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getArchived(req, res) {
    const { workspaceId } = req.params;
    try {
      const sheets = await this.sheetService.getArchivedSheets(workspaceId, req.user.roles || []);
      return res.json(sheets);
    } catch (error) {
      console.error('Error fetching archived sheets:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async updateSaved(req, res) {
    const { workspaceId, id } = req.params;
    const { title, content, category_id, loadedAt, force } = req.body;
    try {
      const updatedSheet = await this.sheetService.updateSavedSheet(workspaceId, id, {
        title,
        content,
        categoryId: category_id,
        loadedAt,
        force
      }, req.user.roles || []);
      return res.json(updatedSheet);
    } catch (error) {
      console.error('Error updating saved sheet:', error);
      if (error.status === 409) {
        return res.status(409).json({
          message: error.message,
          serverContent: error.serverContent,
          serverUpdatedAt: error.serverUpdatedAt
        });
      }
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async deleteSaved(req, res) {
    const { workspaceId, id } = req.params;
    try {
      const result = await this.sheetService.deleteSheet(workspaceId, id, req.user.roles || []);
      return res.json(result);
    } catch (error) {
      console.error('Error deleting sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async loadSheet(req, res) {
    const { workspaceId, id } = req.params;
    try {
      const result = await this.sheetService.loadSheetIntoLive(workspaceId, id, req.user.roles || []);
      return res.json(result);
    } catch (error) {
      console.error('Error loading sheet:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = SheetController;
