const { ERRORS, MESSAGES } = require('../constants/constants');

class SheetService {
  constructor(sheetRepository, categoryRepository) {
    this.sheetRepository = sheetRepository;
    this.categoryRepository = categoryRepository;
  }

  async getOrCreateBlankLiveSheet() {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    return await this.sheetRepository.createLive(expiresAt);
  }

  async getLiveOrCreate() {
    const liveSheet = await this.sheetRepository.findLive();
    if (!liveSheet) {
      return await this.getOrCreateBlankLiveSheet();
    }
    return liveSheet;
  }

  async updateLiveContent(content) {
    if (content === undefined) {
      const error = new Error(ERRORS.CONTENT_REQUIRED);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.getLiveOrCreate();
    return await this.sheetRepository.updateContent(liveSheet.id, content);
  }

  async saveLiveSheet(title, categoryId) {
    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED_TO_SAVE);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive();
    if (!liveSheet) {
      const error = new Error(ERRORS.NO_ACTIVE_LIVE_SHEET_TO_SAVE);
      error.status = 400;
      throw error;
    }

    await this.sheetRepository.saveSheet(liveSheet.id, title, categoryId);
    const newLiveSheet = await this.getOrCreateBlankLiveSheet();

    return {
      savedSheetId: liveSheet.id,
      newLiveSheet
    };
  }

  async archiveLiveSheet(title, categoryId) {
    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED_TO_ARCHIVE);
      error.status = 400;
      throw error;
    }

    const liveSheet = await this.sheetRepository.findLive();
    if (!liveSheet) {
      const error = new Error(ERRORS.NO_ACTIVE_LIVE_SHEET_TO_ARCHIVE);
      error.status = 400;
      throw error;
    }

    await this.sheetRepository.archiveSheet(liveSheet.id, title, categoryId);
    const newLiveSheet = await this.getOrCreateBlankLiveSheet();

    return {
      archivedSheetId: liveSheet.id,
      newLiveSheet
    };
  }

  async deleteLiveSheet() {
    const liveSheet = await this.sheetRepository.findLive();
    if (liveSheet) {
      await this.sheetRepository.delete(liveSheet.id);
    }
    return await this.getOrCreateBlankLiveSheet();
  }

  async getSavedSheets() {
    return await this.sheetRepository.findSaved();
  }

  async getArchivedSheets() {
    return await this.sheetRepository.findArchived();
  }

  async updateSavedSheet(id, { title, content, categoryId, loadedAt, force }) {
    if (!title) {
      const error = new Error(ERRORS.TITLE_REQUIRED);
      error.status = 400;
      throw error;
    }

    const sheet = await this.sheetRepository.findById(id);
    if (!sheet || sheet.status !== 'saved') {
      const error = new Error(ERRORS.SAVED_SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    // Concurrency validation check
    if (!force && loadedAt) {
      const dbTime = new Date(sheet.updated_at).getTime();
      const clientTime = new Date(loadedAt).getTime();
      
      // If server version is newer by > 1.5 seconds, flag a concurrency conflict
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

  async deleteSheet(id) {
    const sheet = await this.sheetRepository.findSavedOrArchivedById(id);
    if (!sheet) {
      const error = new Error(ERRORS.SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    await this.sheetRepository.delete(id);
    return { message: MESSAGES.SHEET_DELETED_SUCCESS };
  }

  async loadSheetIntoLive(id) {
    const savedSheet = await this.sheetRepository.findSavedOrArchivedById(id);
    if (!savedSheet) {
      const error = new Error(ERRORS.SAVED_SHEET_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const liveSheet = await this.getLiveOrCreate();
    const updatedLiveSheet = await this.sheetRepository.updateContent(liveSheet.id, savedSheet.content);

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

      const newLiveSheet = await this.getOrCreateBlankLiveSheet();

      results.push({
        oldSheetId: sheet.id,
        newLiveSheet,
        archived: !!hasContent
      });
    }

    return results;
  }
}

module.exports = SheetService;
