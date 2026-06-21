const { ERRORS, MESSAGES } = require('../constants/constants');

class CategoryService {
  constructor(categoryRepository, workspaceService) {
    this.categoryRepository = categoryRepository;
    this.workspaceService = workspaceService;
  }

  async getCategories(workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);
    return await this.categoryRepository.findAll(workspaceId);
  }

  async createCategory(name, workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    if (!name) {
      const error = new Error(ERRORS.CATEGORY_NAME_REQUIRED);
      error.status = 400;
      throw error;
    }

    const existing = await this.categoryRepository.findByName(name, workspaceId);
    if (existing) {
      const error = new Error(ERRORS.CATEGORY_ALREADY_EXISTS);
      error.status = 409;
      throw error;
    }

    return await this.categoryRepository.create(name, workspaceId);
  }

  async deleteCategory(id, workspaceId, requesterRoles) {
    this.workspaceService.checkAccess(workspaceId, requesterRoles);

    const category = await this.categoryRepository.findById(id);
    if (!category || category.workspace_id !== Number(workspaceId)) {
      const error = new Error(ERRORS.CATEGORY_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    await this.categoryRepository.delete(id);
    return { message: MESSAGES.CATEGORY_DELETED_SUCCESS };
  }
}

module.exports = CategoryService;
