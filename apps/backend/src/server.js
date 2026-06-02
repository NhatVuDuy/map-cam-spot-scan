import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import sourcesRouter from './routes/sources.js';
import scanRouter from './routes/scan.js';
import exportRouter from './routes/export.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);

app.use('/api/health', healthRouter);
app.use('/api/v1/sources', sourcesRouter);
app.use('/api/v1/scan', scanRouter);
app.use('/api/v1/export', exportRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
