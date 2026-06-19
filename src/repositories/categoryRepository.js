const { dbRun, dbGet, dbAll } = require('../config/db');
const {
  FIND_ALL_CATEGORIES,
  FIND_CATEGORY_BY_NAME,
  FIND_CATEGORY_BY_ID,
  CREATE_CATEGORY,
  DELETE_CATEGORY
} = require('../constants/queries');

class CategoryRepository {
  async findAll() {
    return await dbAll(FIND_ALL_CATEGORIES);
  }

  async findByName(name) {
    return await dbGet(FIND_CATEGORY_BY_NAME, [name]);
  }

  async findById(id) {
    return await dbGet(FIND_CATEGORY_BY_ID, [id]);
  }

  async create(name) {
    const result = await dbRun(CREATE_CATEGORY, [name]);
    return await this.findById(result.id);
  }

  async delete(id) {
    return await dbRun(DELETE_CATEGORY, [id]);
  }
}

module.exports = CategoryRepository;
