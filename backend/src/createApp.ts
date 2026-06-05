import express from 'express';
import path from 'path';
import { Application } from 'express';
import logger from './lib/logger';
import StatusCodes from './config/StatusCodes.config';
import { Server, Socket } from 'socket.io';

export function createApp(config: {
  trustProxy: boolean;
  middlewares: any[];
  controllers: any[];
  eventHandlers?: ((io: Server, socket: Socket) => void)[];
  eventMiddlewares?: ((socket: Socket, next: (err?: Error) => void) => void)[];
}): Application {
  const app = express();

  app.set('trust proxy', config.trustProxy);

  config.middlewares.forEach((middleware: any) => {
    app.use(middleware);
  });

  // Serve static files from the built Vite frontend
  const frontendPath = path.join(process.cwd(), 'frontend/dist');
  app.use(express.static(frontendPath));

  // Mount API controllers under /api

  config.controllers.forEach((controller: any) => {
    app.use(`/api${controller.path === '/' ? '' : controller.path}`, controller.router);
  });

  // 404 handler for API routes
  app.use('/api', (req: any, res: any) => {
    res.status(StatusCodes.NOT_FOUND).json({ message: 'Not Found' });
  });

  // SPA Fallback - Serve index.html for unknown GET requests (so React Router works)
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'GET') {
      res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
    } else {
      next();
    }
  });

  app.use((err: any, req: any, res: any, next: any) => {
    logger.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  });

  return app;
}
