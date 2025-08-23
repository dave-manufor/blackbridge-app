import StatusCodes from '../config/StatusCodes.config';
import logger from '../lib/logger';
import { verifyToken } from '../middlewares/auth.middleware';
import { bodyValidator } from '../middlewares/validation.middleware';
import { FILE_STATUS, TRANSFER_STATUS, TRANSFER_TYPE, Prisma } from '@prisma/client';
import db, { useSerializableTransaction } from '../services/db';
import { PGPValidator } from '../utils/PGPValidator';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prettyZodErrors } from 'utils/zod';
import { PaginationDetails } from 'custom';
import { getPaginationResult } from 'utils/prisma';

class TransferController {
  public path = '/transfers';
  public router = Router();
  private transferLogger = logger.child({ module: 'Transfer Controller' });

  constructor() {
    this.initializeRoutes();
    this.transferLogger.trace('Transfer Controller initialized');
  }

  private initializeRoutes() {
    // TODO: Implement the following routes
    this.router.get('/', verifyToken(), this.getTransfers);
    this.router.get('/:id', verifyToken(), this.getTransferDetails);
    // POST /initiate - Start a transfer
    this.router.post('/links/initiate', verifyToken(), this.validateBody('initiateLinkTransfer'), this.initiateLinkTransfer);
    this.router.post('/emails/initiate', verifyToken(), this.validateBody('initiateEmailTransfer'), this.initiateEmailTransfer);
    // POST /commit - Finalize and commit transfer
    this.router.post('/links/commit/:id', verifyToken(), this.validateBody('commitLinkTransfer'), this.commitLinkTransfer);
    this.router.post('/emails/commit/:id', verifyToken(), this.validateBody('commitEmailTransfer'), this.commitEmailTransfer);
    // GET /received/:id/download-request - Request to download a shared file (pre-sign)
    // GET /sent - Get all files shared by the user (both user-to-user and links)
    // DELETE /user/:id - Revoke access to a shared file (user-to-user)
    // POST /link - Create a secure link share for an existing file
    // GET /link/:id - Get details of a secure link share (No Auth required)
    // POST /link/:id/download-request - Request to download a file via secure link (pre-sign) (No Auth required)
    // GET /link/owned - Get all secure link shares created by the user
    // DELETE /link/:id - Revoke a secure link share
  }

