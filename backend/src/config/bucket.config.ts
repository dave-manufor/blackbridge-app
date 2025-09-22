export default {
  /**AWS S3 bucket name */
  BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  /**AWS region */
  REGION: process.env.AWS_REGION,
  /**AWS S3 bucket name */
  ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  /**AWS secret access key */
  SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  /**Maximum bytes per multipart part */
  MAX_PART_SIZE: Number(process.env.MAX_PART_SIZE) || 15 * 1024 * 1024,
  /**Maximum bytes per block */
  MAX_BLOCK_SIZE: Number(process.env.MAX_BLOCK_SIZE) || 100 * 1024 * 1024,
  /**Full Cloudfront URL https://...*/
  AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL,
  /**Cloudfront key pair id */
  AWS_CLOUDFRONT_KEY_PAIR_ID: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID,
  /**Cloudfront private key */
  STORAGE_CDN_PRIVATE_KEY: process.env.STORAGE_CDN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  /**Presigned URL configurations */
  presignedUrl: {
    download: {
      /**Download presigned URL expiry in seconds */
      EXPIRES_IN: Number(process.env.PRESIGNED_URL_EXPIRES_IN_DOWNLOAD) || 1800,
    },
    upload: {
      /**Upload presigned URL expiry in seconds */
      EXPIRES_IN: Number(process.env.PRESIGNED_URL_EXPIRES_IN_UPLOAD) || 1800,
    },
  },
};
