const { dbRun, dbGet, dbAll } = require('../config/db');
const {
  FIND_LIVE_SHEET,
  CREATE_LIVE_SHEET,
  UPDATE_SHEET_CONTENT,
  SAVE_SHEET,
  ARCHIVE_SHEET,
  DELETE_SHEET,
  FIND_SAVED_SHEETS,
  FIND_ARCHIVED_SHEETS,
  FIND_SHEET_BY_ID,
  FIND_SAVED_OR_ARCHIVED_SHEET_BY_ID,
  UPDATE_SAVED_SHEET,
  FIND_EXPIRED_LIVE_SHEETS
} = require('../constants/queries');

class SheetRepository {
  async findLive() {
    return await dbGet(FIND_LIVE_SHEET);
  }

  async createLive(expiresAt) {
    const result = await dbRun(
      CREATE_LIVE_SHEET,
      ['Live Sheet', '', 'txt', 'live', expiresAt]
    );
    return await this.findById(result.id);
  }

  async updateContent(id, content) {
    await dbRun(UPDATE_SHEET_CONTENT, [content, id]);
    return await this.findById(id);
  }

  async saveSheet(id, title, categoryId) {
    await dbRun(SAVE_SHEET, [title, categoryId || null, id]);
    return await this.findById(id);
  }

  async archiveSheet(id, title, categoryId) {
    await dbRun(ARCHIVE_SHEET, [title, categoryId || null, id]);
    return await this.findById(id);
  }

  async delete(id) {
    return await dbRun(DELETE_SHEET, [id]);
  }

  async findSaved() {
    return await dbAll(FIND_SAVED_SHEETS);
  }

  async findArchived() {
    return await dbAll(FIND_ARCHIVED_SHEETS);
  }

  async findById(id) {
    return await dbGet(FIND_SHEET_BY_ID, [id]);
  }

  async findSavedOrArchivedById(id) {
    return await dbGet(FIND_SAVED_OR_ARCHIVED_SHEET_BY_ID, [id]);
  }

  async updateSavedSheet(id, title, content, categoryId) {
    await dbRun(UPDATE_SAVED_SHEET, [title, content, categoryId, id]);
    return await this.findById(id);
  }

  async findExpiredLive(now) {
    return await dbAll(FIND_EXPIRED_LIVE_SHEETS, [now]);
  }
}

module.exports = SheetRepository;
