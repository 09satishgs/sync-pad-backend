const express = require('express');
const { authController } = require('../config/di');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/session', authenticate, (req, res) => authController.session(req, res));

module.exports = router;
