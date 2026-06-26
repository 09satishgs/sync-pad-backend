const express = require('express');
const multer = require('multer');
const { fileController } = require('../config/di');
const { authenticate } = require('../middleware/auth');

// mergeParams is required so workspaceId from the parent router is accessible
const router = express.Router({ mergeParams: true });

// Setup multer memory storage (we parse in memory and let service write to disk)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, upload.single('file'), (req, res) => fileController.upload(req, res));
router.get('/', authenticate, (req, res) => fileController.list(req, res));
router.get('/:fileId/download', authenticate, (req, res) => fileController.download(req, res));
router.delete('/:fileId', authenticate, (req, res) => fileController.delete(req, res));

module.exports = router;
