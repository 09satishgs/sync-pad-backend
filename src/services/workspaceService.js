const { ERRORS, MESSAGES } = require('../constants/constants');

class WorkspaceService {
  constructor(workspaceRepository, userRepository) {
    this.workspaceRepository = workspaceRepository;
    this.userRepository = userRepository;
  }

  async createWorkspace(name, creatorId) {
    if (!name) {
      const error = new Error(ERRORS.WORKSPACE_NAME_REQUIRED);
      error.status = 400;
      throw error;
    }

    const existing = await this.workspaceRepository.findByName(name);
    if (existing) {
      const error = new Error(ERRORS.WORKSPACE_NAME_TAKEN);
      error.status = 409;
      throw error;
    }

    // 1. Create Workspace
    const workspace = await this.workspaceRepository.create(name, creatorId);

    // 2. Create a Role with 'maintainer' access for the creator
    const role = await this.workspaceRepository.createRole(workspace.id, 'maintainer');

    // 3. Append role to creator's role_ids list
    const creator = await this.userRepository.findById(creatorId);
    if (creator) {
      const roleIds = creator.role_ids ? creator.role_ids.split(',').map(Number) : [];
      roleIds.push(role.role_id);
      await this.userRepository.updateRoleIds(creatorId, roleIds.join(','));
    }

    return workspace;
  }

  async getWorkspacesForUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error(ERRORS.USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const roleIds = user.role_ids ? user.role_ids.split(',').map(Number) : [];
    if (roleIds.length === 0) {
      return [];
    }

    const roles = await this.workspaceRepository.findRolesByIds(roleIds);
    const workspaceIds = [...new Set(roles.map(r => r.workspace_id).filter(id => id !== null && id !== undefined && id !== 0))];
    if (workspaceIds.length === 0) {
      return [];
    }

    return await this.workspaceRepository.findWorkspacesByIds(workspaceIds);
  }

  async addMemberToWorkspace(workspaceId, memberUsername, requesterId, requesterRoles) {
    // 1. Verify that requester is a maintainer of this workspace
    const reqRole = requesterRoles.find(r => r.workspace_id === Number(workspaceId));
    if (!reqRole || reqRole.access !== 'maintainer') {
      const error = new Error(ERRORS.UNAUTHORIZED_MAINTAINER_ONLY);
      error.status = 403;
      throw error;
    }

    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      const error = new Error(ERRORS.WORKSPACE_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const member = await this.userRepository.findByUsername(memberUsername);
    if (!member) {
      const error = new Error(ERRORS.USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    // 2. Check if user is already a member
    const memberRoles = member.role_ids ? member.role_ids.split(',').map(Number) : [];
    if (memberRoles.length > 0) {
      const rolesDetails = await this.workspaceRepository.findRolesByIds(memberRoles);
      const alreadyMember = rolesDetails.some(r => r.workspace_id === Number(workspaceId));
      if (alreadyMember) {
        const error = new Error(ERRORS.USER_ALREADY_MEMBER);
        error.status = 400;
        throw error;
      }
    }

    // 3. Create a member role for the workspace
    const newRole = await this.workspaceRepository.createRole(workspaceId, 'member');

    // 4. Append to user's roles list
    memberRoles.push(newRole.role_id);
    await this.userRepository.updateRoleIds(member.id, memberRoles.join(','));

    return {
      message: MESSAGES.MEMBER_ADDED_SUCCESS,
      member: {
        id: member.id,
        username: member.username
      },
      role: newRole
    };
  }

  async getMembersOfWorkspace(workspaceId, requesterRoles) {
    // Verify access
    const hasAccess = requesterRoles.some(r => r.workspace_id === Number(workspaceId));
    if (!hasAccess) {
      const error = new Error(ERRORS.UNAUTHORIZED_NO_WORKSPACE_ACCESS);
      error.status = 403;
      throw error;
    }

    return await this.workspaceRepository.getMembers(workspaceId);
  }

  checkAccess(workspaceId, userRoles) {
    const hasAccess = userRoles && userRoles.some(r => r.workspace_id === Number(workspaceId));
    if (!hasAccess) {
      const error = new Error(ERRORS.UNAUTHORIZED_NO_WORKSPACE_ACCESS);
      error.status = 403;
      throw error;
    }
  }
}

module.exports = WorkspaceService;
