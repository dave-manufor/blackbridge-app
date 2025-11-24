import logger from 'lib/logger';

if (!process.env.CROSS_ORIGIN) {
  logger.warn('CROSS_ORIGIN is not set. Defaulting to http://localhost:5174');
}

export default {
  origins: process.env.CROSS_ORIGIN ? process.env.CROSS_ORIGIN.split(',') : ['https://localhost:5174'],
  credentials: true,
};
