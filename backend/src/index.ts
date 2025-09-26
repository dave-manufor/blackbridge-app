import 'dotenv/config';
import express from 'express';
import App from './app';
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
import corsConfig from 'config/cors.config';

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

const server: App = new App({
  port: port,
  trustProxy: true,
  middlewares: [
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

(async () => {
  // Initialize database and cache
  await initDB();
  await initCache();
})()
  .then(() => {
    // Start the app
    server.listen();
  })
  .catch((error) => {
    logger.error('Error during initialization:', error);
    process.exit(1);
  });

export default server.app;
