module.exports = {
  // Users Queries
  FIND_USER_BY_USERNAME: 'SELECT * FROM users WHERE username = ?',
  CREATE_USER: 'INSERT INTO users (username, password_hash) VALUES (?, ?)',
  FIND_USER_BY_ID: 'SELECT * FROM users WHERE id = ?',
  UPDATE_USER_ROLE_IDS: 'UPDATE users SET role_ids = ? WHERE id = ?',

  // Workspaces Queries
  CREATE_WORKSPACE: 'INSERT INTO workspaces (name, creator_id) VALUES (?, ?)',
  FIND_WORKSPACE_BY_NAME: 'SELECT * FROM workspaces WHERE name = ?',
  FIND_WORKSPACE_BY_ID: 'SELECT * FROM workspaces WHERE id = ?',
  FIND_ALL_WORKSPACES: 'SELECT * FROM workspaces',

  // Roles Queries
  CREATE_ROLE: 'INSERT INTO roles (workspace_id, access) VALUES (?, ?)',
  FIND_ROLE_BY_ID: 'SELECT * FROM roles WHERE role_id = ?',
  FIND_ROLES_FOR_WORKSPACE: 'SELECT * FROM roles WHERE workspace_id = ?',
  FIND_MEMBERS_BY_WORKSPACE: `
    SELECT u.id, u.username, r.role_id, r.access 
    FROM roles r 
    JOIN users u ON ',' || u.role_ids || ',' LIKE '%,' || r.role_id || ',%' 
    WHERE r.workspace_id = ?
  `,

  // Sheets Queries (workspace scoped)
  FIND_LIVE_SHEET: "SELECT * FROM sheets WHERE status = 'live' AND workspace_id = ?",
  CREATE_LIVE_SHEET: "INSERT INTO sheets (title, content, type, status, expires_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?)",
  UPDATE_SHEET_CONTENT: "UPDATE sheets SET content = ?, type = 'txt', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  SAVE_SHEET: "UPDATE sheets SET title = ?, status = 'saved', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ARCHIVE_SHEET: "UPDATE sheets SET title = ?, status = 'archived', category_id = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  DELETE_SHEET: "DELETE FROM sheets WHERE id = ?",
  FIND_SAVED_SHEETS: `
    SELECT s.*, c.name as category_name 
    FROM sheets s 
    LEFT JOIN categories c ON s.category_id = c.id 
    WHERE s.status = 'saved' AND s.workspace_id = ?
    ORDER BY s.updated_at DESC
  `,
  FIND_ARCHIVED_SHEETS: `
    SELECT s.*, c.name as category_name 
    FROM sheets s 
    LEFT JOIN categories c ON s.category_id = c.id 
    WHERE s.status = 'archived' AND s.workspace_id = ?
    ORDER BY s.updated_at DESC
  `,
  FIND_SHEET_BY_ID: "SELECT * FROM sheets WHERE id = ?",
  FIND_SAVED_OR_ARCHIVED_SHEET_BY_ID: "SELECT * FROM sheets WHERE id = ? AND (status = 'saved' OR status = 'archived')",
  UPDATE_SAVED_SHEET: "UPDATE sheets SET title = ?, content = ?, type = 'txt', category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  FIND_EXPIRED_LIVE_SHEETS: "SELECT * FROM sheets WHERE status = 'live' AND expires_at < ?",
  CREATE_SAVED_SHEET: "INSERT INTO sheets (title, content, type, status, category_id, workspace_id) VALUES (?, ?, 'txt', 'saved', ?, ?)",


  // Categories Queries (workspace scoped)
  FIND_ALL_CATEGORIES: "SELECT * FROM categories WHERE workspace_id = ? ORDER BY name ASC",
  FIND_CATEGORY_BY_NAME: "SELECT * FROM categories WHERE name = ? AND workspace_id = ?",
  FIND_CATEGORY_BY_ID: "SELECT * FROM categories WHERE id = ?",
  CREATE_CATEGORY: "INSERT INTO categories (name, workspace_id) VALUES (?, ?)",
  DELETE_CATEGORY: "DELETE FROM categories WHERE id = ?",
  
  // Admin Queries
  LIST_DB_TABLES: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  
  // Initialization Queries
  CREATE_USERS_TABLE: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_ids TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  CREATE_WORKSPACES_TABLE: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
  CREATE_ROLES_TABLE: `
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER,
      access TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `,
  CREATE_CATEGORIES_TABLE: `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      workspace_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      UNIQUE(name, workspace_id)
    )
  `,
  CREATE_SHEETS_TABLE: `
    CREATE TABLE IF NOT EXISTS sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL DEFAULT 'txt',
      status TEXT NOT NULL DEFAULT 'live',
      category_id INTEGER,
      workspace_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `
};
