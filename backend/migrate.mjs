import bcrypt from 'bcryptjs';
import { get, run } from './src/db.js';

// Add users table if not exists
try {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'port_admin', 'finance_admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);
  console.log('users table ready');
} catch (e) {
  console.log('users table:', e.message);
}

// Seed super admin if no users exist
try {
  const count = await get("SELECT COUNT(*) AS c FROM users");
  if (count.c === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ["admin", hash, "super_admin"]);
    console.log('seeded admin user');
  } else {
    console.log('users already exist, skipping seed');
  }
} catch (e) {
  console.log('seed:', e.message);
}

process.exit(0);
