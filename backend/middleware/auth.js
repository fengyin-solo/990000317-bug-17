const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const JWT_SECRET = 'link-collector-secret-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供登录令牌' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: '登录令牌无效或已过期' });
  }

  // 每次请求都从数据库读取最新的用户信息，
  // 确保权限（角色）按当前状态计算，而不是信任令牌里的旧声明
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);

  if (!user) {
    return res.status(401).json({ error: '账号不存在或已被删除' });
  }

  req.userId = user.id;
  req.userRole = user.role || 'user';
  req.user = user;
  next();
}

// 只读账号（viewer）只能查看，不能执行任何修改操作
function requireWriteAccess(req, res, next) {
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (req.userRole === 'viewer' && writeMethods.includes(req.method)) {
    return res.status(403).json({ error: '当前账号为只读权限，仅可查看内容，无法执行修改操作' });
  }
  next();
}

module.exports = { authMiddleware, requireWriteAccess, JWT_SECRET };
