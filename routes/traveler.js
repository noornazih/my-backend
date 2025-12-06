// routes/traveler.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkRole } = require('../middleware/roleCheck');

// View booking history
router.get('/v1/bookings/:userId', checkRole('traveler'), (req, res) => {
  db.all('SELECT * FROM bookings WHERE user_id=?', [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Make payment
router.post('/v1/payments', checkRole('traveler'), (req, res) => {
  const { userId, bookingId, method, amount, discountCode } = req.body;
  if (!userId || !bookingId || !method || amount == null) {
    return res.status(400).json({ error: 'Missing fields are required', status: 400 });
  }

  // Optional discount code validation
  if (discountCode) {
    db.get('SELECT * FROM offers WHERE code=?', [discountCode], (err, offer) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!offer) return res.status(409).json({ error: 'Discount code is invalid or has already expired', status: 409 });
      // You could adjust amount based on offer.discount_percent here
      insertPayment();
    });
  } else {
    insertPayment();
  }

  function insertPayment() {
    db.run(
      'INSERT INTO payments (user_id, booking_id, method, amount, status) VALUES (?,?,?,?,?)',
      [userId, bookingId, method, amount, 'confirmed'],
      function (err) {
        if (err) return res.status(402).json({ error: 'declined payment', status: 402 });
        res.json({ message: 'Payment processed', bookingId });
      }
    );
  }
});

// Cancel booking
router.patch('/v1/bookings/:id/cancel', checkRole('traveler'), (req, res) => {
  db.run('UPDATE bookings SET status="cancelled" WHERE id=?', [req.params.id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Booking not found', status: 404 });
    res.json({ message: 'Booking cancelled', bookingId: req.params.id });
  });
});

// View offers
router.get('/v1/offers', checkRole('traveler'), (req, res) => {
  db.all('SELECT code, discount_percent, expires_at FROM offers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Apply discount code (attach to existing booking)
router.post('/v1/offers/apply', checkRole('traveler'), (req, res) => {
  const { bookingId, discountCode } = req.body;
  if (!bookingId || !discountCode) {
    return res.status(400).json({ error: 'Missing fields are required', status: 400 });
  }
  db.get('SELECT * FROM offers WHERE code=?', [discountCode], (err, offer) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!offer) return res.status(409).json({ error: 'Discount code is invalid or has already expired', status: 409 });
    res.json({ message: 'Discount applied', bookingId, discountCode });
  });
});

module.exports = router;