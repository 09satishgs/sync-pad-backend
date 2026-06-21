const { dbRun, dbGet, dbAll } = require('../config/db');
const { LIST_DB_TABLES } = require('../constants/queries');
const { ERRORS } = require('../constants/constants');

class AdminRepository {
  async listTables() {
    const rows = await dbAll(LIST_DB_TABLES);
    return rows.map(r => r.name);
  }

  async getTableRows(tableName, limit = 50, offset = 0) {
    // Validate table name strictly to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      const error = new Error(ERRORS.INVALID_TABLE_NAME);
      error.status = 400;
      throw error;
    }

    // Dynamic table names cannot be parameterized, but strict alphanumeric regex validation secures it.
    // LIMIT and OFFSET are fully parameterized.
    const sql = `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`;
    return await dbAll(sql, [limit, offset]);
  }

  async getUsersList() {
    // Password hashes are never selected, keeping them hidden even from database-read outputs
    return await dbAll('SELECT id, username, role_ids, created_at FROM users ORDER BY username ASC');
  }

  async deleteRole(roleId) {
    return await dbRun('DELETE FROM roles WHERE role_id = ?', [roleId]);
  }

  async removeRoleFromUsers(roleId) {
    const searchPattern = `%,\u0025`; // Wait, let's query users using LIKE
    const sql = "SELECT id, role_ids FROM users WHERE ',' || role_ids || ',' LIKE '%,' || ? || ',%'";
    const users = await dbAll(sql, [roleId]);

    for (const user of users) {
      const roleIds = user.role_ids ? user.role_ids.split(',').map(Number) : [];
      const updatedRoleIds = roleIds.filter(id => id !== Number(roleId));
      const roleIdsString = updatedRoleIds.length > 0 ? updatedRoleIds.join(',') : null;
      
      await dbRun('UPDATE users SET role_ids = ? WHERE id = ?', [roleIdsString, user.id]);
    }
  }
}

module.exports = AdminRepository;
