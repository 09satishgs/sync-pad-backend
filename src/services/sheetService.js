const { ERRORS, MESSAGES } = require('../constants/constants');

class SheetService {
  constructor(sheetRepository, categoryRepository, workspaceService) {
    this.sheetRepository = sheetRepository;
    this.categoryRepository = categoryRepository;
    this.workspaceService = workspaceService;
  }

  async getOrCreateBlankLiveSheet(workspaceId) {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    return await this.sheetRepository.createLive(workspaceId, expiresAt);
  }

  async getLiveOrCreate(workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    if (!liveSheet) {
      return await this.getOrCreateBlankLiveSheet(workspaceId);
    }
    return liveSheet;
  }

  async updateLiveContent(workspaceId, content, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (content === undefined) {
      const error = new Error(ERRORS.CONTENT_REQUIRED);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    const targetSheet = liveSheet || await this.getOrCreateBlankLiveSheet(workspaceId);

    return await this.sheetRepository.updateContent(targetSheet.id, content);
  }

  async saveLiveSheet(workspaceId, title, categoryId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED_TO_SAVE);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    if (!liveSheet) {
      const error = new Error(ERRORS.NO_ACTIVE_LIVE_SHEET_TO_SAVE);
      error.status = 400;
      throw error;
    }

    await this.sheetRepository.saveSheet(liveSheet.id, title, categoryId);

    return {
      savedSheetId: liveSheet.id
    };
  }

  async archiveLiveSheet(workspaceId, title, categoryId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED_TO_ARCHIVE);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    if (!liveSheet) {
      const error = new Error(ERRORS.NO_ACTIVE_LIVE_SHEET_TO_ARCHIVE);
      error.status = 400;
      throw error;
    }

    await this.sheetRepository.archiveSheet(liveSheet.id, title, categoryId);

    return {
      archivedSheetId: liveSheet.id
    };
  }

  async deleteLiveSheet(workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    if (liveSheet) {
      await this.sheetRepository.delete(liveSheet.id);
    }

    return { message: MESSAGES.LIVE_SHEET_DELETED_SUCCESS };
  }

  async getSavedSheets(workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);
    return await this.sheetRepository.findSaved(workspaceId);
  }

  async getArchivedSheets(workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);
    return await this.sheetRepository.findArchived(workspaceId);
  }

  async updateSavedSheet(workspaceId, id, { title, content, categoryId, loadedAt, force }, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED);
      error.status = 400;
      throw error;
    }

    const sheet = await this.sheetRepository.findById(id);
    if (!sheet || sheet.workspace_id !== Number(workspaceId) || sheet.status !== 'saved') {
      const error = new Error(ERRORS.SAVED_SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    // Concurrency validation check
    if (!force && loadedAt) {
      const dbTime = new Date(sheet.updated_at).getTime();
      const clientTime = new Date(loadedAt).getTime();
      
      if (dbTime - clientTime > 1500) {
        const error = new Error(ERRORS.CONFLICT_DETECTED);
        error.status = 409;
        error.serverContent = sheet.content;
        error.serverUpdatedAt = sheet.updated_at;
        throw error;
      }
    }

    const updatedContent = content !== undefined ? content : sheet.content;
    const updatedCategoryId = categoryId !== undefined ? categoryId : sheet.category_id;

    return await this.sheetRepository.updateSavedSheet(id, title, updatedContent, updatedCategoryId);
  }

  async deleteSheet(workspaceId, id, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    const sheet = await this.sheetRepository.findSavedOrArchivedById(id);
    if (!sheet || sheet.workspace_id !== Number(workspaceId)) {
      const error = new Error(ERRORS.SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    await this.sheetRepository.delete(id);
    return { message: MESSAGES.SHEET_DELETED_SUCCESS };
  }

  async loadSheetIntoLive(workspaceId, id, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    const savedSheet = await this.sheetRepository.findSavedOrArchivedById(id);
    if (!savedSheet || savedSheet.workspace_id !== Number(workspaceId)) {
      const error = new Error(ERRORS.SAVED_SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive(workspaceId);
    const targetSheet = liveSheet || await this.getOrCreateBlankLiveSheet(workspaceId);

    const updatedLiveSheet = await this.sheetRepository.updateContent(targetSheet.id, savedSheet.content);

    return {
      liveSheet: updatedLiveSheet
    };
  }

  async getSheetById(id) {
    return await this.sheetRepository.findById(id);
  }

  async updateSheetContent(id, content) {
    return await this.sheetRepository.updateContent(id, content);
  }

  async autoArchiveExpiredSheets(now) {
    const expiredSheets = await this.sheetRepository.findExpiredLive(now);
    const results = [];

    for (const sheet of expiredSheets) {
      const hasContent = sheet.content && sheet.content.trim() !== '';

      if (hasContent) {
        const timestamp = new Date(sheet.created_at).toLocaleString();
        const title = `Auto-Archived (${timestamp})`;
        await this.sheetRepository.archiveSheet(sheet.id, title, null);
      } else {
        await this.sheetRepository.delete(sheet.id);
      }

      // NO automatic recreation of the live sheet here.
      // Generation is deferred to the next user retrieval request.

      results.push({
        oldSheetId: sheet.id,
        workspaceId: sheet.workspace_id,
        archived: !!hasContent
      });
    }

    return results;
  }

  async createSavedSheet(workspaceId, title, categoryId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED);
      error.status = 400;
      throw error;
    }

    return await this.sheetRepository.createSaved(title, categoryId, workspaceId);
  }
}

module.exports = SheetService;
