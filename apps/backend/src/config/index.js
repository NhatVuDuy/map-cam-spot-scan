import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  database: {
    url: process.env.DATABASE_URL || "",
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || "",
    apiKeyHeader: process.env.API_KEY_HEADER || "X-API-Key",
  },

  goong: {
    apiKey: process.env.GOONG_API_KEY || "",
  },

  overpass: {
    endpoints: (
      process.env.OVERPASS_ENDPOINTS ||
      "https://overpass-api.de/api/interpreter"
    ).split(","),
    timeoutMs: parseInt(process.env.OVERPASS_TIMEOUT_MS || "35000", 10),
  },

  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10),
  },
};