  private async initiateLinkTransfer(req: Request, res: Response) {
    const { title, description, duration, is_password_protected } = req.body as BodyTypeToShape<'initiateLinkTransfer'>;
    const { userId } = req.session;

    // Create a new link transfer
    try {
      const expiration_date = new Date(Date.now() + duration * 1000);
      const transfer = await db.transfers.create({
        data: {
          transfer_type: TRANSFER_TYPE.LINK,
          title,
          description,
          expiration_date,
          status: TRANSFER_STATUS.PENDING,
          owner: {
            connect: { id: userId },
          },
          link_transfer: {
            create: {
              is_password_protected,
            },
          },
        },
      });
      res.status(StatusCodes.CREATED).json({
        message: 'Link transfer initiated',
        data: {
          transfer_id: transfer.id,
        },
      });
      return;
    } catch (error) {
      this.transferLogger.error({ error }, 'Failed to initiate link transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  }
  private async initiateEmailTransfer(req: Request, res: Response) {
    const { recipients, title, description, duration } = req.body as BodyTypeToShape<'initiateEmailTransfer'>;
    const { userId } = req.session;
    try {
      useSerializableTransaction(async () => {
        // Check separate existing users from non-existing users
        const existingUsers = await db.users.findMany({
          where: {
            email: { in: recipients },
          },
        });
        const nonExistingUsers = recipients.filter((recipient) => !existingUsers.some((user) => user.email === recipient));
        // Create new transfer for existing users
        const expiration_date = new Date(Date.now() + duration * 1000);
        // Create transfer
        const transfer = await db.transfers.create({
          data: {
            owner_user_id: userId,
            transfer_type: TRANSFER_TYPE.EMAIL,
            title,
            description,
            status: TRANSFER_STATUS.PENDING,
            expiration_date,
            // Create individual email_transfers for each recipient
            email_transfers: {
              create: existingUsers.map((user) => ({
                recipient_user_id: user.id,
              })),
            },
          },
        });

        // Save invitee details
        // TODO: Implement invitee save logic

        res.status(StatusCodes.CREATED).json({
          message: 'Email transfer initiated',
          data: {
            transfer_id: transfer.id,
          },
        });
        return;
      });
    } catch (error) {
      this.transferLogger.error({ error }, 'Failed to initiate email transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  private async commitEmailTransfer(req: Request, res: Response) {
    const { owner_key, recipient_keys } = req.body as BodyTypeToShape<'commitEmailTransfer'>;
    const { userId } = req.session;
    const { id } = req.params;

    try {
      // Check that transfer exists
      const transfer = await db.transfers.findUnique({
        where: { id },
      });

      if (!transfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Transfer not found' });
        return;
      }

      // Check that user has permission to commit transfer
      if (transfer.owner_user_id !== userId) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to commit this transfer' });
        return;
      }

      //Check if transfer is already committed
      if (transfer.status === TRANSFER_STATUS.ACTIVE) {
        res.status(StatusCodes.ACCEPTED).json({ message: 'Transfer is already committed' });
        return;
      }

      // Check that all associated files are finalized
      const unfinalizedFiles = await db.files.findMany({
        where: {
          transfer_id: id,
          status: FILE_STATUS.PENDING,
        },
      });
      if (unfinalizedFiles.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'All associated files must be finalized before committing transfer' });
        return;
      }

      // Check that keys for all recipients are provided
      const initiatedEmailTransfers = await db.emailTransfers.findMany({
        where: {
          transfer_id: id,
        },
        include: {
          recipient_user: true,
        },
      });
      const missingRecipients = initiatedEmailTransfers.filter((transfer) => {
        return !recipient_keys.find((key) => key.email === transfer.recipient_user.email);
      });
      if (missingRecipients.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Missing keys for recipients',
          details: {
            missing_recipients: missingRecipients,
          },
        });
        return;
      }

      useSerializableTransaction(async () => {
        // Save owner keys
        await db.transfers.update({
          where: { id },
          data: {
            owner_file_key: owner_key,
            status: TRANSFER_STATUS.ACTIVE,
          },
        });
        // Save recipient keys
        await db.$transaction(
          recipient_keys.map((recipient) =>
            db.emailTransfers.update({
              where: {
                transfer_id: id,
                recipient_user: {
                  email: recipient.email,
                },
              },
              data: {
                file_key: recipient.file_key,
              },
            }),
          ),
        );
      });
      // Send recipient notifications
      // TODO: Implement notification logic
      // Send invitee notifications
      // TODO: Implement invitee notification logic
      // Respond with success
      res.status(StatusCodes.ACCEPTED).json({ message: 'Email transfer committed successfully' });
    } catch (error) {
      this.transferLogger.error({ error }, 'Failed to commit email transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }
  private async commitLinkTransfer(req: Request, res: Response) {
    const { id } = req.params;
    const { userId } = req.session;
    const { owner_key, link_key, fragment } = req.body as BodyTypeToShape<'commitLinkTransfer'>;
    try {
      // Check that transfer exists
      const transfer = await db.transfers.findUnique({
        where: { id },
      });

      if (!transfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Transfer not found' });
        return;
      }

      // Check that user has permission to commit transfer
      if (transfer.owner_user_id !== userId) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to commit this transfer' });
        return;
      }

      //Check if transfer is already committed
      if (transfer.status === TRANSFER_STATUS.ACTIVE) {
        res.status(StatusCodes.ACCEPTED).json({ message: 'Transfer is already committed' });
        return;
      }

      // Check that all associated files are finalized
      const unfinalizedFiles = await db.files.findMany({
        where: {
          transfer_id: id,
          status: FILE_STATUS.PENDING,
        },
      });
      if (unfinalizedFiles.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'All associated files must be finalized before committing transfer' });
        return;
      }
      await db.linkTransfers.update({
        where: {
          transfer_id: id,
        },
        data: {
          file_key: link_key,
          encrypted_fragment: fragment,
          transfer: {
            update: {
              owner_file_key: owner_key,
              status: TRANSFER_STATUS.ACTIVE,
            },
          },
        },
      });
      // Send recipient notifications
      // TODO: Implement notification logic
      // Send invitee notifications
      // TODO: Implement invitee notification logic
      // Respond with success
      res.status(StatusCodes.ACCEPTED).json({ message: 'Link transfer committed successfully' });
    } catch (error) {
      this.transferLogger.error({ error }, 'Failed to commit link transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  }

  private async getTransfers(req: Request, res: Response) {
    const { userId } = req.session;
    const query = req.query;

    // Validate Filter Query
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      direction: z.enum(['SENT', 'RECEIVED', 'ALL']).default('ALL'),
      type: z.enum(Object.keys(TRANSFER_TYPE) as [string, ...string[]]).optional(),
      status: z.enum(Object.keys(TRANSFER_STATUS) as [string, ...string[]]).optional(),
      search: z.string().min(1).max(100).optional(),
    });

    const queryResult = querySchema.safeParse(query);
    if (!queryResult.success) {
      const errors = prettyZodErrors(queryResult.error);
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid query parameters', details: errors });
      return;
    }

    const { page, limit, status, search, direction } = queryResult.data;

    try {
      // Fetch paginated transfers based on filters if any

      const ownerSelector = [
        {
          AND: [{ owner_user_id: userId }, { status: { not: { in: ['PENDING'] } } }],
        },
      ];

      const recipientSelector = [
        {
          AND: [{ email_transfers: { some: { recipient_user: { id: userId } } } }, { status: { in: ['ACTIVE', 'EXPIRED'] } }],
        },
      ];

      const primarySelectors = {
        ALL: [...ownerSelector, ...recipientSelector],
        SENT: ownerSelector,
        RECEIVED: recipientSelector,
      };

      const where = {
        // Select based on direction
        OR: primarySelectors[direction],
        ...(status && { status: status as TRANSFER_STATUS }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email_transfers: { some: { recipient_user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } } } },
            { files: { some: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
          ],
        }),
      };

      const include = {
        owner: {
          select: {
            id: true,
            email: true,
            profile_picture: true,
          },
        },
        files: {
          select: {
            name: true,
            size: true,
            content_type: true,
          },
        },
      };

      const omit = {
        owner_file_key: true,
      };

      const [transfers, count] = await getPaginationResult({
        modelName: 'Transfers',
        page,
        limit,
        where,
        include,
        omit,
        orderBy: {
          created_at: 'desc',
        },
      });

      const totalPages = Math.ceil(count / limit);

      const paginationDetails: PaginationDetails = {
        page: page,
        limit: limit,
        totalPages: totalPages,
        totalItems: count,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
      // return filtered transfers
      res.status(StatusCodes.OK).json({ message: 'Transfers fetched successfully', data: transfers, pagination: paginationDetails });
    } catch (error) {
      // this.transferLogger.error({ error }, 'Failed to get transfers');
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  private async getTransferDetails(req: Request, res: Response) {
    const { id } = req.params;
    const { userId } = req.session;

    try {
      const transfer = await db.transfers.findUnique({
        where: {
          id: id,
        },
        include: {
          email_transfers: true,
          link_transfer: true,
          files: true,
        },
      });

      // Checks

      // Check if transfer exists
      if (!transfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Transfer not found' });
        return;
      }

      // Check if user has permission to access the transfer
      if (transfer.owner_user_id !== userId && !transfer.email_transfers.some((email) => email.recipient_user_id === userId)) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to access this transfer' });
        return;
      }

      // Check if user is a recipient and transfer is revoked or pending
      if (
        transfer.email_transfers.some((email) => email.recipient_user_id === userId) &&
        ([TRANSFER_STATUS.REVOKED, TRANSFER_STATUS.PENDING] as Array<string>).includes(transfer.status)
      ) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to access this transfer' });
        return;
      }

      // Formatting

      // Remove owner file key if not owner requesting
      if (transfer.owner_user_id !== userId) {
        delete transfer.owner_file_key;
      }

      // Remove other email transfers if not owner requesting
      if (transfer.owner_user_id !== userId) {
        transfer.email_transfers = transfer.email_transfers.filter((email) => email.recipient_user_id === userId);
      }

      res.status(StatusCodes.OK).json({
        message: 'Transfer fetched successfully',
        data: {
          ...transfer,
          isOwner: transfer.owner_user_id === userId,
          fileCount: transfer.files.length,
          totalSize: transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  private getValidationSchema = <T extends BodyType>(type: T): SchemaMap[T] => {
    return schemas[type];
  };

  private validateBody = bodyValidator(this.getValidationSchema);
}

type BodyType = 'initiateLinkTransfer' | 'initiateEmailTransfer' | 'commitLinkTransfer' | 'commitEmailTransfer';

const initiateEmailTransferSchema = z.object({
  recipients: z.array(z.string().email()).nonempty('At least one recipient is required'),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  duration: z.number().min(1),
});

const initiateLinkTransferSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  duration: z.number().min(1),
  is_password_protected: z.boolean().default(false),
});

const commitEmailTransferSchema = z.object({
  owner_key: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
    message: 'Invalid PGP message format',
  }),
  recipient_keys: z.array(
    z.object({
      email: z.string().email(),
      file_key: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
        message: 'Invalid PGP message format',
      }),
    }),
  ),
});

const commitLinkTransferSchema = z.object({
  owner_key: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
    message: 'Invalid PGP message format',
  }),
  link_key: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
    message: 'Invalid PGP message format',
  }),
  fragment: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
    message: 'Invalid PGP message format',
  }),
});

const schemas = {
  initiateEmailTransfer: initiateEmailTransferSchema,
  initiateLinkTransfer: initiateLinkTransferSchema,
  commitEmailTransfer: commitEmailTransferSchema,
  commitLinkTransfer: commitLinkTransferSchema,
} as const;

type SchemaMap = typeof schemas;
type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default TransferController;
