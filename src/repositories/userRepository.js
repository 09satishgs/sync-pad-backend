const { dbRun, dbGet } = require('../config/db');
const { FIND_USER_BY_USERNAME, CREATE_USER } = require('../constants/queries');

class UserRepository {
  async findByUsername(username) {
    return await dbGet(FIND_USER_BY_USERNAME, [username]);
  }

  async create(username, passwordHash) {
    const result = await dbRun(CREATE_USER, [username, passwordHash]);
    return result; // contains { id: lastID, changes: changes }
  }
}

module.exports = UserRepository;
