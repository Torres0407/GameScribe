import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initDatabase } from './config/db';
import { GenerationQueueService } from './services/generation.service';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiRouter } from './routes/api.router';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(apiRateLimiter);

// Healthcheck endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GameScribe API', timestamp: new Date().toISOString() });
});

// Mount /api/v1 router
app.use('/api/v1', apiRouter);

// Global Error Handler
app.use(errorHandler);

async function bootstrap() {
  await initDatabase();
  GenerationQueueService.initQueue();

  app.listen(env.PORT, () => {
    logger.info(`🚀 GameScribe Express API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

bootstrap().catch(err => {
  logger.error({ err }, 'Failed to bootstrap GameScribe API server');
});
