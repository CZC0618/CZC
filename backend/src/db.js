import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "port-ops.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });

const seedVessels = [
  ["海石油 01", "IMO9384721", "在港", 85000, "青岛港", "2026-03-21 16:00"],
  ["东方能源", "IMO9271458", "待进港", 62000, "宁波港", "2026-03-22 08:30"],
  ["海运先锋", "IMO9156332", "待出港", 70000, "舟山港", "2026-03-21 22:15"]
];

const seedCargoes = [
  ["原油 A 批次", "原油", 32000, "海石油 01", "装卸中", "新加坡"],
  ["柴油补给", "成品油", 18000, "东方能源", "待装船", "广州港"],
  ["润滑油集装批次", "化工品", 6000, "海运先锋", "待出港", "厦门港"]
];

const seedPortCalls = [
  ["海石油 01", "进港", "B-01", "原油 A 批次", "2026-03-21 14:00", "作业中"],
  ["东方能源", "进港", "A-03", "柴油补给", "2026-03-22 08:30", "已排期"],
  ["海运先锋", "出港", "C-02", "润滑油集装批次", "2026-03-21 22:15", "待放行"]
];

const seedReceipts = [
  ["ORD-20260321-001", 32000, 2560000, "青岛港", "新加坡", "海石油 01", "交易中", "2026-03-21 16:30"],
  ["ORD-20260321-002", 18000, 1080000, "宁波港", "广州港", "东方能源", "待确认", "2026-03-21 17:00"]
];

export async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      imo TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      capacity_tons INTEGER NOT NULL,
      last_port TEXT NOT NULL,
      eta TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS cargoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity_tons INTEGER NOT NULL,
      vessel_name TEXT NOT NULL,
      status TEXT NOT NULL,
      destination_port TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS port_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_name TEXT NOT NULL,
      direction TEXT NOT NULL,
      berth TEXT NOT NULL,
      cargo_name TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      quantity_tons REAL NOT NULL,
      amount REAL NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      vessel_name TEXT NOT NULL,
      trade_status TEXT NOT NULL DEFAULT '待确认',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'port_admin', 'finance_admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  const vesselCount = await get("SELECT COUNT(*) AS count FROM vessels");
  if (vesselCount.count === 0) {
    for (const vessel of seedVessels) {
      await run(
        `INSERT INTO vessels (name, imo, status, capacity_tons, last_port, eta)
         VALUES (?, ?, ?, ?, ?, ?)`,
        vessel
      );
    }
  }

  const cargoCount = await get("SELECT COUNT(*) AS count FROM cargoes");
  if (cargoCount.count === 0) {
    for (const cargo of seedCargoes) {
      await run(
        `INSERT INTO cargoes (name, category, quantity_tons, vessel_name, status, destination_port)
         VALUES (?, ?, ?, ?, ?, ?)`,
        cargo
      );
    }
  }

  const portCallCount = await get("SELECT COUNT(*) AS count FROM port_calls");
  if (portCallCount.count === 0) {
    for (const portCall of seedPortCalls) {
      await run(
        `INSERT INTO port_calls (vessel_name, direction, berth, cargo_name, scheduled_at, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        portCall
      );
    }
  }

  const receiptCount = await get("SELECT COUNT(*) AS count FROM receipts");
  if (receiptCount.count === 0) {
    for (const receipt of seedReceipts) {
      await run(
        `INSERT INTO receipts (order_no, quantity_tons, amount, origin, destination, vessel_name, trade_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        receipt
      );
    }
  }

  /* Seed super admin: admin / admin123 */
  const userCount = await get("SELECT COUNT(*) AS count FROM users");
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      ["admin", hash, "super_admin"]
    );
  }
}

export { all, get, run };
