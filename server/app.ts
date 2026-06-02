import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import healthRouter from "./routes/health";
import productsRouter from "./routes/products";
import creatorsRouter from "./routes/creators";
import pipelineRouter from "./routes/pipeline";

dotenv.config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/healthz", healthRouter);
app.use("/api/products", productsRouter);
app.use("/api/creators", creatorsRouter);
app.use("/api/pipeline", pipelineRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Error]", err.message);
    if (process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV !== "production" ? { detail: err.message } : {}),
    });
  }
);

export default app;
