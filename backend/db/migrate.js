const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'links.db');

function migrateDatabase() {
  const db = new Database(DB_PATH);

  try {
    const tableInfo = db.pragma("table_info(links)");
    const columns = tableInfo.map(col => col.name);

    if (!columns.includes('is_read_later')) {
      db.exec('ALTER TABLE links ADD COLUMN is_read_later INTEGER DEFAULT 0');
      console.log('Added column: is_read_later');
    }

    if (!columns.includes('review_date')) {
      db.exec('ALTER TABLE links ADD COLUMN review_date DATETIME');
      console.log('Added column: review_date');
    }

    if (!columns.includes('review_status')) {
      db.exec("ALTER TABLE links ADD COLUMN review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'completed', 'skipped'))");
      console.log('Added column: review_status');
    }

    const userColumns = db.pragma("table_info(users)").map(col => col.name);
    if (!userColumns.includes('role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
      console.log('Added column: users.role');
    }

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    db.close();
  }
}

module.exports = { migrateDatabase };
