const { dbRun, dbGet } = require('../config/db');
const { FIND_USER_BY_USERNAME, CREATE_USER, FIND_USER_BY_ID, UPDATE_USER_ROLE_IDS } = require('../constants/queries');

class UserRepository {
  async findByUsername(username) {
    return await dbGet(FIND_USER_BY_USERNAME, [username]);
  }

  async create(username, passwordHash) {
    const result = await dbRun(CREATE_USER, [username, passwordHash]);
    return result; // contains { id: lastID, changes: changes }
  }

  async findById(id) {
    return await dbGet(FIND_USER_BY_ID, [id]);
  }

  async updateRoleIds(id, roleIds) {
    return await dbRun(UPDATE_USER_ROLE_IDS, [roleIds, id]);
  }
}

module.exports = UserRepository;
