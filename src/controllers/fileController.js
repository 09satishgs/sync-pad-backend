const path = require('path');
const { ERRORS } = require('../constants/constants');

class FileController {
  constructor(fileService) {
    this.fileService = fileService;
  }

  async upload(req, res) {
    const { workspaceId } = req.params;
    const file = req.file; // Provided by multer
    const uploaderId = req.user.id;

    try {
      const result = await this.fileService.uploadFile(
        workspaceId,
        file,
        uploaderId,
        req.user.roles || []
      );
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error uploading workspace file:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async list(req, res) {
    const { workspaceId } = req.params;

    try {
      const files = await this.fileService.listFiles(workspaceId, req.user.roles || []);
      return res.json(files);
    } catch (error) {
      console.error('Error listing workspace files:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async download(req, res) {
    const { workspaceId, fileId } = req.params;

    try {
      const fileRecord = await this.fileService.getFileForDownload(
        workspaceId,
        fileId,
        req.user.roles || []
      );
      const absolutePath = path.resolve(__dirname, '../../', fileRecord.file_path);
      return res.download(absolutePath, fileRecord.original_name);
    } catch (error) {
      console.error('Error downloading workspace file:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async delete(req, res) {
    const { workspaceId, fileId } = req.params;

    try {
      const result = await this.fileService.deleteFile(
        workspaceId,
        fileId,
        req.user.roles || []
      );
      return res.json(result);
    } catch (error) {
      console.error('Error deleting workspace file:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = FileController;
