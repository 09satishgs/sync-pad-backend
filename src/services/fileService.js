const { ERRORS, MESSAGES } = require('../constants/constants');

class FileService {
  constructor(fileRepository, fileStorageService, workspaceService) {
    this.fileRepository = fileRepository;
    this.fileStorageService = fileStorageService;
    this.workspaceService = workspaceService;
  }

  async uploadFile(workspaceId, file, uploaderId, requesterRoles) {
    // 1. Verify workspace access
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    // 2. Validate file existence
    if (!file) {
      const error = new Error(ERRORS.FILE_REQUIRED);
      error.status = 400;
      throw error;
    }

    // 3. Generate a collision-safe unique filename on disk
    const uniqueFilename = `${Date.now()}_${file.originalname}`;

    // 4. Save file to disk
    const filePath = await this.fileStorageService.saveFile(workspaceId, uniqueFilename, file.buffer);

    // 5. Save metadata to DB
    const dbRecord = await this.fileRepository.create(
      uniqueFilename,
      file.originalname,
      filePath,
      file.mimetype,
      file.size,
      workspaceId,
      uploaderId
    );

    return {
      message: MESSAGES.FILE_UPLOADED_SUCCESS,
      file: dbRecord
    };
  }

  async listFiles(workspaceId, requesterRoles) {
    // 1. Verify workspace access
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    // 2. Get workspace files list
    return await this.fileRepository.findAll(workspaceId);
  }

  async getFileForDownload(workspaceId, fileId, requesterRoles) {
    // 1. Verify workspace access
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    // 2. Retrieve file record
    const fileRecord = await this.fileRepository.findById(fileId);
    if (!fileRecord || fileRecord.workspace_id !== Number(workspaceId)) {
      const error = new Error(ERRORS.FILE_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    return fileRecord;
  }

  async deleteFile(workspaceId, fileId, requesterRoles) {
    // 1. Verify workspace access
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    // 2. Retrieve file record
    const fileRecord = await this.fileRepository.findById(fileId);
    if (!fileRecord || fileRecord.workspace_id !== Number(workspaceId)) {
      const error = new Error(ERRORS.FILE_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    // 3. Delete file physically from disk
    await this.fileStorageService.deleteFile(fileRecord.file_path);

    // 4. Delete DB metadata record
    await this.fileRepository.delete(fileId);

    return {
      message: MESSAGES.FILE_DELETED_SUCCESS
    };
  }
}

module.exports = FileService;
