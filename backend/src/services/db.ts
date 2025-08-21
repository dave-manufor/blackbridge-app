import dbConfig from '../config/db.config';
import logger from '../lib/logger';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const db = new PrismaClient({
  omit: {
    users: {
      verifier: true,
    },
    keys: {
      user_id: true,
    },
  },
});

export const initDB = async () => {
  try {
    await db.$connect();
    logger.info('Database Connected');
  } catch (error) {
    logger.error(error, 'Database Connection Error');
  }
};

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export const useSerializableTransaction = async <T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> => {
  const MAX_RETRIES = dbConfig.MAX_RETRIES || 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await db.$transaction(callback, {
        isolationLevel: 'Serializable',
      });
      return result;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2034' // Serialization failure
      ) {
        attempt++;
        logger?.warn?.(`Serializable transaction failed. Retrying... (${attempt}/${MAX_RETRIES})`);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries reached for serializable transaction');
};

export default db;
