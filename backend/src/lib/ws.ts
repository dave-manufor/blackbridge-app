import { Server, ServerOptions, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import corsConfig from 'config/cors.config';
import logger from './logger';

const socketOptions: Partial<ServerOptions> = {
  path: '/ws',
  cors: {
    origin: corsConfig.origins,
    credentials: corsConfig.credentials,
  },
};

const initializeSocket = (
  server: HttpServer,
  eventHandlers?: ((io: Server, socket: Socket) => void)[],
  middlewares?: Parameters<InstanceType<typeof Server>['use']>,
) => {
  const io = new Server(server, socketOptions);
  middlewares?.forEach((middleware) => {
    io.use(middleware);
  });
  io.on('connection', (socket) => {
    logger.trace(`New connection from: ${socket.id}`);
    eventHandlers.forEach((handler) => handler(io, socket));
    socket.on('disconnect', () => {
      logger.trace(`Socket disconnected: ${socket.id}`);
    });
  });
  return io;
};

export default initializeSocket;
