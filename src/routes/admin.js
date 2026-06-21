const express = require('express');
const { adminController } = require('../config/di');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

const router = express.Router();

router.get('/db/tables', authenticate, isAdmin, (req, res) => adminController.getTables(req, res));
router.get('/db/tables/:tableName', authenticate, isAdmin, (req, res) => adminController.getTableData(req, res));
router.get('/users', authenticate, isAdmin, (req, res) => adminController.getUsersList(req, res));
router.get('/workspaces', authenticate, isAdmin, (req, res) => adminController.getWorkspaces(req, res));
router.put('/users/:id/roles', authenticate, isAdmin, (req, res) => adminController.updateUserRoles(req, res));
router.post('/workspaces', authenticate, isAdmin, (req, res) => adminController.createWorkspace(req, res));
router.post('/workspaces/:workspaceId/members', authenticate, isAdmin, (req, res) => adminController.addWorkspaceMember(req, res));

module.exports = router;
