const { ERRORS, MESSAGES } = require('../constants/constants');

class AdminService {
  constructor(adminRepository, workspaceRepository, userRepository) {
    this.adminRepository = adminRepository;
    this.workspaceRepository = workspaceRepository;
    this.userRepository = userRepository;
  }

  async listDatabaseTables() {
    return await this.adminRepository.listTables();
  }

  async listWorkspaces() {
    return await this.workspaceRepository.findAll();
  }

  async inspectTableContents(tableName, page = 1, limit = 50) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const rows = await this.adminRepository.getTableRows(tableName, limitNum, offset);

    // Safeguard: Ensure no password hashes are exposed under any circumstance
    return rows.map(row => {
      const copy = { ...row };
      delete copy.password_hash;
      return copy;
    });
  }

  async getUsersList() {
    return await this.adminRepository.getUsersList();
  }

  async createWorkspaceAndAssignMaintainer(workspaceName, targetUserId) {
    if (!workspaceName) {
      const error = new Error(ERRORS.WORKSPACE_NAME_REQUIRED);
      error.status = 400;
      throw error;
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      const error = new Error(ERRORS.TARGET_USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const existingWorkspace = await this.workspaceRepository.findByName(workspaceName);
    if (existingWorkspace) {
      const error = new Error(ERRORS.WORKSPACE_NAME_TAKEN);
      error.status = 409;
      throw error;
    }

    // 1. Create workspace
    const workspace = await this.workspaceRepository.create(workspaceName, targetUserId);

    // 2. Create maintainer role for the workspace
    const role = await this.workspaceRepository.createRole(workspace.id, 'maintainer');

    // 3. Append to user roles
    const roleIds = targetUser.role_ids ? targetUser.role_ids.split(',').map(Number) : [];
    roleIds.push(role.role_id);
    await this.userRepository.updateRoleIds(targetUserId, roleIds.join(','));

    return {
      message: MESSAGES.WORKSPACE_CREATED_SUCCESS,
      workspace,
      role
    };
  }

  async addUserToWorkspace(workspaceId, targetUserId, accessLevel) {
    if (accessLevel !== 'member' && accessLevel !== 'maintainer') {
      const error = new Error(ERRORS.INVALID_ACCESS_LEVEL);
      error.status = 400;
      throw error;
    }

    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      const error = new Error(ERRORS.WORKSPACE_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      const error = new Error(ERRORS.USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    // Check if user is already a member of workspace
    const roleIds = targetUser.role_ids ? targetUser.role_ids.split(',').map(Number) : [];
    if (roleIds.length > 0) {
      const rolesDetails = await this.workspaceRepository.findRolesByIds(roleIds);
      const alreadyMember = rolesDetails.some(r => r.workspace_id === Number(workspaceId));
      if (alreadyMember) {
        const error = new Error(ERRORS.USER_ALREADY_MEMBER);
        error.status = 400;
        throw error;
      }
    }

    // Create role record and append
    const role = await this.workspaceRepository.createRole(workspaceId, accessLevel);
    roleIds.push(role.role_id);
    await this.userRepository.updateRoleIds(targetUserId, roleIds.join(','));

    return {
      message: MESSAGES.USER_ADDED_TO_WORKSPACE_SUCCESS,
      user: {
        id: targetUser.id,
        username: targetUser.username
      },
      role
    };
  }

  async modifyUserRoles(targetUserId, rolesArray) {
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      const error = new Error(ERRORS.USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    if (!Array.isArray(rolesArray)) {
      const error = new Error(ERRORS.ROLES_PAYLOAD_MUST_BE_ARRAY);
      error.status = 400;
      throw error;
    }

    // 1. Wipe old roles assigned to this user
    const currentRoleIds = targetUser.role_ids ? targetUser.role_ids.split(',').map(Number) : [];
    for (const roleId of currentRoleIds) {
      await this.adminRepository.deleteRole(roleId);
    }

    // 2. Create and associate new roles
    const newRoleIds = [];
    for (const r of rolesArray) {
      const { workspaceId, access } = r;

      if (!workspaceId || (access !== 'member' && access !== 'maintainer')) {
        const error = new Error(ERRORS.INVALID_ROLE_ITEM);
        error.status = 400;
        throw error;
      }

      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (workspace) {
        const newRole = await this.workspaceRepository.createRole(workspaceId, access);
        newRoleIds.push(newRole.role_id);
      }
    }

    // 3. Update user role list
    const roleIdsString = newRoleIds.length > 0 ? newRoleIds.join(',') : null;
    await this.userRepository.updateRoleIds(targetUserId, roleIdsString);

    return {
      message: MESSAGES.USER_ROLES_UPDATED_SUCCESS,
      userId: targetUserId,
      rolesCount: newRoleIds.length
    };
  }
}

module.exports = AdminService;
