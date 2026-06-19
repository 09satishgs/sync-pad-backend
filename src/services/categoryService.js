const { ERRORS, MESSAGES } = require('../constants/constants');

class CategoryService {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  async getCategories() {
    return await this.categoryRepository.findAll();
  }

  async createCategory(name) {
    if (!name) {
      const error = new Error(ERRORS.CATEGORY_NAME_REQUIRED);
      error.status = 400;
      throw error;
    }

    const existing = await this.categoryRepository.findByName(name);
    if (existing) {
      const error = new Error(ERRORS.CATEGORY_ALREADY_EXISTS);
      error.status = 409;
      throw error;
    }

    return await this.categoryRepository.create(name);
  }

  async deleteCategory(id) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      const error = new Error(ERRORS.CATEGORY_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    await this.categoryRepository.delete(id);
    return { message: MESSAGES.CATEGORY_DELETED_SUCCESS };
  }
}

module.exports = CategoryService;
