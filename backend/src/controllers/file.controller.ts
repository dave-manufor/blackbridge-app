import logger from '../lib/logger';
import { verifyToken } from '../middlewares/auth.middleware';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import StatusCodesConfig from '../config/StatusCodes.config';
import { v4 as uuid_v4 } from 'uuid';
import uploadConfig from '../config/upload.config';
import db, { useSerializableTransaction } from '../services/db';
import { completeMultiPartUpload, getPresignedUrl, initiateMultiPartUpload } from '../services/aws';
import { FILE_STATUS, Prisma, TRANSFER_STATUS, TRANSFER_TYPE } from '@prisma/client';
import { bodyValidator } from '../middlewares/validation.middleware';
import pLimit from 'p-limit';

class FileController {
  public path = '/files';
  public router = Router();
  private fileLogger = logger.child({ module: 'File Controller' });

  constructor() {
    this.initializeRoutes();
    this.fileLogger.trace('File Controller initialized');
  }

  private initializeRoutes() {
    // TODO: Implement the following routes
    // GET / - Get all files uploaded by the user
    // GET /:id - Get file by ID
    this.router.post('/upload/request', verifyToken(), this.validateBody('requestUpload'), this.requestUpload);
    this.router.post('/upload/announce', verifyToken(), this.validateBody('announceUpload'), this.announceUpload);
    this.router.post('/upload/retry', verifyToken(), this.validateBody('retryUpload'), this.retryUpload);
    this.router.post('/upload/finalize/block', verifyToken(), this.validateBody('finalizeBlock'), this.finalizeBlock);
    this.router.post('/upload/finalize', verifyToken(), this.validateBody('finalizeFile'), this.finalizeFile);
    // POST /:id/download-request - Request to download a file (pre-sign)
    // DELETE /:id - Delete a file by ID
  }

  private requestUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { transfer_id, name, content_type, size, metadata } = req.body as BodyTypeToShape<'requestUpload'>;

