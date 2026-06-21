const { dbRun, dbGet, dbAll } = require('../config/db');
const {
  CREATE_WORKSPACE,
  FIND_WORKSPACE_BY_NAME,
  FIND_WORKSPACE_BY_ID,
  FIND_ALL_WORKSPACES,
  CREATE_ROLE,
  FIND_ROLE_BY_ID,
  FIND_MEMBERS_BY_WORKSPACE
} = require('../constants/queries');

class WorkspaceRepository {
  async create(name, creatorId) {
    const result = await dbRun(CREATE_WORKSPACE, [name, creatorId]);
    return await this.findById(result.id);
  }

  async findByName(name) {
    return await dbGet(FIND_WORKSPACE_BY_NAME, [name]);
  }

  async findById(id) {
    return await dbGet(FIND_WORKSPACE_BY_ID, [id]);
  }

  async findAll() {
    return await dbAll(FIND_ALL_WORKSPACES);
  }

  async createRole(workspaceId, access) {
    const result = await dbRun(CREATE_ROLE, [workspaceId, access]);
    return await this.findRoleById(result.id);
  }

  async findRoleById(roleId) {
    return await dbGet(FIND_ROLE_BY_ID, [roleId]);
  }

  async findRolesByIds(roleIds) {
    if (!roleIds || roleIds.length === 0) return [];
    const placeholders = roleIds.map(() => '?').join(',');
    const sql = `SELECT * FROM roles WHERE role_id IN (${placeholders})`;
    return await dbAll(sql, roleIds);
  }

  async findWorkspacesByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT * FROM workspaces WHERE id IN (${placeholders})`;
    return await dbAll(sql, ids);
  }

  async getMembers(workspaceId) {
    return await dbAll(FIND_MEMBERS_BY_WORKSPACE, [workspaceId]);
  }
}

module.exports = WorkspaceRepository;
