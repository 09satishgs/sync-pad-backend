module.exports = {
  // Users Queries
  FIND_USER_BY_USERNAME: 'SELECT * FROM users WHERE username = ?',
  CREATE_USER: 'INSERT INTO users (username, password_hash) VALUES (?, ?)',

  // Sheets Queries
  FIND_LIVE_SHEET: "SELECT * FROM sheets WHERE status = 'live'",
  CREATE_LIVE_SHEET: "INSERT INTO sheets (title, content, type, status, expires_at) VALUES (?, ?, ?, ?, ?)",
  UPDATE_SHEET_CONTENT: "UPDATE sheets SET content = ?, type = 'txt', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  SAVE_SHEET: "UPDATE sheets SET title = ?, status = 'saved', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ARCHIVE_SHEET: "UPDATE sheets SET title = ?, status = 'archived', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  DELETE_SHEET: "DELETE FROM sheets WHERE id = ?",
  FIND_SAVED_SHEETS: `
    SELECT s.*, c.name as category_name 
    FROM sheets s 
    LEFT JOIN categories c ON s.category_id = c.id 
    WHERE s.status = 'saved' 
    ORDER BY s.updated_at DESC
  `,
  FIND_ARCHIVED_SHEETS: `
    SELECT s.*, c.name as category_name 
    FROM sheets s 
    LEFT JOIN categories c ON s.category_id = c.id 
    WHERE s.status = 'archived' 
    ORDER BY s.updated_at DESC
  `,
  FIND_SHEET_BY_ID: "SELECT * FROM sheets WHERE id = ?",
  FIND_SAVED_OR_ARCHIVED_SHEET_BY_ID: "SELECT * FROM sheets WHERE id = ? AND (status = 'saved' OR status = 'archived')",
  UPDATE_SAVED_SHEET: "UPDATE sheets SET title = ?, content = ?, type = 'txt', category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  FIND_EXPIRED_LIVE_SHEETS: "SELECT * FROM sheets WHERE status = 'live' AND expires_at < ?",

  // Categories Queries
  FIND_ALL_CATEGORIES: "SELECT * FROM categories ORDER BY name ASC",
  FIND_CATEGORY_BY_NAME: "SELECT * FROM categories WHERE name = ?",
  FIND_CATEGORY_BY_ID: "SELECT * FROM categories WHERE id = ?",
  CREATE_CATEGORY: "INSERT INTO categories (name) VALUES (?)",
  DELETE_CATEGORY: "DELETE FROM categories WHERE id = ?"
};
