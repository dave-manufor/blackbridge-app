import StatusCodes from '../config/StatusCodes.config';
import logger from '../lib/logger';
import { verifyToken } from '../middlewares/auth.middleware';
import { bodyValidator } from '../middlewares/validation.middleware';
import { FILE_STATUS, TRANSFER_STATUS, TRANSFER_TYPE, Prisma } from '@prisma/client';
import db, { useSerializableTransaction } from '../services/db';
import { PGPValidator } from '../utils/PGPValidator.utils';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prettyZodErrors } from 'utils/zod.utils';
import { PaginationDetails } from 'custom';
import { getPaginationResult } from 'utils/db.utils';
import { generateRandomSlug } from 'utils/slug.utils';

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
    this.router.post('/emails/:id/viewed', verifyToken(), this.markEmailTransferAsViewed);
    this.router.get('/unviewed/count', verifyToken(), this.getUnviewedEmailTransfersCount);
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

  private initiateLinkTransfer = async (req: Request, res: Response) => {
    const { title, description, duration, is_password_protected } = req.body as BodyTypeToShape<'initiateLinkTransfer'>;
    const { userId } = req.session;

    // Create a new link transfer
    try {
      const expiration_date = new Date(Date.now() + duration * 1000);
      let slug: string;
      let exists;
      do {
        slug = generateRandomSlug(12);
        exists = await db.linkTransfers.findUnique({ where: { slug } });
      } while (exists);
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
              slug,
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
  };
  private initiateEmailTransfer = async (req: Request, res: Response) => {
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
  };

  private commitEmailTransfer = async (req: Request, res: Response) => {
    const { owner_key, recipient_keys } = req.body as BodyTypeToShape<'commitEmailTransfer'>;
    const { userId } = req.session;
    const { id } = req.params;

    // normalize emails once
    const keysByEmail = new Map(recipient_keys.map((r) => [r.email.trim().toLowerCase(), r.file_key]));

    try {
      await useSerializableTransaction(async (tx) => {
        // 1) Load transfer
        const transfer = await tx.transfers.findUnique({
          where: { id },
          select: { id: true, owner_user_id: true, status: true },
        });

        if (!transfer) {
          throw { status: StatusCodes.NOT_FOUND, message: 'Transfer not found' };
        }
        if (transfer.owner_user_id !== userId) {
          throw { status: StatusCodes.FORBIDDEN, message: 'You do not have permission to commit this transfer' };
        }

        // If already ACTIVE, return early
        if (transfer.status === TRANSFER_STATUS.ACTIVE) {
          throw { status: StatusCodes.ACCEPTED, message: 'Transfer is already committed' };
        }

        // 2) Ensure all files are finalized
        const unfinalizedCount = await tx.files.count({
          where: {
            transfer_id: id,
            status: { not: FILE_STATUS.UPLOADED },
          },
        });
        if (unfinalizedCount > 0) {
          throw {
            status: StatusCodes.BAD_REQUEST,
            message: 'All associated files must be finalized before committing transfer',
          };
        }

        // 3) Load recipients for this transfer
        const initiated = await tx.emailTransfers.findMany({
          where: { transfer_id: id },
          select: {
            recipient_user_id: true,
            recipient_user: { select: { email: true } },
          },
        });

        // Build email -> userId map
        const emailToUserId = new Map<string, string>(initiated.map((et) => [et.recipient_user.email.toLowerCase(), et.recipient_user_id]));

        // Validate that keys are provided for all initiated recipients
        const missing = initiated.map((et) => et.recipient_user.email.toLowerCase()).filter((email) => !keysByEmail.has(email));

        if (missing.length > 0) {
          throw {
            status: StatusCodes.BAD_REQUEST,
            message: 'Missing keys for recipients',
            details: { missing_recipients: missing },
          };
        }

        // Extract valid recipient updates
        const validRecipientUpdates = [...keysByEmail.entries()].filter(([email]) => emailToUserId.has(email));

        // 4) Update recipient keys in parallel
        const recipientUpdates = validRecipientUpdates.map(([email, file_key]) => {
          const recipient_user_id = emailToUserId.get(email)!; // exists due to 'missing' check above
          return tx.emailTransfers.update({
            where: {
              unique_recipient_per_transfer: {
                transfer_id: id,
                recipient_user_id,
              },
            },
            data: { file_key },
          });
        });

        // 5) Atomically set owner key + activate transfer
        // Use updateMany with status=PENDING to avoid race committing twice
        const activateTransfer = tx.transfers.updateMany({
          where: {
            id,
            owner_user_id: userId,
            status: TRANSFER_STATUS.PENDING,
          },
          data: {
            owner_file_key: owner_key,
            status: TRANSFER_STATUS.ACTIVE,
          },
        });

        // Run updates concurrently
        const [activateResult] = await Promise.all([activateTransfer, Promise.all(recipientUpdates)]);

        // If no row was updated, someone else raced us (now ACTIVE or changed)
        if (activateResult.count === 0) {
          // Re-check status to decide what to return
          const current = await tx.transfers.findUnique({
            where: { id },
            select: { status: true },
          });
          if (current?.status === TRANSFER_STATUS.ACTIVE) {
            throw { status: StatusCodes.ACCEPTED, message: 'Transfer is already committed' };
          }
          throw { status: StatusCodes.CONFLICT, message: 'Transfer could not be committed (state changed)' };
        }
      });

      // TODO: notify asynchronously (queue/job)
      // notifyRecipients(id).catch(err => this.transferLogger.warn({ err }, 'notifyRecipients failed'));

      res.status(StatusCodes.ACCEPTED).json({ message: 'Email transfer committed successfully' });
    } catch (error: any) {
      if (error?.status) {
        // "Business" errors thrown above
        res.status(error.status).json({ message: error.message, ...(error.details && { details: error.details }) });
        return;
      }
      this.transferLogger.error({ error }, 'Failed to commit email transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private commitLinkTransfer = async (req: Request, res: Response) => {
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
  };

  private getTransfers = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const query = req.query;

    // Validate Filter Query
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      direction: z.enum(['SENT', 'RECEIVED', 'ALL']).default('ALL'),
      type: z.enum(Object.keys(TRANSFER_TYPE) as [string, ...string[]]).optional(),
      status: z.enum(Object.keys(TRANSFER_STATUS) as [string, ...string[]]).optional(),
      search: z.string().optional(),
    });

    const queryResult = querySchema.safeParse(query);
    if (!queryResult.success) {
      const errors = prettyZodErrors(queryResult.error);
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid query parameters', details: errors });
      return;
    }

    const { page, limit, status, search, direction, type } = queryResult.data;

    try {
      // Fetch paginated transfers based on filters if any

      const ownerSelector = [
        {
          owner_user_id: userId,
        },
      ];

      const recipientSelector = [
        {
          email_transfers: { some: { recipient_user: { id: userId } } },
          status: { in: [TRANSFER_STATUS.ACTIVE, TRANSFER_STATUS.EXPIRED] },
        },
      ];

      const primarySelectors = {
        ALL: [...ownerSelector, ...recipientSelector],
        SENT: ownerSelector,
        RECEIVED: recipientSelector,
      };

      const where = {
        OR: primarySelectors[direction],
        status: { not: TRANSFER_STATUS.PENDING },
        ...(type && { type: type as TRANSFER_TYPE }),
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
        email_transfers: {
          select: {
            id: true,
            viewed: true,
            recipient_user: {
              select: {
                id: true,
              },
            },
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

      const [transfers, paginationDetails] = await getPaginationResult({
        modelName: 'Transfers',
        page,
        limit,
        where,
        include,
        orderBy: {
          created_at: 'desc',
        },
      });

      // Add derived meta and remove other email transfers if not owner requesting
      const enrichedTransfers = transfers.map((transfer) => {
        const enrichedTransfer = {
          ...transfer,
          recommended_title: transfer.title || transfer.files[0]?.name || 'Untitled',
          total_files_count: transfer.files.length,
          total_files_size_bytes: transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
          is_owner: transfer.owner_user_id === userId,
          is_expired: transfer.status === TRANSFER_STATUS.EXPIRED || Date.now() > new Date(String(transfer.expiration_date)).getTime(),
          is_viewed: transfer.owner_user_id === userId ? true : transfer.email_transfers.some((et) => et.recipient_user.id === userId && et.viewed),
        };
        delete enrichedTransfer.email_transfers;
        if (!enrichedTransfer.is_owner) delete enrichedTransfer.owner_file_key;
        return enrichedTransfer;
      });

      // return filtered transfers
      res.status(StatusCodes.OK).json({ message: 'Transfers fetched successfully', data: enrichedTransfers, pagination: paginationDetails });
    } catch (error) {
      // this.transferLogger.error({ error }, 'Failed to get transfers');
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getTransferDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.session;

    try {
      const transfer = await db.transfers.findUnique({
        where: {
          id: id,
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              profile_picture: true,
            },
          },
          email_transfers: {
            select: {
              id: true,
              file_key: true,
              created_at: true,
              viewed: true,
              viewed_at: true,
              recipient_user: {
                select: {
                  id: true,
                  email: true,
                  profile_picture: true,
                },
              },
            },
          },
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
      if (transfer.owner_user_id !== userId && !transfer.email_transfers.some((email) => email.recipient_user.id === userId)) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to access this transfer' });
        return;
      }

      // Check if user is a recipient and transfer is revoked or pending
      if (
        transfer.email_transfers.some((email) => email.recipient_user.id === userId) &&
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
        transfer.email_transfers = transfer.email_transfers.filter((email) => email.recipient_user.id === userId);
      }

      res.status(StatusCodes.OK).json({
        message: 'Transfer fetched successfully',
        data: {
          ...transfer,
          recommended_title: transfer.title || transfer.files[0]?.name || 'Untitled',
          total_files_count: transfer.files.length,
          total_files_size_bytes: transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
          is_owner: transfer.owner_user_id === userId,
          is_expired: transfer.status === 'EXPIRED' || Date.now() > new Date(String(transfer.expiration_date)).getTime(),
          is_viewed: transfer.owner_user_id === userId ? true : transfer.email_transfers.some((et) => et.recipient_user.id === userId && et.viewed),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private markEmailTransferAsViewed = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { id } = req.params;
    try {
      const emailTransfer = await db.emailTransfers.findUnique({
        where: {
          unique_recipient_per_transfer: {
            transfer_id: id,
            recipient_user_id: userId,
          },
        },
      });

      // Check if email transfer exists
      if (!emailTransfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Email transfer not found' });
        return;
      }

      // Check if email transfer is already viewed
      if (emailTransfer.viewed) {
        res.status(StatusCodes.OK).json({ message: 'Email transfer already marked as viewed' });
        return;
      }

      await db.emailTransfers.update({
        where: {
          id: emailTransfer.id,
        },
        data: {
          viewed: true,
          viewed_at: new Date(),
        },
      });

      res.status(StatusCodes.OK).json({ message: 'Email transfer marked as viewed' });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getUnviewedEmailTransfersCount = async (req: Request, res: Response) => {
    const { userId } = req.session;
    try {
      const count = await db.emailTransfers.count({
        where: {
          recipient_user_id: userId,
          viewed: false,
        },
      });

      res.status(StatusCodes.OK).json({
        message: 'Unopened email transfers count fetched successfully',
        data: { count },
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

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
