import dotenv from "dotenv";
dotenv.config();

import { initDb } from "./db";
import app from "./app";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main() {
  console.log("[startup] Initializing database...");
  await initDb();
  console.log("[startup] Database ready.");

  app.listen(PORT, () => {
    console.log(`\n🚀 Influence Partner API running`);
    console.log(`   Environment : ${process.env.NODE_ENV ?? "development"}`);
    console.log(`   Port        : ${PORT}`);
    console.log(`   Health      : http://localhost:${PORT}/api/healthz`);
    console.log(`   Products    : http://localhost:${PORT}/api/products`);
    console.log(`   Creators    : http://localhost:${PORT}/api/creators`);
    console.log(`   Pipeline    : http://localhost:${PORT}/api/pipeline\n`);
  });
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
