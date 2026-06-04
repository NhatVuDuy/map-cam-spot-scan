import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

/**
 * Optional auth middleware.
 * If JWT_SECRET is not configured, auth is bypassed (development mode).
 * Accepts either:
 *   - Bearer token in Authorization header (JWT)
 *   - API key in X-API-Key header (or configured header name)
 */
export function authMiddleware(req, res, next) {
  const jwtSecret = config.auth.jwtSecret;
  const apiKeyHeader = config.auth.apiKeyHeader;

  // If no secret configured, skip auth entirely
  if (!jwtSecret || jwtSecret === "change-me-in-production") {
    return next();
  }

  // Check API key
  const apiKey = req.headers[apiKeyHeader.toLowerCase()];
  if (apiKey) {
    // Simple API key validation — in production compare against DB/env
    if (apiKey === process.env.VALID_API_KEY) {
      req.auth = { type: "apikey" };
      return next();
    }
  }

  // Check Bearer JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.auth = { type: "jwt", payload: decoded };
      return next();
    } catch (err) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  }

  // No credentials
  return res.status(401).json({
    error: "UNAUTHORIZED",
    message: "Authentication required",
  });
}
