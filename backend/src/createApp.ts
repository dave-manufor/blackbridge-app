import express from 'express';
import { Application } from 'express';
import logger from './lib/logger';
import StatusCodes from './config/StatusCodes.config';

export function createApp(config: { trustProxy: boolean; middlewares: any[]; controllers: any[] }): Application {
  const app = express();

  app.set('trust proxy', config.trustProxy);

  config.middlewares.forEach((middleware: any) => {
    app.use(middleware);
  });

  config.controllers.forEach((controller: any) => {
    app.use(controller.path, controller.router);
  });

  app.use((err: any, req: any, res: any, next: any) => {
    logger.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  });

  return app;
}
