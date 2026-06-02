/**
 * Database initialization using sql.js (pure WASM — no native compilation needed).
 *
 * How it works:
 * - On startup: load DB from file if it exists, otherwise create a new in-memory DB.
 * - On every write: persist the DB to the file.
 * - Uses Drizzle ORM's sql.js driver for type-safe queries.
 */

import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const dbUrl = process.env.DATABASE_URL ?? "./data/influence.db";
const dbPath = path.resolve(dbUrl);
const dbDir = path.dirname(dbPath);

// ─── Module-level singleton ──────────────────────────────────────────────────

let _sqliteDb: SqlJsDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// ─── Persist helper ──────────────────────────────────────────────────────────

export function persistDb(): void {
  if (!_sqliteDb) return;
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const data = _sqliteDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ─── Initializer (must be called once before using `db`) ──────────────────────

export async function initDb(): Promise<void> {
  if (_db) return; // already initialized

  const SQL = await initSqlJs();

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    _sqliteDb = new SQL.Database(fileBuffer);
    console.log(`[db] Loaded existing database from ${dbPath}`);
  } else {
    _sqliteDb = new SQL.Database();
    console.log(`[db] Created new in-memory database`);
  }

  // Enable foreign keys
  _sqliteDb.run("PRAGMA foreign_keys = ON;");

  _db = drizzle(_sqliteDb, { schema });

  // Create tables if they don't exist
  runMigrations(_sqliteDb);

  // Persist initial state
  persistDb();
}

// ─── Schema DDL ───────────────────────────────────────────────────────────────

function runMigrations(sqlite: SqlJsDatabase): void {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      url TEXT,
      image_url TEXT,
      target_audience TEXT,
      key_benefits TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_intelligence_snapshots (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      target_audience_analysis TEXT,
      content_angles TEXT,
      competitor_landscape TEXT,
      pricing_position TEXT,
      best_creator_profile TEXT,
      source TEXT NOT NULL DEFAULT 'mock',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      platform TEXT NOT NULL,
      niche TEXT NOT NULL,
      follower_count INTEGER NOT NULL DEFAULT 0,
      engagement_rate REAL NOT NULL DEFAULT 0,
      avg_views INTEGER,
      avg_likes INTEGER,
      location TEXT,
      email TEXT,
      bio TEXT,
      profile_image_url TEXT,
      tags TEXT,
      audience_demographics TEXT,
      price_range TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creator_scores (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      overall_score REAL NOT NULL DEFAULT 0,
      audience_fit_score REAL NOT NULL DEFAULT 0,
      engagement_score REAL NOT NULL DEFAULT 0,
      niche_relevance_score REAL NOT NULL DEFAULT 0,
      reach_score REAL NOT NULL DEFAULT 0,
      scoring_method TEXT NOT NULL DEFAULT 'mock',
      score_notes TEXT,
      computed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline_items (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'New',
      notes TEXT,
      proposed_rate REAL,
      agreed_rate REAL,
      campaign_brief TEXT,
      expected_delivery_date INTEGER,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_messages (
      id TEXT PRIMARY KEY,
      pipeline_item_id TEXT NOT NULL REFERENCES pipeline_items(id) ON DELETE CASCADE,
      creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      subject TEXT,
      body TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      direction TEXT NOT NULL DEFAULT 'outbound',
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  console.log("[db] Schema ready.");
}

// ─── Accessor (throws if not initialized) ─────────────────────────────────────

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}

export function getSqliteDb(): SqlJsDatabase {
  if (!_sqliteDb) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _sqliteDb;
}

// Re-export schema for convenience
export { schema };
export type DB = ReturnType<typeof drizzle<typeof schema>>;
