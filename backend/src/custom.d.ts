import otpConfig from './config/otp.config';

export interface JWTAuthPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
  key?: string; // Optional key for local session
}

export type OtpActionType = keyof typeof otpConfig.actionTypes;

export interface OtpRequest {
  user_id: string;
  action_type: OtpActionType;
  hashed_code: string;
}

export interface JWTOtpPayload {
  userId: string;
  jti: string;
  actionType: OtpActionType;
  iat: number;
  exp: number;
}

export interface JWTDownloadRequestPayload {
  id: string;
  userId: string | null;
  tid: string;
  iat: number;
  exp: number;
}

export interface PaginationDetails {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationDetails;
}

declare global {
  namespace Express {
    export interface Request {
      session?: JWTAuthPayload;
      downloadRequest?: JWTDownloadRequestPayload;
      consumeOtpToken?: () => Promise<void>;
    }
  }
}