    try {
      // Check if transfer has been exists
      const existingTransfer = await db.transfers.findUnique({
        where: { id: transfer_id },
      });

      if (!existingTransfer) {
        res.status(StatusCodesConfig.NOT_FOUND).json({
          message: 'Transfer not found',
        });
        return;
      }

      // Check if user has permission
      if (existingTransfer.owner_user_id !== userId) {
        res.status(StatusCodesConfig.FORBIDDEN).json({
          message: 'User does not have permission to access this transfer',
        });
        return;
      }

      // Check if transfer has not been committed
      if (existingTransfer.status !== TRANSFER_STATUS.PENDING) {
        res.status(StatusCodesConfig.BAD_REQUEST).json({
          message: 'Transfer has already been processed',
        });
        return;
      }

      // Set up blocks
      const numberOfBlocks = Math.ceil(size / uploadConfig.MAX_BLOCK_SIZE);
      const blocksArr: {
        index: number;
        path: string;
        size: number;
      }[] = [];

      for (let i = 0; i < numberOfBlocks; i++) {
        let blockSize: number;
        if (i === numberOfBlocks - 1) {
          // Last part
          if (size % uploadConfig.MAX_BLOCK_SIZE === 0) {
            // No remainder means that the last block is the same size as the max block size
            blockSize = uploadConfig.MAX_BLOCK_SIZE;
          } else {
            blockSize = size % uploadConfig.MAX_BLOCK_SIZE;
          }
        } else {
          blockSize = uploadConfig.MAX_BLOCK_SIZE;
        }

        const blockKey = uuid_v4();

        blocksArr.push({
          index: i + 1,
          path: blockKey,
          size: blockSize,
        });
      }

      let file: Prisma.FilesGetPayload<{}>;
      let blocks: Prisma.FileBlocksGetPayload<{}>[] = [];

      await useSerializableTransaction(async (tx) => {
        // Create pending file and file blocks
        file = await tx.files.create({
          data: {
            transfer_id: transfer_id,
            user_id: userId,
            name,
            content_type,
            size: size,
            metadata: metadata ? JSON.parse(metadata) : null,
          },
        });

        blocks = await tx.fileBlocks.createManyAndReturn({
          data: blocksArr.map((block) => ({
            ...block,
            file_id: file.id,
          })),
        });
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Upload request successful',
        data: {
          file_id: file.id,
          blocks: blocks.map((block) => ({
            id: block.id,
            index: block.index,
            path: block.path,
            size: block.size,
          })),
        },
      });
      return;
    } catch (error) {
      this.fileLogger.error(error, 'Error requesting upload');
      console.error(error);
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private announceUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { block_id } = req.body as BodyTypeToShape<'announceUpload'>;

    const _block = await db.fileBlocks.findUnique({
      where: {
        id: block_id,
      },
      include: {
        file: true,
      },
    });

    // Check if block exists
    if (!_block) {
      res.status(StatusCodesConfig.NOT_FOUND).json({
        message: 'Block not found',
      });
      return;
    }

    // Check if user has permission to block
    if (_block.file.user_id !== userId) {
      res.status(StatusCodesConfig.FORBIDDEN).json({
        message: 'You do not have permission to access this block',
      });
      return;
    }

    try {
      // Initiate multipart upload
      const { UploadId } = await initiateMultiPartUpload(_block.path, '');
      // Set upload ID block status to processing
      const block = await db.fileBlocks.update({
        where: {
          id: block_id,
          status: FILE_STATUS.PENDING,
        },
        data: {
          upload_id: UploadId,
          status: FILE_STATUS.PROCESSING,
        },
      });

      if (!block) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'Block already processed' });
        return;
      }
      // Determine and return parts
      const numberOfParts = Math.ceil(block.size / uploadConfig.MAX_PART_SIZE);

      // TODO: Refactor to run presignedURL fetch concurrently
      const parts: UploadPart[] = [];

      for (let i = 0; i < numberOfParts; i++) {
        let partSize: number;
        if (i === numberOfParts - 1) {
          // Last part
          if (block.size % uploadConfig.MAX_PART_SIZE === 0) {
            // No remainder means that the last part is the same size as the max part size
            partSize = uploadConfig.MAX_PART_SIZE;
          } else {
            partSize = block.size % uploadConfig.MAX_PART_SIZE;
          }
        } else {
          partSize = uploadConfig.MAX_PART_SIZE;
        }

        const presignedUrl = await getPresignedUrl(block.path, {
          type: 'upload',
          isMultiPart: true,
          uploadId: block.upload_id,
          partNumber: i + 1,
        });

        const part: UploadPart = {
          block_id: block.id,
          part_index: i + 1,
          part_size: partSize,
          presigned_url: presignedUrl,
        };

        parts.push(part);
      }

      res.status(StatusCodesConfig.OK).json({
        message: 'Upload announce successful',
        data: parts,
      });
    } catch (error) {
      this.fileLogger.error(error, 'Error announcing upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private retryUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { block_id, failed_parts } = req.body as BodyTypeToShape<'retryUpload'>;

    try {
      const block = await db.fileBlocks.findUnique({
        where: {
          id: block_id,
        },
        include: {
          file: true,
        },
      });

      if (!block) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'Block not found' });
        return;
      }

      if (block.file.user_id !== userId) {
        res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'You do not have permission to access this block' });
        return;
      }

      if (block.status !== FILE_STATUS.PROCESSING) {
        res.status(StatusCodesConfig.BAD_REQUEST).json({ message: 'Block is not in processing state' });
        return;
      }

      const limit = pLimit(10);
      const getNewParts = failed_parts.map((part) => {
        return limit(async () => {
          const presignedUrl = await getPresignedUrl(block.path, {
            type: 'upload',
            isMultiPart: true,
            uploadId: block.upload_id,
            partNumber: part.part_index,
          });

          return {
            ...part,
            presigned_url: presignedUrl,
          } as UploadPart;
        });
      });

      const newParts = await Promise.all(getNewParts);

      res.status(StatusCodesConfig.OK).json({
        message: 'Retry successful',
        data: newParts,
      });
    } catch (error) {
      this.fileLogger.error(error, 'Error retrying upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private finalizeBlock = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { block_key, parts, encrypted_size } = req.body as BodyTypeToShape<'finalizeBlock'>;

    const block = await db.fileBlocks.findUnique({
      where: {
        path: block_key,
      },
      include: {
        file: true,
      },
    });

    // Check if block exists
    if (!block) {
      res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'Block not found' });
      return;
    }

    // Check if user has permission to block
    if (block.file.user_id !== userId) {
      res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'You do not have permission to access this file' });
      return;
    }

    // Check if block is in processing state
    if (block.status !== FILE_STATUS.PROCESSING) {
      res.status(StatusCodesConfig.BAD_REQUEST).json({ message: 'Block is not in processing state' });
      return;
    }

    try {
      try {
        await completeMultiPartUpload(
          block_key,
          block.upload_id,
          parts as {
            etag: string;
            part_index: number;
          }[],
        );
      } catch (error) {
        this.fileLogger.error(error, 'Error completing multipart upload. Changing status to failed');
        await db.fileBlocks.update({
          where: {
            path: block_key,
          },
          data: {
            status: FILE_STATUS.FAILED,
          },
        });
        res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        return;
      }
      await db.fileBlocks.update({
        where: {
          path: block_key,
        },
        data: {
          status: FILE_STATUS.UPLOADED,
          encrypted_size: encrypted_size,
        },
      });

      res.status(StatusCodesConfig.ACCEPTED).json({
        message: 'Upload completed successfully',
      });
    } catch (error) {
      this.fileLogger.error(error, 'Error completing block upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private finalizeFile = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { file_id } = req.body as BodyTypeToShape<'finalizeFile'>;

    try {
      // Check if file exists
      const file = await db.files.findUnique({
        where: {
          id: file_id,
        },
      });

      if (!file) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'File not found' });
        return;
      }
      // Check user has permissions to file
      if (file.user_id !== userId) {
        res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'You do not have permission to access this file' });
      }
      // Check if all blacks are uploaded
      const pendingBlocks = await db.fileBlocks.findMany({
        where: {
          file_id,
          NOT: {
            status: FILE_STATUS.UPLOADED,
          },
        },
      });
      if (pendingBlocks.length > 0) {
        res.status(StatusCodesConfig.BAD_REQUEST).json({
          message: 'Pending block uploads',
          details: {
            blocks: pendingBlocks,
          },
        });
        return;
      }
      // Set file status to uploaded
      await db.files.update({
        where: {
          id: file_id,
        },
        data: {
          status: FILE_STATUS.UPLOADED,
        },
      });

      res.status(StatusCodesConfig.ACCEPTED).json({ message: 'File upload finalized' });
    } catch (error) {
      this.fileLogger.error(error, 'Error finalizing file upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getValidationSchema = <T extends BodyType>(type: T): SchemaMap[T] => {
    return schemas[type];
  };

  private validateBody = bodyValidator(this.getValidationSchema);
}

