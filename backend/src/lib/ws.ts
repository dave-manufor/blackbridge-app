import { Server, ServerOptions, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import corsConfig from '../config/cors.config';
import logger, { socketLogger } from './logger';

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
  middlewares?: ((socket: Socket, next: (err?: Error) => void) => void)[],
) => {
  const io = new Server(server, socketOptions);

  // Attach logging middleware
  socketLogger(io);
  middlewares?.forEach((middleware) => {
    io.use(middleware);
  });
  io.on('connection', (socket) => {
    // Register event handlers
    eventHandlers.forEach((handler) => handler(io, socket));
  });
  return io;
};

export default initializeSocket;
