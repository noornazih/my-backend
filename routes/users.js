// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkRole } = require('../middleware/roleCheck');

// GET all users
router.get('/v1/users', checkRole('admin'), (req, res) => {
  db.all('SELECT id AS userId, username AS name, email, role, status FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// GET specific user
router.get('/v1/users/:id', checkRole('admin'), (req, res) => {
  db.get('SELECT id AS userId, username AS name, email, role, status FROM users WHERE id=?', [req.params.id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User does not exist', status: 404 });
    res.json(user);
  });
});

// UPDATE user details
router.put('/v1/users/:id', checkRole('admin'), (req, res) => {
  const { name, email, role } = req.body;
  if (role && !['traveler', 'hotel_manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified', status: 400 });
  }
  db.run(
    'UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), role = COALESCE(?, role) WHERE id=?',
    [name || null, email || null, role || null, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: 'Invalid update', status: 400 });
      res.json({ message: 'User updated successfully!', userId: req.params.id });
    }
  );
});

// ACTIVATE user
router.put('/v1/users/:id/activate', checkRole('admin'), (req, res) => {
  db.run('UPDATE users SET status="active" WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'User account reactivated', userId: req.params.id, status: 'active' });
  });
});

// DEACTIVATE user
router.put('/v1/users/:id/deactivate', checkRole('admin'), (req, res) => {
  db.run('UPDATE users SET status="deactivated" WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'User account deactivated.', userId: req.params.id, status: 'deactivated' });
  });
});

module.exports = router;