require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbFile = path.resolve(__dirname, process.env.DB_FILE || './folio.db');
const db = new DatabaseSync(dbFile);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Create tables from schema.sql every time the server starts (safe to run repeatedly)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;