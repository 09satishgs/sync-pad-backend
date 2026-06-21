const express = require('express');
const { workspaceController } = require('../config/di');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, (req, res) => workspaceController.create(req, res));
router.get('/', authenticate, (req, res) => workspaceController.list(req, res));
router.post('/:id/members', authenticate, (req, res) => workspaceController.addMember(req, res));
router.get('/:id/members', authenticate, (req, res) => workspaceController.getMembers(req, res));

module.exports = router;
