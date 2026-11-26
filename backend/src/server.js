const { config, assertConfig } = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { aiStatusInfo } = require('./services/ai');
const logger = require('./utils/logger');

async function start() {
  const problems = assertConfig();
  if (problems.length) {
    problems.forEach((p) => logger.error(`Config error: ${p}`));
    process.exit(1);
  }

  try {
    await connectDB(config.mongoUri);
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('Could not connect to MongoDB. Is it running and is MONGODB_URI correct?', { error: err.message });
    process.exit(1);
  }

  const ai = aiStatusInfo();
  logger.info(ai.enabled ? `AI provider: ${ai.provider}` : `AI provider not active (${ai.reason}); basic analysis will be used`);
  logger.info(`Email transport: ${config.email.transport}`);

  const server = createApp().listen(config.port, () => logger.info(`API listening on http://localhost:${config.port}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
