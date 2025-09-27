import { SocketResponse } from 'custom';

export const successResponse = <T>(data?: T, message = 'Success'): SocketResponse<T> => ({
  isError: false,
  message,
  data,
});

export const errorResponse = <T>(message = 'Error', data?: T): SocketResponse<T> => ({
  isError: true,
  message,
  data,
});
