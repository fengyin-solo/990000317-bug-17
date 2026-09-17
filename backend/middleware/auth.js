const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'link-collector-secret-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已失效，请重新登录', code: 'NO_TOKEN' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({
      error: err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '登录凭证无效，请重新登录',
      code: reason,
    });
  }

  // Always load the current user row so role/permission changes take effect
  // immediately and deleted tokens (removed users) are rejected.
  const user = getDb()
    .prepare('SELECT id, username, email, role FROM users WHERE id = ?')
    .get(decoded.userId);

  if (!user) {
    return res.status(401).json({ error: '账号不存在或登录已失效', code: 'USER_MISSING' });
  }

  req.userId = user.id;
  req.user = user;
  next();
}

// Write operations (create / update / delete / import / health-check writes)
// require the 'owner' role. 'viewer' accounts may only read.
function requireWriter(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({
      error: '当前账号为只读账号，仅可查看，不能进行修改操作',
      code: 'READ_ONLY',
    });
  }
  next();
}

module.exports = { authMiddleware, requireWriter, JWT_SECRET };
