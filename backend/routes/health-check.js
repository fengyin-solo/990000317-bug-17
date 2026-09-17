const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware, requireWriter } = require('../middleware/auth');
const { checkUrl } = require('../utils/link-checker');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/health-check/all - Check all links for the user (updates status)
router.post('/all', requireWriter, async (req, res) => {
  const userId = req.userId;
  const db = getDb();

  const links = db.prepare('SELECT id, url FROM links WHERE user_id = ?').all(userId);

  if (links.length === 0) {
    return res.json({ message: 'No links to check', results: [] });
  }

  const results = [];
  const updateStmt = db.prepare('UPDATE links SET status = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?');

  // Process links sequentially to avoid overwhelming servers
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const result = await checkUrl(link.url);

    const status = result.alive ? 'alive' : 'dead';
    updateStmt.run(status, link.id);

    results.push({
      id: link.id,
      url: link.url,
      status,
      http_status: result.status,
      error: result.error,
    });
  }

  const aliveCount = results.filter((r) => r.status === 'alive').length;
  const deadCount = results.filter((r) => r.status === 'dead').length;

  res.json({
    message: `Checked ${results.length} links`,
    total: results.length,
    alive: aliveCount,
    dead: deadCount,
    results,
  });
});

// GET /api/health-check/dead - Get dead links
router.get('/dead', (req, res) => {
  const userId = req.userId;
  const db = getDb();

  const deadLinks = db.prepare(`
    SELECT l.*, c.name as category_name, c.color as category_color
    FROM links l
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.user_id = ? AND l.status = 'dead'
    ORDER BY l.last_checked DESC
  `).all(userId);

  // Get tags for each link
  const getTagsStmt = db.prepare('SELECT tag FROM link_tags WHERE link_id = ?');
  const linksWithTags = deadLinks.map((link) => ({
    ...link,
    tags: getTagsStmt.all(link.id).map((t) => t.tag),
  }));

  res.json(linksWithTags);
});

module.exports = router;
