import { Router } from 'express';
import { checkDbConnection } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const dbOk = await checkDbConnection();
  res.json({
    status: 'ok',
    db: dbOk ? 'connected' : 'unavailable',
    version: '1.0.0',
  });
});

export default router;
