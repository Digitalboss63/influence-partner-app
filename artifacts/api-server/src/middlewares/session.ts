/**
 * Session middleware foundation.
 *
 * Phase 2 Sprint 1: Foundation only.
 * - SESSION_SECRET is configured and used.
 * - No login UI yet.
 * - No route guards yet (all endpoints remain open).
 * - Cookie-based session is ready to be extended with auth in Sprint 2.
 *
 * TODO Sprint 2: Add session-backed auth, user table, JWT or cookie auth strategy.
 */

import cookieParser from "cookie-parser";
import { type Express } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"];

if (!SESSION_SECRET) {
  // Non-fatal in development; fatal in production
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  } else {
    console.warn(
      "[session] WARNING: SESSION_SECRET is not set. Using insecure default for development."
    );
  }
}

export function applySessionMiddleware(app: Express): void {
  // Cookie parser enables reading/writing signed cookies.
  // The SESSION_SECRET signs cookies to prevent client-side tampering.
  app.use(cookieParser(SESSION_SECRET ?? "dev-insecure-fallback"));

  // NOTE: Express-session or a JWT strategy goes here in Sprint 2.
  // Placeholder middleware that attaches a minimal session context:
  app.use((_req, _res, next) => {
    // TODO Sprint 2: Verify session cookie / JWT token
    // TODO Sprint 2: Attach req.user if authenticated
    next();
  });
}
