const otpConfig = {
  length: 6,
  digits: true,
  specialChars: false,
  upperCase: false,
  lowerCase: false,
  /** Duration for which the OTP is valid (in milliseconds) */
  requestValidDuration: 5 * 60 * 1000,
  /** Duration for which the token is valid (in milliseconds) */
  tokenValidDuration: 10 * 60 * 1000,
  /** Cooldown period for OTP requests (in milliseconds) */
  cooldownDuration: 1 * 60 * 1000,
  /** Time window for rate limiting (in milliseconds) for verification */
  rateLimitWindow: 10 * 60 * 1000,
  /** Maximum requests allowed within window for verification */
  rateLimitMax: 5,
  actionTypes: {
    ACCOUNT_VERIFICATION: 'ACCOUNT_VERIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
  },
  tokenSecret: process.env.OTP_TOKEN_SECRET || '',
  authorizationHeader: 'x-otp-authorization',
};

export default otpConfig;
