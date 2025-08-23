import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import StatusCodesConfig from '../config/StatusCodes.config';
import logger from '../lib/logger';
import { prettyZodErrors } from 'utils/zod';

export const bodyValidator = <T>(resolveSchema: (type: T) => ZodTypeAny) => {
  return (type: T) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const schema = resolveSchema(type);
      try {
        schema.parse(req.body || {});
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessages = prettyZodErrors(error);
          res.status(StatusCodesConfig.BAD_REQUEST).json({ message: 'Invalid Data', details: errorMessages });
          return;
        } else {
          logger.error(error, `Error Validating request body against ${type}`);
          res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
      }
    };
  };
};
