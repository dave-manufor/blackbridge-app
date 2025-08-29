import express from 'express';
import { Application } from 'express';
import logger from './lib/logger';
import StatusCodes from './config/StatusCodes.config';

class App {
  public app: Application;
  public port: number;

  constructor(appInit: { port: number; middlewares: any[]; controllers: any[] }) {
    this.app = express();
    this.port = appInit.port;

    this.initializeMiddlewares(appInit.middlewares);
    this.initializeControllers(appInit.controllers);
    this.initializeGlobalErrorHandler();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`App listening on the port ${this.port}`);
    });
  }

  private initializeMiddlewares(middlewares: any[]) {
    middlewares.forEach((middleware: any) => {
      this.app.use(middleware);
    });
  }

  private initializeControllers(controllers: any[]) {
    controllers.forEach((controller: any) => {
      this.app.use(controller.path, controller.router);
    });
  }

  private initializeGlobalErrorHandler() {
    this.app.use((err: any, req: any, res: any, next: any) => {
      logger.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    });
  }
}

export default App;
