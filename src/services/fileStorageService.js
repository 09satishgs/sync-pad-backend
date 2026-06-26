const fs = require('fs/promises');
const path = require('path');

class FileStorageService {
  constructor() {
    this.storageRoot = path.resolve(__dirname, '../../storage');
  }

  // Helper to ensure target directory exists
  async ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  // Save a Google Drive-like workspace file upload
  async saveFile(workspaceId, filename, buffer) {
    const uploadDir = path.join(this.storageRoot, 'workspaces', String(workspaceId), 'uploads');
    await this.ensureDir(uploadDir);
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    // Return relative path from project root to store in DB
    return path.relative(path.resolve(__dirname, '../../'), filePath).replace(/\\/g, '/');
  }

  // Save an archived sheet's text content to storage
  async saveArchive(workspaceId, sheetId, content) {
    const archiveDir = path.join(this.storageRoot, 'workspaces', String(workspaceId), 'archives');
    await this.ensureDir(archiveDir);
    const filePath = path.join(archiveDir, `archive_${sheetId}.txt`);
    await fs.writeFile(filePath, content || '');
    // Return relative path from project root to store in DB
    return path.relative(path.resolve(__dirname, '../../'), filePath).replace(/\\/g, '/');
  }

  // Read archived sheet text content from file path
  async readArchive(relativeFilePath) {
    const absolutePath = path.resolve(__dirname, '../../', relativeFilePath);
    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading archive file at ${absolutePath}:`, error);
      throw new Error('Archived file content could not be read.');
    }
  }

  // Delete a file physically from disk
  async deleteFile(relativeFilePath) {
    if (!relativeFilePath) return;
    const absolutePath = path.resolve(__dirname, '../../', relativeFilePath);
    try {
      await fs.unlink(absolutePath);
      console.log(`Deleted file at: ${absolutePath}`);
    } catch (error) {
      // If file does not exist, ignore the error
      if (error.code !== 'ENOENT') {
        console.error(`Error deleting file at ${absolutePath}:`, error);
      }
    }
  }
}

module.exports = FileStorageService;
