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

const port = Number(process.env.PORT) || 3000;
const crossOrigin = process.env.CROSS_ORIGIN || 'http://localhost:5174';
const corsOptions = {
  origin: crossOrigin,
  credentials: true,
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

let app: App;

(async () => {
  // Initialize database and cache
  await initDB();
  await initCache();
})()
  .then(() => {
    // Initialize app
    app = new App({
      port: port,
      middlewares: [
        express.json(),
        express.urlencoded({ extended: true }),
        helmet(),
        cors(corsOptions),
        cookieParser(),
        useragent.express(),
        httpLogger,
      ],
      controllers: [new HomeController(), new AuthController(), new UserController(), new FileController(), new TransferController()],
    });
  })
  .then(() => {
    // Start the app
    app.listen();
  })
  .catch((error) => {
    logger.error('Error during initialization:', error);
    process.exit(1);
  });

export default app;
