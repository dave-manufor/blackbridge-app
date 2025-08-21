import { Keys } from "./keys";

export interface Session {
  id: string;
  user_id: string;
  user_agent: string;
  browser: string;
  os: string;
  platform: string;
  device_name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  verified: boolean;
  profile_picture: string;
  salt: string;
  keys: Keys[];
  sessions: Session[];
}

export interface AccessToken {
  token: string;
  exp: number;
}
