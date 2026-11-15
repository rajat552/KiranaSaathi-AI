import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './config/logger.js';

async function bootstrap() {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 KiranaSaathi AI Backend Server running on port ${env.PORT} (${env.NODE_ENV})`);
      logger.info(`API Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server and database connections successfully closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start application server', error);
    process.exit(1);
  }
}

bootstrap();
