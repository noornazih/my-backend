// middleware/roleCheck.js
const db = require('../db/database');

function checkRole(requiredRole) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized: No session' });
    }
    db.get('SELECT role, status FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err || !user) return res.status(403).json({ error: 'Access denied' });
      if (user.status !== 'active') return res.status(403).json({ error: 'Account inactive' });
      if (user.role !== requiredRole) return res.status(403).json({ error: 'Insufficient privileges' });
      next();
    });
  };
}

module.exports = { checkRole };