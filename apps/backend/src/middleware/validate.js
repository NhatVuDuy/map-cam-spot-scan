import { z } from "zod";

const VALID_CATEGORIES = [
  "intersection", "school", "hospital", "park",
  "market", "hotel", "conference", "government",
];

const VALID_SOURCES = ["overpass", "goong", "geojson", "postgis"];

export const scanSchema = z.object({
  source: z.object({
    id: z.enum(VALID_SOURCES),
    config: z.object({
      endpoint: z.string().url().optional(),
      apiKey: z.string().optional(),
      geojsonData: z.any().optional(),
    }).optional().default({}),
  }),
  area: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().min(100).max(15000),
  }),
  categories: z
    .array(z.enum(VALID_CATEGORIES))
    .min(1, "At least one category required")
    .default(VALID_CATEGORIES),
  options: z.object({
    maxResults: z.number().int().min(1).max(1000).default(500),
    includeRoads: z.boolean().default(true),
  }).optional().default({}),
});

/**
 * Validate request body against a Zod schema.
 * Returns 400 with structured error on failure.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: firstIssue.message,
        field: firstIssue.path.join("."),
        issues: result.error.issues,
      });
    }
    req.validated = result.data;
    next();
  };
}
