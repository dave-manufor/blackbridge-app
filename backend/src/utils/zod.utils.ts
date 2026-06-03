import { z, ZodError } from 'zod';

export const prettyZodErrors = (error: ZodError): { path: string; message: string }[] => {
  return error.errors.map((issue) => ({
    path: issue.path.join('.'),
    message: `${issue.path.join('.')} is ${issue.message}`,
  }));
};
