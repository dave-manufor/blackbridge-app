import otpConfig from '../config/otp.config';
import otpGenerator from 'otp-generator';

export const generateOTP = () => {
  return otpGenerator.generate(otpConfig.length, {
    digits: otpConfig.digits,
    upperCaseAlphabets: otpConfig.upperCase,
    lowerCaseAlphabets: otpConfig.lowerCase,
    specialChars: otpConfig.specialChars,
  });
};
