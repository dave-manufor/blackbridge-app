import cacheConfig from '../config/cache.config';
import logger from '../lib/logger';
import { createClient } from 'redis';

const rawHost = process.env.REDIS_HOST ? process.env.REDIS_HOST.replace(/^https?:\/\//, '') : '';
const isUpstash = rawHost.includes('upstash.io');

const config = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL } 
  : process.env.REDIS_USERNAME && process.env.REDIS_PASSWORD
    ? {
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: rawHost,
          port: Number(process.env.REDIS_PORT),
          tls: isUpstash || process.env.REDIS_TLS === 'true',
        },
      }
    : {
        socket: {
          host: rawHost,
          port: Number(process.env.REDIS_PORT),
          tls: isUpstash || process.env.REDIS_TLS === 'true',
        },
      };

let cache = createClient(config)
  .on('error', (err) => {
    console.error(err);
    logger.error(err, 'Redis Client Error');
  })
  .on('ready', () => {
    logger.trace('Redis Client Connected');
  })
  .on('disconnect', () => {
    logger.info('Redis Client Disconnected');
  });

// Initialization will be handled explicitly via initCache()

export const initCache = async () => {
  try {
    if (!cache.isOpen) {
      await cache.connect();
    }
  } catch (error) {
    logger.error(error, 'Redis Connection Error');
  }
};

export const deleteUserSessions = async (userId: string) => {
  const pattern = `${cacheConfig.ID_Prefix.Session}${userId}:*`;
  const stream = cache.scanIterator({ MATCH: pattern });
  const keysToDelete: string[] = [];

  for await (const keys of stream) {
    if (keys.length) {
      keysToDelete.push(...keys);
    }
  }

  if (keysToDelete.length) {
    await cache.del(keysToDelete);
  }

  return keysToDelete.length;
};

export default cache;
