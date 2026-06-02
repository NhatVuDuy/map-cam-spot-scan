import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  db: {
    url: process.env.DATABASE_URL || null,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
    // When neither JWT_SECRET nor an API key env var is set to a real value,
    // auth middleware runs in permissive mode (useful for local dev).
    permissive: !process.env.JWT_SECRET && !process.env.API_KEY,
  },

  goong: {
    apiKey: process.env.GOONG_API_KEY || null,
  },

  overpass: {
    endpoints: (process.env.OVERPASS_ENDPOINTS || 'https://overpass-api.de/api/interpreter')
      .split(',')
      .map((e) => e.trim()),
    timeoutMs: parseInt(process.env.OVERPASS_TIMEOUT_MS || '35000', 10),
  },

  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  },
};
