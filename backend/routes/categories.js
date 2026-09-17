const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware, requireWriteAccess } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication; read-only accounts can only use GET
router.use(authMiddleware, requireWriteAccess);

// GET /api/categories - Get user's categories with link counts
router.get('/', (req, res) => {
  const userId = req.userId;
  const db = getDb();

  const categories = db.prepare(`
    SELECT c.*, COUNT(l.id) as link_count
    FROM categories c
    LEFT JOIN links l ON c.id = l.category_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.name
  `).all(userId);

  res.json(categories);
});

// POST /api/categories - Create a new category
router.post('/', (req, res) => {
  const { name, color } = req.body;
  const userId = req.userId;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const db = getDb();
  const result = db.prepare('INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)').run(userId, name, color || '#409EFF');

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...category, link_count: 0 });
});

// PUT /api/categories/:id - Update a category
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  const userId = req.userId;

  const db = getDb();

  const category = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name || category.name, color || category.color, id);

  const updated = db.prepare(`
    SELECT c.*, COUNT(l.id) as link_count
    FROM categories c
    LEFT JOIN links l ON c.id = l.category_id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id);

  res.json(updated);
});

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const db = getDb();

  const category = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  // Set category_id to null for links in this category
  db.prepare('UPDATE links SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);

  res.json({ message: 'Category deleted successfully' });
});

// GET /api/tags - Get all unique tags for user with counts
router.get('/tags', (req, res) => {
  const userId = req.userId;
  const db = getDb();

  const tags = db.prepare(`
    SELECT lt.tag, COUNT(*) as count
    FROM link_tags lt
    INNER JOIN links l ON lt.link_id = l.id
    WHERE l.user_id = ?
    GROUP BY lt.tag
    ORDER BY count DESC
  `).all(userId);

  res.json(tags);
});

module.exports = router;
