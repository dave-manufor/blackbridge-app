import express from 'express';
import { Application } from 'express';
import logger from './lib/logger';
import StatusCodes from './config/StatusCodes.config';
import { isDevEnvironment } from 'utils/dev.utils';
import { readFileSync } from 'fs';
import https from 'https';
import http from 'http';
import { Server, Socket } from 'socket.io';
import initializeSocket from 'lib/ws';

class App {
  public app: Application;
  public socket: Server;
  public server: http.Server | https.Server;
  public port: number;

  constructor(appInit: {
    port: number;
    trustProxy: boolean;
    middlewares: any[];
    controllers: any[];
    eventHandlers?: ((io: Server, socket: Socket) => void)[];
    eventMiddlewares?: ((socket: Socket, next: (err?: Error) => void) => void)[];
  }) {
    this.app = express();
    this.port = appInit.port;

    this.app.set('trust proxy', appInit.trustProxy);

    this.initializeMiddlewares(appInit.middlewares);
    this.initializeControllers(appInit.controllers);
    this.initializeGlobalErrorHandler();

    if (isDevEnvironment()) {
      const certificateFile = readFileSync('./certs/cert.pem');
      const keyFile = readFileSync('./certs/key.pem');
      const credentials = { key: keyFile, cert: certificateFile };

      this.server = https.createServer(credentials, this.app);
    } else {
      this.server = http.createServer(this.app);
    }

    this.socket = initializeSocket(this.server, appInit.eventHandlers, appInit.eventMiddlewares);
  }

  public listen() {
    this.server.listen(this.port, () => {
      logger.info(`Server and socket listening on port ${this.port}`);
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
