import bcrypt from 'bcrypt';

export async function hashRefreshToken(refreshToken: string) {
  return await bcrypt.hash(refreshToken, 10);
}

export async function verifyRefreshTokenHash(refreshToken: string, hashedToken: string) {
  return await bcrypt.compare(refreshToken, hashedToken);
}

export async function hashSessionKey(sessionKey: string) {
  return await bcrypt.hash(sessionKey, 10);
}

export async function verifySessionKeyHash(sessionKey: string, hashedKey: string) {
  return await bcrypt.compare(sessionKey, hashedKey);
}
export async function hashOTP(otp: string) {
  return await bcrypt.hash(otp, 10);
}

export async function verifyOTPHash(otp: string, hashedOtp: string) {
  return await bcrypt.compare(otp, hashedOtp);
}