type BodyType = 'requestUpload' | 'announceUpload' | 'retryUpload' | 'finalizeBlock' | 'finalizeFile';

interface UploadPart {
  block_id: string;
  part_index: number;
  part_size: number;
  presigned_url: string;
}

const requestUploadSchema = z.object({
  transfer_id: z.string().uuid(),
  name: z.string(),
  content_type: z.string(),
  size: z.number(),
  metadata: z
    .string({ invalid_type_error: 'Expected JSON string' })
    .refine((data) => {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
});

const announceUploadSchema = z.object({
  block_id: z.string(),
});

const retryUploadSchema = z.object({
  block_id: z.string(),
  failed_parts: z.array(
    z.object({
      block_id: z.string(),
      part_index: z.number().positive(),
      part_size: z.number().positive(),
      presigned_url: z.string(),
    }),
  ),
});

const finalizeBlockSchema = z.object({
  block_key: z.string(),
  encrypted_size: z.number().positive(),
  parts: z
    .array(
      z.object({
        etag: z.string(),
        part_index: z.number().positive(),
      }),
    )
    .nonempty('Parts array cannot be empty'),
});

const finalizeFileSchema = z.object({
  file_id: z.string(),
});

const schemas = {
  requestUpload: requestUploadSchema,
  announceUpload: announceUploadSchema,
  retryUpload: retryUploadSchema,
  finalizeBlock: finalizeBlockSchema,
  finalizeFile: finalizeFileSchema,
} as const;

type SchemaMap = typeof schemas;

type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default FileController;
