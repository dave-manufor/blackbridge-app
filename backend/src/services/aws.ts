import bucketConfig from '../config/bucket.config';
import { S3 } from 'aws-sdk';

// TODO: S3 Delete Logic
// Note to self: Use named exports for functions

const bucket = new S3({ apiVersion: '2006-03-01', signatureVersion: 'v4', useAccelerateEndpoint: true });

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
    return await bucket.getSignedUrlPromise('getObject', params);
  } else if (options.type === 'upload' && !options.isMultiPart) {
    return await bucket.getSignedUrlPromise('putObject', params);
  } else if (options.type === 'upload' && options.isMultiPart) {
    params.UploadId = options.uploadId;
    params.PartNumber = options.partNumber;
    return await bucket.getSignedUrlPromise('uploadPart', params);
  }

  throw new Error('Invalid Presigned URL Options');
};
