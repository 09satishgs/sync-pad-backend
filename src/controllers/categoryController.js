const { ERRORS } = require('../constants/constants');

class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  async getAll(req, res) {
    try {
      const categories = await this.categoryService.getCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async create(req, res) {
    const { name } = req.body;
    try {
      const newCategory = await this.categoryService.createCategory(name);
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const result = await this.categoryService.deleteCategory(id);
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
