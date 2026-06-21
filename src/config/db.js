const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const {
  CREATE_USERS_TABLE,
  CREATE_WORKSPACES_TABLE,
  CREATE_ROLES_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_SHEETS_TABLE
} = require('../constants/queries');

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_URL || 'database.db');
console.log(`Connecting to SQLite database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper to run queries with promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Helper to fetch all rows
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to fetch a single row
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize tables
const initDb = async () => {
  try {
    // Enable foreign keys
    await dbRun('PRAGMA foreign_keys = ON');

    // Create tables using imported queries
    await dbRun(CREATE_USERS_TABLE);
    await dbRun(CREATE_WORKSPACES_TABLE);
    await dbRun(CREATE_ROLES_TABLE);
    await dbRun(CREATE_CATEGORIES_TABLE);
    await dbRun(CREATE_SHEETS_TABLE);

    console.log('Database tables recreated successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
};

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet,
  initDb
};
