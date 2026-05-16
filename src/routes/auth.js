const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper to check if username exists
const getUserByUsername = async (username) => {
  return await dbGet('SELECT * FROM users WHERE username = ?', [username]);
};

// Register endpoint
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await dbRun('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    
    return res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'dev_jwt_secret_key_sync_pad_12345',
      { expiresIn: '30d' }
    );

    // Set cookie options
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Needed because Vercel frontend is on a different domain
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('token', token, cookieOptions);
    return res.json({
      message: 'Login successful.',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.json({ message: 'Logged out successfully.' });
});

// Session validation endpoint
router.get('/session', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
