export const isDevEnvironment = () => {
  return process.env.NODE_ENV === 'development';
};

export const isBetaTesting = () => {
  if (!process.env.BETA_TESTING) return false;
  return String(process.env.BETA_TESTING).toLowerCase() === 'true';
};
