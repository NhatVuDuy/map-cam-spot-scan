import { Router } from "express";
import { validate, scanSchema } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { scanRateLimit } from "../middleware/rateLimit.js";
import { runScan } from "../services/scanService.js";

const router = Router();

/**
 * POST /api/v1/scan
 * Main scan endpoint — orchestrates adapter + algorithms.
 */
router.post(
  "/",
  scanRateLimit,
  authMiddleware,
  validate(scanSchema),
  async (req, res, next) => {
    try {
      const result = await runScan(req.validated);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
