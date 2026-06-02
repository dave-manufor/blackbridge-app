import 'dotenv/config';
import express from 'express';
import { createApp } from './createApp';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import useragent from 'express-useragent';
import { initCache } from './services/cache';
import logger, { httpLogger } from './lib/logger';
import { HomeController, AuthController, UserController, FileController, TransferController } from './controllers';
import { initDB } from './services/db';
import AWS from 'aws-sdk';
import nocache from 'nocache';
import { readFileSync } from 'fs';
import { isDevEnvironment } from './utils/dev.utils';
import https from 'https';

const port = Number(process.env.PORT) || 4000;
const crossOrigin = process.env.CROSS_ORIGIN ? process.env.CROSS_ORIGIN.split(',') : ['http://localhost:5174'];
const corsOptions = {
  origin: crossOrigin,
  credentials: true,
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Global BigInt to JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return parseInt(this.toString());
};

const isServerless = process.env.SERVERLESS === 'true' || process.env.VERCEL === '1';
let isInitialized = false;

const ensureInitialized = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (isServerless && !isInitialized) {
    await initDB();
    await initCache();
    isInitialized = true;
  }
  next();
};

const app = createApp({
  trustProxy: true,
  middlewares: [
    ensureInitialized,
    express.json(),
    express.urlencoded({ extended: true }),
    helmet(),
    nocache(),
    cors(corsOptions),
    cookieParser(),
    useragent.express(),
    httpLogger,
  ],
  controllers: [new HomeController(), new AuthController(), new UserController(), new FileController(), new TransferController()],
});

if (!isServerless) {
  (async () => {
    // Initialize database and cache
    await initDB();
    await initCache();
  })()
    .then(() => {
      // Start the app
      if (isDevEnvironment()) {
        const certificateFile = readFileSync('./certs/cert.pem');
        const keyFile = readFileSync('./certs/key.pem');

        const credentials = { key: keyFile, cert: certificateFile };
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
          logger.info(`HTTPS Server listening on port ${port}`);
        });
      } else {
        app.listen(port, () => {
          logger.info(`App listening on the port ${port}`);
        });
      }
    })
    .catch((error) => {
      logger.error('Error during initialization:', error);
      process.exit(1);
    });
}

export default app;

