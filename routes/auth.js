// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db/database');
const router = express.Router();

// Helper: log auth events
function logAuth(userId, eventType, ip) {
  db.run(
    'INSERT INTO auth_logs (user_id, event_type, ip_address) VALUES (?,?,?)',
    [userId || null, eventType, ip || 'unknown']
  );
}

// SIGNUP
router.post('/v1/signup', (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!['traveler', 'hotel_manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }
  const hash = bcrypt.hashSync(password, 12);
  db.run(
    'INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)',
    [username.trim(), email.trim(), hash, role],
    function (err) {
      if (err) return res.status(409).json({ error: 'Email or username already exists' });
      res.json({ message: 'User registered successfully!', userId: this.lastID, role });
    }
  );
});

// LOGIN
router.post('/v1/login', (req, res) => {
  const { email, password, rememberMe } = req.body; // rememberMe enables persistent cookie
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  db.get('SELECT * FROM users WHERE email = ?', [email.trim()], (err, user) => {
    if (err || !user) {
      logAuth(null, 'login_failure', req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      logAuth(user.id, 'login_failure', req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 1) Session cookie
    req.session.userId = user.id;
    res.cookie('session_cookie', req.sessionID, {
      httpOnly: true,
      secure: true,       // set to false if testing on http://localhost
      sameSite: 'Strict'
    });

    // 2) Authentication cookie (server-generated token, HttpOnly)
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours
    db.run(
      'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?,?,?)',
      [user.id, token, expiresAt.toISOString()]
    );
    res.cookie('auth_cookie', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 1000 * 60 * 60 * 2
    });

    // 3) Persistent cookie (remember me), non-sensitive, accessible to JS
    if (rememberMe) {
      res.cookie('persistent_cookie', 'remember_me=true', {
        httpOnly: false,           // non-sensitive
        secure: true,
        sameSite: 'Lax',           // allow normal navigation, mitigate CSRF
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      });
    }

    logAuth(user.id, 'login_success', req.ip);
    res.json({
      message: 'Login successful',
      role: user.role,
      cookies: {
        session_cookie: 'set',
        auth_cookie: 'set',
        persistent_cookie: rememberMe ? 'set' : 'not_set'
      }
    });
  });
});

// LOGOUT
router.post('/v1/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    res.clearCookie('session_cookie');
    res.clearCookie('auth_cookie');
    res.clearCookie('persistent_cookie');
    logAuth(userId, 'logout', req.ip);
    res.json({ message: 'Logged out successfully!' });
  });
});

module.exports = router;