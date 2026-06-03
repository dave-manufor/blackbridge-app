import 'dotenv/config';
import express from 'express';
import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';
import { createApp } from './createApp';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import useragent from 'express-useragent';
import { initCache } from './services/cache';
import logger, { httpLogger } from './lib/logger';
import { HomeController, AuthController, UserController, FileController, TransferController, ImageController } from './controllers';
import { initDB } from './services/db';
import AWS from 'aws-sdk';
import nocache from 'nocache';
import corsConfig from './config/cors.config';
import { registerSignalingHandlers } from './handlers';
import { verifyTokenSocket } from './middlewares/auth.middleware';
import { isDevEnvironment } from './utils/dev.utils';
import initializeSocket from './lib/ws';

const port = Number(process.env.PORT) || 4000;
const corsOptions = {
  origin: corsConfig.origins,
  credentials: corsConfig.credentials,
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

const eventHandlers = [registerSignalingHandlers()];
const eventMiddlewares = [verifyTokenSocket()];

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
  controllers: [
    new HomeController(),
    new AuthController(),
    new UserController(),
    new FileController(),
    new TransferController(),
    new ImageController(),
  ],
  eventHandlers,
  eventMiddlewares,
});

if (!isServerless) {
  (async () => {
    // Initialize database and cache
    await initDB();
    await initCache();
  })()
    .then(() => {
      // Start the server with Socket.io support
      if (isDevEnvironment()) {
        const certificateFile = readFileSync('./certs/cert.pem');
        const keyFile = readFileSync('./certs/key.pem');

        const credentials = { key: keyFile, cert: certificateFile };
        const httpsServer = https.createServer(credentials, app);
        initializeSocket(httpsServer, eventHandlers, eventMiddlewares);
        httpsServer.listen(port, () => {
          logger.info(`HTTPS Server and socket listening on port ${port}`);
        });
      } else {
        const httpServer = http.createServer(app);
        initializeSocket(httpServer, eventHandlers, eventMiddlewares);
        httpServer.listen(port, () => {
          logger.info(`Server and socket listening on port ${port}`);
        });
      }
    })
    .catch((error) => {
      logger.error('Error during initialization:', error);
      process.exit(1);
    });
}

export default app;
