import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const isProd = process.env.NODE_ENV === 'production';

const serializers = {
  req: isProd
    ? pino.stdSerializers.req
    : (req) => {
        return {
          method: req.method,
          url: req.url,
          headers: req.headers,
        };
      },
  res: isProd
    ? pino.stdSerializers.res
    : (res) => {
        return {
          statusCode: res.statusCode,
        };
      },
};

export const httpLogger = pinoHttp({
  logger: logger,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  serializers,
});

export default logger;
