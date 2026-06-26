const { dbRun, dbGet, dbAll } = require('../config/db');
const {
  CREATE_WORKSPACE_FILE,
  FIND_WORKSPACE_FILES_FOR_WORKSPACE,
  FIND_WORKSPACE_FILE_BY_ID,
  DELETE_WORKSPACE_FILE
} = require('../constants/queries');

class FileRepository {
  async create(filename, originalName, filePath, mimeType, sizeBytes, workspaceId, uploaderId) {
    const result = await dbRun(CREATE_WORKSPACE_FILE, [
      filename,
      originalName,
      filePath,
      mimeType,
      sizeBytes,
      workspaceId,
      uploaderId || null
    ]);
    return await this.findById(result.id);
  }

  async findAll(workspaceId) {
    return await dbAll(FIND_WORKSPACE_FILES_FOR_WORKSPACE, [workspaceId]);
  }

  async findById(id) {
    return await dbGet(FIND_WORKSPACE_FILE_BY_ID, [id]);
  }

  async delete(id) {
    return await dbRun(DELETE_WORKSPACE_FILE, [id]);
  }
}

module.exports = FileRepository;
