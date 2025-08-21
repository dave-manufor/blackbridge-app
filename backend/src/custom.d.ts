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

declare global {
  namespace Express {
    export interface Request {
      session?: JWTAuthPayload;
      consumeOtpToken?: () => Promise<void>;
    }
  }
}
