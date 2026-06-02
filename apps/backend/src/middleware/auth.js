import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function authMiddleware(req, res, next) {
  if (config.auth.permissive) return next();

  // API Key check
  const apiKey = req.headers[config.auth.apiKeyHeader.toLowerCase()];
  if (apiKey && apiKey === process.env.API_KEY) return next();

  // JWT Bearer check
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), config.auth.jwtSecret);
      return next();
    } catch {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
    }
  }

  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
}
