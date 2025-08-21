const jwtConfig = {
  accessToken: {
    name: 'AUTH_A',
    duration: 15 * 60 * 1000, // 15 minutes in milliseconds
    cacheTTL: 60, // 60 seconds
  },
  refreshToken: {
    name: 'AUTH_R',
    duration: 2 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
};

export default jwtConfig;
