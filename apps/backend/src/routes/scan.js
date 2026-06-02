import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, scanSchema } from '../middleware/validate.js';
import { scanLimiter } from '../middleware/rateLimit.js';
import { runScan } from '../services/scanService.js';

const router = Router();

router.post(
  '/',
  scanLimiter,
  authMiddleware,
  validateBody(scanSchema),
  async (req, res, next) => {
    try {
      const result = await runScan(req.validated);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
