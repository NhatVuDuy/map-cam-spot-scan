import { z } from 'zod';

const VALID_SOURCES = ['overpass', 'goong', 'geojson', 'postgis'];
const VALID_CATEGORIES = ['intersection', 'school', 'hospital', 'park', 'market', 'hotel', 'conference', 'government'];

export const scanSchema = z.object({
  source: z.object({
    id: z.enum(VALID_SOURCES),
    config: z.record(z.unknown()).optional(),
  }),
  area: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().min(100).max(15000),
  }),
  categories: z
    .array(z.enum(VALID_CATEGORIES))
    .min(1, 'At least one category required'),
  options: z
    .object({
      maxResults: z.number().int().min(1).max(1000).optional(),
      includeRoads: z.boolean().optional(),
    })
    .optional(),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: first.message,
        field: first.path.join('.'),
      });
    }
    req.validated = result.data;
    next();
  };
}
