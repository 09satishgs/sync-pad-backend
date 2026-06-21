const { ERRORS } = require('../constants/constants');

class WorkspaceController {
  constructor(workspaceService) {
    this.workspaceService = workspaceService;
  }

  async create(req, res) {
    const { name } = req.body;
    try {
      const workspace = await this.workspaceService.createWorkspace(name, req.user.id);
      return res.status(201).json(workspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async list(req, res) {
    try {
      const workspaces = await this.workspaceService.getWorkspacesForUser(req.user.id);
      return res.json(workspaces);
    } catch (error) {
      console.error('Error listing workspaces:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async addMember(req, res) {
    const { id } = req.params; // workspace ID
    const { username } = req.body;
    try {
      const result = await this.workspaceService.addMemberToWorkspace(id, username, req.user.id, req.user.roles || []);
      return res.json(result);
    } catch (error) {
      console.error('Error adding member to workspace:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async getMembers(req, res) {
    const { id } = req.params; // workspace ID
    try {
      const members = await this.workspaceService.getMembersOfWorkspace(id, req.user.roles || []);
      return res.json(members);
    } catch (error) {
      console.error('Error fetching members of workspace:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = WorkspaceController;
