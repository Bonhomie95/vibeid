import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { connectDB } from './config/db';
import { router } from './routes';
import { errorHandler, notFound } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '12mb' })); // base64 selfies can be ~3-4MB
  if (config.nodeEnv !== 'test') app.use(morgan('dev'));
  app.use('/api', router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] vibe-id-backend listening on :${config.port} (mockAi=${config.mockAi})`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[fatal]', err);
    process.exit(1);
  });
}
