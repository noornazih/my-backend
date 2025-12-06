const db = require('../db/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function logAuth(userId, eventType, ip) {
  db.run('INSERT INTO auth_logs (user_id, event_type, ip_address) VALUES (?,?,?)',
    [userId || null, eventType, ip || 'unknown']);
}

exports.signup = (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const hash = bcrypt.hashSync(password, 12);
  db.run('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)',
    [username, email, hash, role], function (err) {
      if (err) return res.status(409).json({ error: 'Email or username already exists' });
      res.json({ message: 'User registered successfully!', userId: this.lastID, role });
    });
};

exports.login = (req, res) => {
  const { email, password, rememberMe } = req.body;
  db.get('SELECT * FROM users WHERE email=?', [email], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password_hash)) {
      logAuth(user.id, 'login_failure', req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.userId = user.id;
    res.cookie('session_cookie', req.sessionID, { httpOnly: true, secure: true, sameSite: 'Strict' });
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('auth_cookie', token, { httpOnly: true, secure: true, sameSite: 'Strict' });
    if (rememberMe) res.cookie('persistent_cookie', 'remember_me=true', { httpOnly: false, secure: true, sameSite: 'Lax' });
    logAuth(user.id, 'login_success', req.ip);
    res.json({ message: 'Login successful', role: user.role });
  });
};

exports.logout = (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    res.clearCookie('session_cookie');
    res.clearCookie('auth_cookie');
    res.clearCookie('persistent_cookie');
    logAuth(userId, 'logout', req.ip);
    res.json({ message: 'Logged out successfully!' });
  });
};