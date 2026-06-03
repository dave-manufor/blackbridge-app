import bucketConfig from '../config/bucket.config';
import { S3 } from 'aws-sdk';
import { getSignedUrl as getCloudfrontSignedURL } from '@aws-sdk/cloudfront-signer';
import { isDevEnvironment } from '../utils/dev.utils';

// TODO: S3 Delete Logic
// Note to self: Use named exports for functions

const bucket = new S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: bucketConfig.REGION || 'auto', // Default to auto for Cloudflare R2
  ...(bucketConfig.ENDPOINT
    ? {
        endpoint: bucketConfig.ENDPOINT,
        s3ForcePathStyle: true, // Required for many S3-compatible providers like R2 and MinIO
      }
    : { useAccelerateEndpoint: true }),
});

const assertCDNConfig = () => {
  if (!bucketConfig.AWS_CLOUDFRONT_URL || !bucketConfig.AWS_CLOUDFRONT_KEY_PAIR_ID || !bucketConfig.STORAGE_CDN_PRIVATE_KEY) {
    throw new Error('Cloudfront is not properly configured');
  }
};

export const initiateMultiPartUpload = async (key: string, contentType: string) => {
  const params = {
    Bucket: bucketConfig.BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  };

  const upload = await bucket.createMultipartUpload(params).promise();

  return upload;
};

export const completeMultiPartUpload = async (key: string, uploadId: string, parts: { etag: string; part_index: number }[]) => {
  const params = {
    Bucket: bucketConfig.BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((part) => ({
        ETag: part.etag,
        PartNumber: part.part_index,
      })),
    },
  };

  await bucket.completeMultipartUpload(params).promise();
};

type PresignedUrlOptions =
  | {
      type: 'download';
      expiresIn?: number;
    }
  | {
      type: 'upload';
      isMultiPart?: false;
      expiresIn?: number;
      sizeLimit?: number;
    }
  | {
      type: 'upload';
      isMultiPart: true;
      uploadId: string;
      partNumber: number;
      expiresIn?: number;
      sizeLimit?: number;
    };

export const getPresignedUrl = async (key: string, options: PresignedUrlOptions) => {
  const params: {
    Bucket: string;
    Key: string;
    Expires: number;
    UploadId?: string;
    PartNumber?: number;
  } = {
    Bucket: bucketConfig.BUCKET_NAME,
    Key: key,
    Expires: options.expiresIn || bucketConfig.presignedUrl[options.type].EXPIRES_IN,
  };

  if (options.type === 'download') {
    if (isDevEnvironment() || bucketConfig.STORAGE_PROVIDER === 'cloudflare') {
      return await bucket.getSignedUrlPromise('getObject', params);
    } else {
      assertCDNConfig();
      const url = `${bucketConfig.AWS_CLOUDFRONT_URL}/${key}`;
      const expires_at = Date.now() + params.Expires * 1000;
      return getCloudfrontSignedURL({
        url,
        dateLessThan: new Date(expires_at),
        keyPairId: bucketConfig.AWS_CLOUDFRONT_KEY_PAIR_ID!,
        privateKey: bucketConfig.STORAGE_CDN_PRIVATE_KEY!,
      });
    }
  } else if (options.type === 'upload' && !options.isMultiPart) {
    return await bucket.getSignedUrlPromise('putObject', params);
  } else if (options.type === 'upload' && options.isMultiPart) {
    params.UploadId = options.uploadId;
    params.PartNumber = options.partNumber;
    return await bucket.getSignedUrlPromise('uploadPart', params);
  }

  throw new Error('Invalid Presigned URL Options');
};
