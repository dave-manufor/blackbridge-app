export default {
  baseShareableUrl: process.env.BASE_SHAREABLE_URL || 'http://localhost:5174/p',
  downloadAuthorizationHeader: 'x-download-authorization',
  /** Transfer token duration (in milliseconds) */
  tokenValidDuration: 5 * 60 * 1000, // 5 minutes
};
