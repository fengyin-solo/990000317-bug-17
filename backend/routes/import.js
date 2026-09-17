const express = require('express');
const multer = require('multer');
const { getDb } = require('../db/init');
const { authMiddleware, requireWriter } = require('../middleware/auth');
const { parseBookmarks } = require('../utils/bookmark-parser');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require authentication
router.use(authMiddleware);

// POST /api/import/bookmarks - Import Chrome bookmarks (writes user data)
router.post('/bookmarks', requireWriter, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const html = req.file.buffer.toString('utf-8');
  const bookmarks = parseBookmarks(html);

  if (bookmarks.length === 0) {
    return res.status(400).json({ error: 'No valid bookmarks found in the file' });
  }

  const db = getDb();
  const userId = req.userId;

  // Create categories from folders if they don't exist
  const getOrCreateCategory = db.transaction((folderName) => {
    let category = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(userId, folderName);
    if (!category) {
      const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9B59B6', '#1ABC9C', '#E74C3C'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const result = db.prepare('INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)').run(userId, folderName, color);
      return result.lastInsertRowid;
    }
    return category.id;
  });

  const insertLink = db.prepare(
    'INSERT INTO links (user_id, url, title, description, category_id, status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const checkExists = db.prepare('SELECT id FROM links WHERE user_id = ? AND url = ?');

  let imported = 0;
  let skipped = 0;

  const importBookmarks = db.transaction(() => {
    for (const bookmark of bookmarks) {
      // Skip if URL already exists for this user
      const existing = checkExists.get(userId, bookmark.url);
      if (existing) {
        skipped++;
        continue;
      }

      const categoryId = bookmark.folder !== 'Uncategorized' ? getOrCreateCategory(bookmark.folder) : null;

      insertLink.run(userId, bookmark.url, bookmark.title, '', categoryId, 'unchecked');
      imported++;
    }
  });

  importBookmarks();

  res.json({
    message: `Successfully imported ${imported} bookmarks`,
    imported,
    skipped,
    total: bookmarks.length,
  });
});

module.exports = router;
