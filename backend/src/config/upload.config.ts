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
  MAX_PART_SIZE: Number(process.env.MAX_FILE_SIZE) || 15 * 1024 * 1024,
  /**Maximum bytes per block */
  MAX_BLOCK_SIZE: Number(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024,
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
