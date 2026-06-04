import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { initDatabase } from "./config/database.js";
import { generalRateLimit } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";

import scanRouter from "./routes/scan.js";
import sourcesRouter from "./routes/sources.js";
import exportRouter from "./routes/export.js";
import healthRouter from "./routes/health.js";

const app = express();

// --- Middleware ---
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(generalRateLimit);

// --- Routes ---
app.use("/api/health", healthRouter);
app.use("/api/v1/scan", scanRouter);
app.use("/api/v1/sources", sourcesRouter);
app.use("/api/v1/export", exportRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: `${req.method} ${req.path} not found` });
});

// --- Global error handler (must be last) ---
app.use(errorHandler);

// --- Start ---
async function start() {
  await initDatabase();
  app.listen(config.port, () => {
    console.log(`[server] Camera Placement Scanner API running on port ${config.port}`);
    console.log(`[server] Environment: ${config.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});

export default app;
