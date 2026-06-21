const { dbRun, dbGet, dbAll } = require('../config/db');
const {
  FIND_ALL_CATEGORIES,
  FIND_CATEGORY_BY_NAME,
  FIND_CATEGORY_BY_ID,
  CREATE_CATEGORY,
  DELETE_CATEGORY
} = require('../constants/queries');

class CategoryRepository {
  async findAll(workspaceId) {
    return await dbAll(FIND_ALL_CATEGORIES, [workspaceId]);
  }

  async findByName(name, workspaceId) {
    return await dbGet(FIND_CATEGORY_BY_NAME, [name, workspaceId]);
  }

  async findById(id) {
    return await dbGet(FIND_CATEGORY_BY_ID, [id]);
  }

  async create(name, workspaceId) {
    const result = await dbRun(CREATE_CATEGORY, [name, workspaceId]);
    return await this.findById(result.id);
  }

  async delete(id) {
    return await dbRun(DELETE_CATEGORY, [id]);
  }
}

module.exports = CategoryRepository;
