import bucketConfig from '../config/bucket.config';
import { S3 } from 'aws-sdk';
import { getSignedUrl as getCloudfrontSignedURL } from 'aws-cloudfront-sign';
import { isDevEnvironment } from 'utils/dev.utils';

// TODO: S3 Delete Logic
// Note to self: Use named exports for functions

const bucket = new S3({ apiVersion: '2006-03-01', signatureVersion: 'v4', useAccelerateEndpoint: true });

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
    if (isDevEnvironment()) {
      return await bucket.getSignedUrlPromise('getObject', params);
    } else {
      assertCDNConfig();
      const url = `${bucketConfig.AWS_CLOUDFRONT_URL}/${key}`;
      const expires_at = Date.now() + params.Expires * 1000;
      return getCloudfrontSignedURL(url, {
        keypairId: bucketConfig.AWS_CLOUDFRONT_KEY_PAIR_ID!,
        privateKeyString: bucketConfig.STORAGE_CDN_PRIVATE_KEY!,
        expireTime: expires_at,
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
