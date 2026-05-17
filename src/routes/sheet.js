const express = require('express');
const { dbRun, dbGet, dbAll } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper to create a new blank live sheet
const createBlankLiveSheet = async () => {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
  const result = await dbRun(
    "INSERT INTO sheets (title, content, type, status, expires_at) VALUES (?, ?, ?, ?, ?)",
    ['Live Sheet', '', 'txt', 'live', expiresAt]
  );
  return await dbGet('SELECT * FROM sheets WHERE id = ?', [result.id]);
};

// GET live sheet
router.get('/live', authenticate, async (req, res) => {
  try {
    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (!liveSheet) {
      liveSheet = await createBlankLiveSheet();
    }
    return res.json(liveSheet);
  } catch (error) {
    console.error('Error fetching live sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT update live sheet
router.put('/live', authenticate, async (req, res) => {
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ message: 'Content is required.' });
  }

  try {
    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (!liveSheet) {
      liveSheet = await createBlankLiveSheet();
    }

    await dbRun(
      "UPDATE sheets SET content = ?, type = 'txt', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [content, liveSheet.id]
    );

    const updatedSheet = await dbGet("SELECT * FROM sheets WHERE id = ?", [liveSheet.id]);

    // Express Socket.io binding can trigger from server.js, but let's return it
    return res.json(updatedSheet);
  } catch (error) {
    console.error('Error updating live sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST save live sheet
router.post('/save-live', authenticate, async (req, res) => {
  const { title, category_id } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required to save sheet.' });
  }

  try {
    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (!liveSheet) {
      return res.status(400).json({ message: 'No active live sheet to save.' });
    }

    // Update status to saved, remove expires_at
    await dbRun(
      "UPDATE sheets SET title = ?, status = 'saved', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, category_id || null, liveSheet.id]
    );

    // Create a new live sheet
    const newLiveSheet = await createBlankLiveSheet();

    return res.json({
      message: 'Sheet saved successfully. New live sheet created.',
      savedSheetId: liveSheet.id,
      newLiveSheet
    });
  } catch (error) {
    console.error('Error saving live sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST archive live sheet (saves and archives it)
router.post('/archive-live', authenticate, async (req, res) => {
  const { title, category_id } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required to archive sheet.' });
  }

  try {
    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (!liveSheet) {
      return res.status(400).json({ message: 'No active live sheet to archive.' });
    }

    // Update status to archived, remove expires_at
    await dbRun(
      "UPDATE sheets SET title = ?, status = 'archived', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, category_id || null, liveSheet.id]
    );

    // Create a new live sheet
    const newLiveSheet = await createBlankLiveSheet();

    return res.json({
      message: 'Sheet archived successfully. New live sheet created.',
      archivedSheetId: liveSheet.id,
      newLiveSheet
    });
  } catch (error) {
    console.error('Error archiving live sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST delete live sheet (wipes current live sheet and starts fresh)
router.post('/delete-live', authenticate, async (req, res) => {
  try {
    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (liveSheet) {
      await dbRun("DELETE FROM sheets WHERE id = ?", [liveSheet.id]);
    }

    const newLiveSheet = await createBlankLiveSheet();
    return res.json({
      message: 'Live sheet deleted. Started a new blank sheet.',
      newLiveSheet
    });
  } catch (error) {
    console.error('Error deleting live sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET all saved sheets
router.get('/saved', authenticate, async (req, res) => {
  try {
    const sheets = await dbAll(`
      SELECT s.*, c.name as category_name 
      FROM sheets s 
      LEFT JOIN categories c ON s.category_id = c.id 
      WHERE s.status = 'saved' 
      ORDER BY s.updated_at DESC
    `);
    return res.json(sheets);
  } catch (error) {
    console.error('Error fetching saved sheets:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET all archived sheets
router.get('/archived', authenticate, async (req, res) => {
  try {
    const sheets = await dbAll(`
      SELECT s.*, c.name as category_name 
      FROM sheets s 
      LEFT JOIN categories c ON s.category_id = c.id 
      WHERE s.status = 'archived' 
      ORDER BY s.updated_at DESC
    `);
    return res.json(sheets);
  } catch (error) {
    console.error('Error fetching archived sheets:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT update a saved sheet (rename, move to category, edit content with concurrency check)
router.put('/saved/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, content, category_id, loadedAt, force } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  try {
    const sheet = await dbGet("SELECT * FROM sheets WHERE id = ? AND status = 'saved'", [id]);
    if (!sheet) {
      return res.status(404).json({ message: 'Saved sheet not found.' });
    }

    // Concurrency validation check
    if (!force && loadedAt) {
      const dbTime = new Date(sheet.updated_at).getTime();
      const clientTime = new Date(loadedAt).getTime();
      
      // If server version is newer by > 1.5 seconds, we flag a concurrency conflict
      if (dbTime - clientTime > 1500) {
        return res.status(409).json({
          message: 'Conflict detected. This sheet has been updated on another device.',
          serverContent: sheet.content,
          serverUpdatedAt: sheet.updated_at
        });
      }
    }

    await dbRun(
      "UPDATE sheets SET title = ?, content = ?, type = 'txt', category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, content !== undefined ? content : sheet.content, category_id !== undefined ? category_id : sheet.category_id, id]
    );

    const updatedSheet = await dbGet("SELECT * FROM sheets WHERE id = ?", [id]);
    return res.json(updatedSheet);
  } catch (error) {
    console.error('Error updating saved sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE a saved sheet
router.delete('/saved/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const sheet = await dbGet("SELECT * FROM sheets WHERE id = ? AND (status = 'saved' OR status = 'archived')", [id]);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found.' });
    }

    await dbRun("DELETE FROM sheets WHERE id = ?", [id]);
    return res.json({ message: 'Sheet deleted successfully.' });
  } catch (error) {
    console.error('Error deleting sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST load saved sheet into live sheet (overwrites current live sheet content)
router.post('/load/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const savedSheet = await dbGet("SELECT * FROM sheets WHERE id = ? AND (status = 'saved' OR status = 'archived')", [id]);
    if (!savedSheet) {
      return res.status(404).json({ message: 'Saved sheet not found.' });
    }

    let liveSheet = await dbGet("SELECT * FROM sheets WHERE status = 'live'");
    if (!liveSheet) {
      liveSheet = await createBlankLiveSheet();
    }

    // Overwrite live sheet with saved sheet content
    await dbRun(
      "UPDATE sheets SET content = ?, type = 'txt', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [savedSheet.content, liveSheet.id]
    );

    const updatedLiveSheet = await dbGet("SELECT * FROM sheets WHERE id = ?", [liveSheet.id]);
    return res.json({
      message: 'Sheet loaded into live space.',
      liveSheet: updatedLiveSheet
    });
  } catch (error) {
    console.error('Error loading sheet:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- Categories ---

// GET all categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await dbAll("SELECT * FROM categories ORDER BY name ASC");
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST create category
router.post('/categories', authenticate, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required.' });
  }

  try {
    const existing = await dbGet("SELECT * FROM categories WHERE name = ?", [name]);
    if (existing) {
      return res.status(409).json({ message: 'Category already exists.' });
    }

    const result = await dbRun("INSERT INTO categories (name) VALUES (?)", [name]);
    const newCategory = await dbGet("SELECT * FROM categories WHERE id = ?", [result.id]);
    return res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE category
router.delete('/categories/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const category = await dbGet("SELECT * FROM categories WHERE id = ?", [id]);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Sheets linked to this category will have category_id set to NULL due to ON DELETE SET NULL
    await dbRun("DELETE FROM categories WHERE id = ?", [id]);
    return res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
exportName = createBlankLiveSheet; // Export helper for use in scheduler
module.exports.createBlankLiveSheet = createBlankLiveSheet;
