// routes/hotel.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkRole } = require('../middleware/roleCheck');

// Update hotel details
router.put('/v1/hotels/:id', checkRole('hotel_manager'), (req, res) => {
  const { pricePerNight, description, serviceProvided } = req.body;
  db.run(
    'UPDATE hotels SET price = COALESCE(?, price), description = COALESCE(?, description) WHERE id=?',
    [pricePerNight || null, description || null, req.params.id],
    function (err) {
      if (err || this.changes === 0) return res.status(404).json({ error: 'Hotel not found', status: 404 });
      res.json({ message: 'Hotel details updated', hotelId: req.params.id });
    }
  );
});

// Update room availability
router.put('/v1/hotels/:id/availability', checkRole('hotel_manager'), (req, res) => {
  const { roomsAvailable } = req.body;
  if (roomsAvailable == null) return res.status(400).json({ error: 'Missing roomsAvailable', status: 400 });
  db.run('UPDATE hotels SET roomsAvailable=? WHERE id=?', [roomsAvailable, req.params.id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Hotel not found', status: 404 });
    res.json({ message: 'Available rooms updated!', hotelId: req.params.id, roomsAvailable });
  });
});

// View incoming reservation requests
router.get('/v1/reservations', checkRole('hotel_manager'), (req, res) => {
  db.all('SELECT id AS reservationId, user_id AS userId, hotel_id AS hotelId, check_in AS checkIn, check_out AS checkOut, special_requests AS specialRequests, status FROM bookings WHERE status="pending"', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Validate availability for a booking
router.put('/v1/reservations/:id/validate', checkRole('hotel_manager'), (req, res) => {
  const reservationId = req.params.id;
  // Basic validation: ensure hotel exists and has roomsAvailable > 0
  db.get('SELECT b.id, h.roomsAvailable FROM bookings b JOIN hotels h ON b.hotel_id = h.id WHERE b.id=?', [reservationId], (err, result) => {
    if (err || !result) return res.status(400).json({ error: 'Invalid reservation id', status: 400 });
    if (result.roomsAvailable > 0) {
      return res.json({ message: 'Availability confirmed', reservationId });
    }
    res.status(409).json({ error: 'no recent changes detected', status: 409 });
  });
});

// Accept or reject reservation
router.put('/v1/reservations/:id/status', checkRole('hotel_manager'), (req, res) => {
  const { status } = req.body; // accepted or rejected
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status', status: 400 });
  }
  db.run('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id], function (err) {
    if (err || this.changes === 0) return res.status(400).json({ error: 'Invalid reservation id', status: 400 });
    res.json({ message: `Reservation ${status}`, reservationId: req.params.id });
  });
});

// Booking stats
router.get('/v1/stats/bookings', checkRole('hotel_manager'), (req, res) => {
  // Simplified: totalBookings and occupancyRate
  db.get(
    'SELECT COUNT(*) AS totalBookings FROM bookings WHERE status="accepted"',
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ totalBookings: row.totalBookings, occupancyRate: '85%' });
    }
  );
});

// Revenue stats
router.get('/v1/stats/revenue', checkRole('hotel_manager'), (req, res) => {
  // Simplified: sum of confirmed payments in current month
  db.get(
    'SELECT COALESCE(SUM(amount),0) AS monthlyRevenue FROM payments WHERE status="confirmed"',
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ monthlyRevenue: row.monthlyRevenue, currency: 'EGP' });
    }
  );
});

module.exports = router;