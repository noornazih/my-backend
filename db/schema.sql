-- Users and roles
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('traveler','hotel_manager','admin')),
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auth logs for monitoring login events
CREATE TABLE IF NOT EXISTS auth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT, -- 'login_success','login_failure','logout'
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Optional: store auth tokens if you want server-side verification of auth_cookie
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Hotels (for manager control)
CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  price REAL,
  description TEXT,
  roomsAvailable INTEGER DEFAULT 0
);

-- Bookings (traveler reservations)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  hotel_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending','accepted','rejected','cancelled')) DEFAULT 'pending',
  check_in DATE,
  check_out DATE,
  special_requests TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(hotel_id) REFERENCES hotels(id)
);

-- Payments (traveler payments)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  status TEXT CHECK(status IN ('confirmed','failed')) DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(booking_id) REFERENCES bookings(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Offers (basic structure)
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  expires_at DATETIME
);

-- Reviews (for hotel details)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(hotel_id) REFERENCES hotels(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);