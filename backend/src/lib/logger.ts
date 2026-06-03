import { randomUUID } from 'crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Server } from 'socket.io';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const serializers = {
  req: isProd
    ? pino.stdSerializers.req
    : (req: any) => {
        return {
          method: req.method,
          url: req.url,
          headers: req.headers,
        };
      },
  res: isProd
    ? pino.stdSerializers.res
    : (res: any) => {
        return {
          statusCode: res.statusCode,
        };
      },
};

export const httpLogger = pinoHttp({
  logger: logger,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  serializers,
});

export const socketLogger = (io: Server): void => {
  // Attach middleware to assign a trace ID
  io.use((socket, next) => {
    socket.data.traceId = randomUUID();
    socket.data.connectedAt = new Date().toISOString();

    logger.info({
      event: 'connection',
      socket_id: socket.id,
      namespace: socket.nsp.name,
      remote_ip: socket.handshake.address,
      trace_id: socket.data.traceId,
    });

    next();
  });

  io.on('connection', (socket) => {
    // Disconnection logs
    socket.on('disconnect', (reason) => {
      logger.info({
        event: 'disconnection',
        socket_id: socket.id,
        namespace: socket.nsp.name,
        reason,
        trace_id: socket.data.traceId,
      });
    });

    // Log all incoming events
    socket.onAny((event, ...args) => {
      logger.info({
        event: 'socket_event',
        event_name: event,
        direction: 'incoming',
        socket_id: socket.id,
        namespace: socket.nsp.name,
        payload_size: args ? JSON.stringify(args).length : 0,
        trace_id: socket.data.traceId,
      });
    });

    // Wrap outgoing emits to log them
    const emit = socket.emit;
    socket.emit = function (eventName: string, payload?: any) {
      logger.info({
        event: 'socket_event',
        event_name: eventName,
        direction: 'outgoing',
        socket_id: socket.id,
        namespace: socket.nsp.name,
        payload_size: payload ? JSON.stringify(payload).length : 0,
        trace_id: socket.data.traceId,
      });

      return emit.apply(this, arguments as any);
    };
  });
};

export default logger;
