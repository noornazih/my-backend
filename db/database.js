// db/database.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'moontravel.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(DB_PATH);

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema, (err) => {
  if (err) console.error('Error initializing schema:', err);
  else console.log('Database schema ready');
});

module.exports = db;