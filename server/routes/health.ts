import { Router } from "express";
import { getDb, getSqliteDb } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/healthz
 * Returns server + database health status.
 */
router.get("/", (_req, res) => {
  let dbStatus: "ok" | "error" = "ok";
  let dbError: string | null = null;

  try {
    const db = getDb();
    db.run(sql`SELECT 1`);
  } catch (err) {
    dbStatus = "error";
    dbError = err instanceof Error ? err.message : "Unknown DB error";
  }

  const status = dbStatus === "ok" ? 200 : 503;

  res.status(status).json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    version: process.env.npm_package_version ?? "0.1.0",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {}),
      },
    },
  });
});

export default router;
