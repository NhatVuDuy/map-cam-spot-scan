import { Router } from "express";
import { checkDbHealth } from "../config/database.js";

const router = Router();

/**
 * GET /api/health
 */
router.get("/", async (req, res) => {
  const dbOk = await checkDbHealth();
  res.json({
    status: "ok",
    db: dbOk ? "connected" : "unavailable",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
