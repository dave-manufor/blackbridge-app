import StatusCodes from 'config/StatusCodes.config';
import { SocketResponse } from 'custom';

export const successResponse = <T>(data?: T, message = 'Success', code = StatusCodes.OK): SocketResponse<T> => ({
  isError: false,
  message,
  data,
  code,
});

export const errorResponse = <T>(code: number, message = 'Error', data?: T): SocketResponse<T> => ({
  isError: true,
  message,
  data,
  code,
});
