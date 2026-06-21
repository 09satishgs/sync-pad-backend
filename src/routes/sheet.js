const express = require('express');
const { sheetController, categoryController } = require('../config/di');
const { authenticate } = require('../middleware/auth');

// mergeParams is required so workspaceId from the parent router is accessible
const router = express.Router({ mergeParams: true });

// Live Sheets
router.get('/live', authenticate, (req, res) => sheetController.getLive(req, res));
router.put('/live', authenticate, (req, res) => sheetController.updateLive(req, res));
router.post('/save-live', authenticate, (req, res) => sheetController.saveLive(req, res));
router.post('/archive-live', authenticate, (req, res) => sheetController.archiveLive(req, res));
router.post('/delete-live', authenticate, (req, res) => sheetController.deleteLive(req, res));

// Saved Sheets
router.get('/saved', authenticate, (req, res) => sheetController.getSaved(req, res));
router.get('/archived', authenticate, (req, res) => sheetController.getArchived(req, res));
router.put('/saved/:id', authenticate, (req, res) => sheetController.updateSaved(req, res));
router.delete('/saved/:id', authenticate, (req, res) => sheetController.deleteSaved(req, res));
router.post('/load/:id', authenticate, (req, res) => sheetController.loadSheet(req, res));

// Categories
router.get('/categories', authenticate, (req, res) => categoryController.getAll(req, res));
router.post('/categories', authenticate, (req, res) => categoryController.create(req, res));
router.delete('/categories/:id', authenticate, (req, res) => categoryController.delete(req, res));

module.exports = router;
