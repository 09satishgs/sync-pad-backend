const { ERRORS } = require('../constants/constants');

class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  async getAll(req, res) {
    const { workspaceId } = req.params;
    try {
      const categories = await this.categoryService.getCategories(workspaceId, req.user.roles || []);
      return res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async create(req, res) {
    const { workspaceId } = req.params;
    const { name } = req.body;
    try {
      const newCategory = await this.categoryService.createCategory(name, workspaceId, req.user.roles || []);
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async delete(req, res) {
    const { workspaceId, id } = req.params;
    try {
      const result = await this.categoryService.deleteCategory(id, workspaceId, req.user.roles || []);
      return res.json(result);
    } catch (error) {
      console.error('Error deleting category:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = CategoryController;
