const { ERRORS } = require('../constants/constants');

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getTables(req, res) {
    try {
      const tables = await this.adminService.listDatabaseTables();
      return res.json(tables);
    } catch (error) {
      console.error('Admin Error listing tables:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getWorkspaces(req, res) {
    try {
      const workspaces = await this.adminService.listWorkspaces();
      return res.json(workspaces);
    } catch (error) {
      console.error('Admin Error listing workspaces:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getTableData(req, res) {
    const { tableName } = req.params;
    const { page, limit } = req.query;
    try {
      const data = await this.adminService.inspectTableContents(tableName, page, limit);
      return res.json(data);
    } catch (error) {
      console.error(`Admin Error fetching table data for ${tableName}:`, error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getUsersList(req, res) {
    try {
      const users = await this.adminService.getUsersList();
      return res.json(users);
    } catch (error) {
      console.error('Admin Error listing users:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async createWorkspace(req, res) {
    const { name, creatorId } = req.body;
    try {
      const result = await this.adminService.createWorkspaceAndAssignMaintainer(name, creatorId);
      return res.status(201).json(result);
    } catch (error) {
      console.error('Admin Error creating workspace:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async addWorkspaceMember(req, res) {
    const { workspaceId } = req.params;
    const { userId, access } = req.body;
    try {
      const result = await this.adminService.addUserToWorkspace(workspaceId, userId, access);
      return res.json(result);
    } catch (error) {
      console.error(`Admin Error adding member to workspace ${workspaceId}:`, error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async updateUserRoles(req, res) {
    const { id } = req.params; // target user ID
    const { roles } = req.body; // array of { workspaceId, access }
    try {
      const result = await this.adminService.modifyUserRoles(id, roles);
      return res.json(result);
    } catch (error) {
      console.error(`Admin Error updating user roles for ${id}:`, error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = AdminController;
