import StatusCodes from '../config/StatusCodes.config';
import logger from '../lib/logger';
import { verifyLinkAccess, verifyToken } from '../middlewares/auth.middleware';
import { bodyValidator } from '../middlewares/validation.middleware';
import { FILE_STATUS, TRANSFER_STATUS, TRANSFER_TYPE, Prisma, LINK_ACCESS_CONTROL, INVITE_STATUS } from '@prisma/client';
import db, { useSerializableTransaction } from '../services/db';
import { PGPValidator } from '../utils/PGPValidator.utils';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prettyZodErrors } from '../utils/zod.utils';
import { getPaginationResult } from '../utils/db.utils';
import { generateRandomSlug } from '../utils/slug.utils';
import { JWTDownloadRequestPayload, JWTInvitePayload } from 'custom';
import jwt from 'jsonwebtoken';
import transferConfig from '../config/transfer.config';
import cacheConfig from '../config/cache.config';
import cache from '../services/cache';
import { v4 as uuid_v4 } from 'uuid';
import notificationService from '../services/notifications';

class TransferController {
  public path = '/transfers';
  public router = Router();
  private transferLogger = logger.child({ module: 'Transfer Controller' });

  constructor() {
    this.initializeRoutes();
    this.transferLogger.trace('Transfer Controller initialized');
  }

  private initializeRoutes() {
    this.router.get('/', verifyToken(), this.getTransfers);
    this.router.get('/:transferId', verifyToken(), this.getTransferDetails);
    this.router.get('/emails/:transferId/download-request', verifyToken(), this.requestEmailDownload);
    this.router.get('/links/:slug/download-request', verifyLinkAccess(), this.requestLinkDownload);
    this.router.post('/emails/:id/viewed', verifyToken(), this.markEmailTransferAsViewed);
    this.router.get('/unviewed/count', verifyToken(), this.getUnviewedEmailTransfersCount);
    this.router.post('/links/initiate', verifyToken(), this.validateBody('initiateLinkTransfer'), this.initiateLinkTransfer);
    this.router.post('/emails/initiate', verifyToken(), this.validateBody('initiateEmailTransfer'), this.initiateEmailTransfer);
    this.router.post('/links/commit/:id', verifyToken(), this.validateBody('commitLinkTransfer'), this.commitLinkTransfer);
    this.router.post('/emails/commit/:id', verifyToken(), this.validateBody('commitEmailTransfer'), this.commitEmailTransfer);
    this.router.get('/invitations', verifyToken(), this.getInvitations);
    this.router.get('/invitations/:invitationId', verifyToken(), this.getInvitationDetails);
    this.router.post('/invitations/details', verifyToken(), this.validateBody('getInvitationDetailsFromToken'), this.getInvitationDetailsFromToken);
    this.router.post('/invitations/accept', verifyToken(), this.validateBody('acceptInvite'), this.acceptInvite);
    this.router.post('/invitations/approve', verifyToken(), this.validateBody('approveInvite'), this.approveInvite);
    this.router.get('/links/:slug', verifyLinkAccess(), this.getLinkTransfer);
  }

  private initiateLinkTransfer = async (req: Request, res: Response) => {
    const { title, description, duration, is_password_protected, access_control } = req.body as BodyTypeToShape<'initiateLinkTransfer'>;
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
              access_control: access_control as LINK_ACCESS_CONTROL,
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
            // Create invites for non-existing users
            invites: {
              create: nonExistingUsers.map((email) => ({
                email,
                inviter_id: userId,
              })),
            },
          },
        });

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
    const { userId, email: senderEmail } = req.session;
    const { id } = req.params;

    // normalize emails once
    const keysByEmail = new Map(recipient_keys.map((r) => [r.email.trim().toLowerCase(), r.file_key]));
    let recipientEmails: Set<string> | undefined = undefined;
    let transferDetails:
      | { id: string; title?: string; sender_email: string; files: Array<{ name: string; size: number }>; expires_at: Date }
      | undefined = undefined;

    try {
      await useSerializableTransaction(async (tx) => {
        // 1) Load transfer
        const transfer = await tx.transfers.findUnique({
          where: { id },
          select: { id: true, title: true, owner_user_id: true, status: true, expiration_date: true, files: { select: { name: true, size: true } } },
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
        // Will not actually update many since only one transfer will ever meet all requirements. We use update many to allow for a non unique field check (status) in case of a race condition
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

        // No errors, set values for notifications
        recipientEmails = new Set(validRecipientUpdates.map(([email]) => email));
        transferDetails = {
          id: transfer.id,
          title: transfer.title,
          sender_email: senderEmail!,
          files: transfer.files.map((f) => ({ name: f.name, size: Number(f.size) })),
          expires_at: transfer.expiration_date,
        };
      });

      // Notify recipients
      if (recipientEmails.size > 0 && transferDetails) {
        await notificationService.send_new_transfer_notification(Array.from(recipientEmails), transferDetails).catch((error) => {
          this.transferLogger.warn(error, 'Error sending new transfer notification');
        });
      }

      // Notify invitees (awaited for serverless)
      if (transferDetails) {
        const invites = await db.invites.findMany({ where: { transfer_id: id } });
        const recipients = invites.map(({ id, email }) => {
          const jwtPayload: JWTInvitePayload = {
            id: id,
            email: email!,
            transfer_id: id,
            iat: Math.floor(Date.now() / 1000),
          };
          const inviteToken = jwt.sign(jwtPayload, process.env.INVITE_TOKEN_SECRET!);
          return { email: email!, inviteToken };
        });
        await notificationService.send_invite_notification(recipients, transferDetails).catch((error) => {
          this.transferLogger.warn(error, 'Error sending invite notification');
        });
      }

      res.status(StatusCodes.ACCEPTED).json({ message: 'Email transfer committed successfully' });
    } catch (error: any) {
      if (error?.status) {
        // "Business" errors thrown above
        res.status(error.status).json({ message: error.message, ...(error.details && { details: error.details }) });
        return;
      }
      this.transferLogger.error(error, 'Failed to commit email transfer');
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
      this.transferLogger.error(error, 'Failed to commit link transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private getInvitations = async (req: Request, res: Response) => {
    const { userId, email: userEmail } = req.session;
    const query = req.query;

    // Validate Filter Query
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      type: z.enum(['SENT', 'RECEIVED', 'PENDING_APPROVAL', 'ALL']).default('ALL'),
      status: z.enum(Object.keys(INVITE_STATUS) as [string, ...string[]]).optional(),
      search: z.string().optional(), // Email or Transfer Title
    });

    const queryResult = querySchema.safeParse(query);
    if (!queryResult.success) {
      const errors = prettyZodErrors(queryResult.error);
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid query parameters', details: errors });
      return;
    }

    const { page, limit, status, search, type } = queryResult.data;

    const inviterSelector = [{ inviter_id: userId }];
    const inviteeSelector = [{ email: userEmail }];
    const primarySelector = {
      ALL: [...inviterSelector, ...inviteeSelector],
      SENT: inviterSelector,
      RECEIVED: inviteeSelector,
      PENDING_APPROVAL: inviterSelector,
    } as Record<z.infer<typeof querySchema>['type'], []>;

    const where = {
      OR: primarySelector[type],
      ...(status && { status }),
      ...(type === 'PENDING_APPROVAL' && { status: INVITE_STATUS.ACCEPTED }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { transfer: { title: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ],
      }),
      AND: [{ transfer: { expiration_date: { gte: new Date() } } }, { transfer: { status: TRANSFER_STATUS.ACTIVE } }],
    };

    const include = {
      id: true,
      email: true,
      status: true,
      viewed_invite: true,
      viewed_authorization: true,
      transfer: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          expiration_date: true,
        },
      },
      inviter: {
        select: {
          id: true,
          email: true,
          profile_picture: true,
        },
      },
    };

    try {
      const [invitations, paginationDetails] = await getPaginationResult({
        modelName: 'Invites',
        where,
        page,
        limit,
        include,
        orderBy: { created_at: 'desc' },
      });
      const enrichedInvitations = invitations.map((invite) => {
        const enrichedInvite = {
          ...invite,
          isInviter: invite.inviter.id === userId,
          isInvitee: invite.email === userEmail,
          isAccepted: invite.status !== INVITE_STATUS.PENDING,
          isPendingApproval: invite.status === INVITE_STATUS.ACCEPTED,
        };
        if (!enrichedInvite.isInviter) delete enrichedInvite.viewed_authorization;
        return enrichedInvite;
      });

      res.status(StatusCodes.OK).json({ message: 'Invitations retrieved successfully', data: enrichedInvitations, pagination: paginationDetails });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to get invitations');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private getInvitationDetails = async (req: Request, res: Response) => {
    const { invitationId } = req.params;
    const { userId, email: userEmail } = req.session;
    try {
      const invite = await db.invites.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          transfer: {
            select: {
              id: true,
              status: true,
              title: true,
              expiration_date: true,
              files: {
                select: {
                  name: true,
                  size: true,
                  content_type: true,
                },
              },
            },
          },
          inviter: {
            select: {
              id: true,
              email: true,
            },
          },
          viewed_invite: true,
          viewed_authorization: true,
        },
      });

      // Check if invite exists
      if (!invite) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Invite not found' });
        return;
      }

      // Check permissions
      if (invite.email !== userEmail && invite.inviter.id !== userId) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to view this invite' });
        return;
      }

      // Don't return invites for invalid transfers
      if (invite.transfer.status !== TRANSFER_STATUS.ACTIVE || invite.transfer.expiration_date < new Date()) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'Transfer is no longer valid' });
        return;
      }

      // Remove viewed_authorization if the inviter is not the user
      if (invite.inviter.id !== userId) {
        delete invite.viewed_authorization;
      }

      res.status(StatusCodes.OK).json({ message: 'Invite found', data: invite });
    } catch {
      this.transferLogger.error('Failed to get invitation details from token');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private getInvitationDetailsFromToken = async (req: Request, res: Response) => {
    const { userId, email: userEmail } = req.session;
    const { token } = req.body as BodyTypeToShape<'getInvitationDetailsFromToken'>;
    let payload: JWTInvitePayload;
    try {
      try {
        payload = jwt.verify(token, process.env.INVITE_TOKEN_SECRET!) as JWTInvitePayload;
      } catch {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid invite token' });
        return;
      }

      const invite = await db.invites.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          transfer: {
            select: {
              id: true,
              status: true,
              title: true,
              expiration_date: true,
              files: {
                select: {
                  name: true,
                  size: true,
                  content_type: true,
                },
              },
            },
          },
          inviter: {
            select: {
              id: true,
              email: true,
            },
          },
          viewed_invite: true,
          viewed_authorization: true,
        },
      });

      // Check if invite exists
      if (!invite) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Invite not found' });
        return;
      }

      // Check permissions
      if (invite.email !== userEmail && invite.inviter.id !== userId) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to view this invite' });
        return;
      }

      // Don't return invites for invalid transfers
      if (invite.transfer.status !== TRANSFER_STATUS.ACTIVE || invite.transfer.expiration_date < new Date()) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'Transfer is no longer valid' });
        return;
      }

      res.status(StatusCodes.OK).json({ message: 'Invite found', data: invite });
    } catch {
      this.transferLogger.error('Failed to get invitation details from token');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      return;
    }
  };

  private acceptInvite = async (req: Request, res: Response) => {
    const { token } = req.body as BodyTypeToShape<'acceptInvite'>;
    const { email: userEmail } = req.session;
    try {
      let payload: JWTInvitePayload;
      try {
        payload = jwt.verify(token, process.env.INVITE_TOKEN_SECRET!) as JWTInvitePayload;
      } catch {
        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid invite token' });
        return;
      }
      // Validate token and accept invite
      const invite = await db.invites.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          status: true,
          transfer: {
            select: {
              id: true,
              status: true,
              title: true,
              expiration_date: true,
            },
          },
          inviter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Check if invite exists
      if (!invite) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Invite not found' });
        return;
      }

      // Check if invite is for the current user
      if (invite.email !== userEmail) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to accept this invite' });
        return;
      }

      // Check if invite is already accepted
      if (invite.status !== INVITE_STATUS.PENDING) {
        res.status(StatusCodes.CONFLICT).json({ message: 'Invite has already been accepted' });
        return;
      }

      // Check if transfer is still valid
      if (invite.transfer.status !== TRANSFER_STATUS.ACTIVE || invite.transfer.expiration_date < new Date()) {
        res.status(StatusCodes.CONFLICT).json({ message: 'Transfer is no longer valid' });
        return;
      }

      // Update invite status
      const updatedInvite = await db.invites.update({
        where: { id: invite.id },
        data: { status: INVITE_STATUS.ACCEPTED },
      });

      const acceptancePayload: JWTInvitePayload = {
        id: invite.id,
        email: invite.email,
        transfer_id: invite.transfer.id,
        iat: Math.floor(Date.now() / 1000),
      };

      const acceptanceToken = jwt.sign(acceptancePayload, process.env.INVITE_TOKEN_SECRET!);

      // Send notification to inviter (awaited for serverless)
      await notificationService
        .send_invite_accepted_notification(
          invite.inviter.email,
          {
            recipient_email: invite.email,
            transfer_id: invite.transfer.id,
            transfer_title: invite.transfer.title,
          },
          acceptanceToken,
        )
        .catch((error) => {
          this.transferLogger.warn(error, 'Failed to send invite accepted notification');
        });

      res.status(StatusCodes.OK).json({
        message: 'Invite accepted successfully',
        data: {
          invite: {
            id: invite.id,
            email: invite.email,
            status: updatedInvite.status,
            transfer_id: invite.transfer.id,
          },
        },
      });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to accept invite');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private approveInvite = async (req: Request, res: Response) => {
    const { token, file_key } = req.body as BodyTypeToShape<'approveInvite'>;
    const { userId, email: userEmail } = req.session;

    let payload: JWTInvitePayload;
    try {
      try {
        payload = jwt.verify(token, process.env.INVITE_TOKEN_SECRET!) as JWTInvitePayload;
      } catch {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid invite token' });
        return;
      }

      const invite = await db.invites.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          status: true,
          inviter_id: true,
          transfer: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              expiration_date: true,
            },
          },
        },
      });

      // Check if invite exists
      if (!invite) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Invite not found' });
        return;
      }

      // Check if user has permission to approve invite
      if (userId !== invite.inviter_id) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to approve this invite' });
        return;
      }

      // Check if invite is in proper ACCEPTED state
      if (invite.status !== INVITE_STATUS.ACCEPTED) {
        res.status(StatusCodes.CONFLICT).json({ message: 'Invite has not yet been accepted' });
        return;
      }

      // Check if transfer is still valid
      if (invite.transfer.status !== TRANSFER_STATUS.ACTIVE || invite.transfer.expiration_date < new Date()) {
        res.status(StatusCodes.CONFLICT).json({ message: 'Transfer is no longer active' });
        return;
      }

      // Check if email transfer for invitee already exists
      const existingEmailTransfer = await db.emailTransfers.findFirst({
        where: {
          transfer_id: invite.transfer.id,
          recipient_user: {
            email: invite.email,
          },
        },
      });

      if (existingEmailTransfer) {
        res.status(StatusCodes.CONFLICT).json({ message: 'Email transfer for invitee already exists' });
        return;
      }

      // Create email transfer for invitee
      await db.emailTransfers.create({
        data: {
          transfer: {
            connect: {
              id: invite.transfer.id,
            },
          },
          recipient_user: {
            connect: {
              email: invite.email,
            },
          },
          file_key,
        },
      });

      // Notify invitee about the approval (non-blocking)
      notificationService
        .send_access_granted_notification(invite.email, {
          transfer_id: invite.transfer.id,
          transfer_title: invite.transfer.title,
          granted_by: userEmail,
          expires_at: invite.transfer.expiration_date,
        })
        .catch((error) => {
          this.transferLogger.warn(error, 'Failed to send access granted notification');
        });

      res.status(StatusCodes.OK).json({ message: 'Invite approved' });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to approve invite');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
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
        ...(type && { transfer_type: type as TRANSFER_TYPE }),
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

      const is_expired = (transfer: any) =>
        transfer.status === TRANSFER_STATUS.EXPIRED || Date.now() > new Date(String(transfer.expiration_date)).getTime();

      // Add derived meta and remove other email transfers if not owner requesting
      const enrichedTransfers = transfers.map((transfer) => {
        const enrichedTransfer = {
          ...transfer,
          status: is_expired(transfer) ? TRANSFER_STATUS.EXPIRED : transfer.status,
          recommended_title: transfer.title || transfer.files[0]?.name || 'Untitled',
          total_files_count: transfer.files.length,
          total_files_size_bytes: transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
          is_owner: transfer.owner_user_id === userId,
          is_expired: is_expired(transfer),
          is_viewed: transfer.owner_user_id === userId ? true : transfer.email_transfers.some((et) => et.recipient_user.id === userId && et.viewed),
        };
        delete enrichedTransfer.email_transfers;
        if (!enrichedTransfer.is_owner) delete enrichedTransfer.owner_file_key;
        return enrichedTransfer;
      });

      // return filtered transfers
      res.status(StatusCodes.OK).json({ message: 'Transfers fetched successfully', data: enrichedTransfers, pagination: paginationDetails });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to get transfers');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getTransferDetails = async (req: Request, res: Response) => {
    const { transferId } = req.params;
    const { userId } = req.session;

    try {
      const transfer = await db.transfers.findUnique({
        where: {
          id: transferId,
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
          invites: {
            select: {
              id: true,
              email: true,
              status: true,
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

      // Remove invites and other email transfers if not owner requesting
      if (transfer.owner_user_id !== userId) {
        delete transfer.invites;
        transfer.email_transfers = transfer.email_transfers.filter((email) => email.recipient_user.id === userId);
      }

      // Fetch download count for link transfers
      if (transfer.link_transfer) {
        const downloadCount = await db.linkTransferDownloads.count({
          where: { link_transfer_id: transfer.link_transfer.id },
        });
        (transfer.link_transfer as any) = { ...transfer.link_transfer, download_count: downloadCount };
      }

      const is_expired = (transfer: any) =>
        transfer.status === TRANSFER_STATUS.EXPIRED || Date.now() > new Date(String(transfer.expiration_date)).getTime();

      res.status(StatusCodes.OK).json({
        message: 'Transfer fetched successfully',
        data: {
          ...transfer,
          status: is_expired(transfer) ? TRANSFER_STATUS.EXPIRED : transfer.status,
          recommended_title: transfer.title || transfer.files[0]?.name || 'Untitled',
          total_files_count: transfer.files.length,
          total_files_size_bytes: transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
          is_owner: transfer.owner_user_id === userId,
          is_expired: is_expired(transfer),
          is_viewed: transfer.owner_user_id === userId ? true : transfer.email_transfers.some((et) => et.recipient_user.id === userId && et.viewed),
        },
      });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to get transfer details');
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
      this.transferLogger.error(error, 'Failed to mark email transfer as viewed');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getUnviewedEmailTransfersCount = async (req: Request, res: Response) => {
    const { userId } = req.session;
    try {
      const count = await db.emailTransfers.count({
        where: {
          transfer: { status: { notIn: [TRANSFER_STATUS.PENDING, TRANSFER_STATUS.REVOKED] } },
          recipient_user_id: userId,
          viewed: false,
        },
      });

      res.status(StatusCodes.OK).json({
        message: 'Unopened email transfers count fetched successfully',
        data: { count },
      });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to get unviewed email transfers count');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getLinkTransfer = async (req: Request, res: Response) => {
    const { slug } = req.params;
    // Verify link access middleware might not return session
    const { userId } = req.session || {};

    try {
      const linkTransfer = await db.linkTransfers.findFirst({
        where: { slug, transfer: { expiration_date: { gt: new Date() } } },
        select: {
          id: true,
          slug: true,
          file_key: true,
          is_password_protected: true,
          transfer: {
            select: {
              id: true,
              owner: {
                select: {
                  email: true,
                  profile_picture: true,
                },
              },
              title: true,
              description: true,
              files: {
                select: {
                  id: true,
                  name: true,
                  size: true,
                  content_type: true,
                  metadata: true,
                },
              },
            },
          },
          created_at: true,
        },
      });

      if (!linkTransfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Link transfer not found' });
        return;
      }

      await db.linkTransfers.update({
        where: { id: linkTransfer.id },
        data: { last_accessed: new Date() },
      });

      res.status(StatusCodes.OK).json({
        message: 'Link transfer fetched successfully',
        data: {
          ...linkTransfer,
          recommended_title: linkTransfer.transfer.title || linkTransfer.transfer.files[0]?.name || 'Untitled',
          total_files_count: linkTransfer.transfer.files.length,
          total_files_size_bytes: linkTransfer.transfer.files.reduce((acc, file) => acc + Number(file.size), 0),
        },
      });
    } catch (error) {
      this.transferLogger.error(error, 'Failed to get link transfer');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private requestEmailDownload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { transferId } = req.params as { transferId: string };

    try {
      const transfer = await db.transfers.findFirst({
        where: { id: transferId, transfer_type: TRANSFER_TYPE.EMAIL },
        select: {
          id: true,
          owner_user_id: true,
          status: true,
          expiration_date: true,
          email_transfers: {
            select: {
              id: true,
              recipient_user_id: true,
              file_key: true,
            },
          },
          files: {
            select: {
              id: true,
              name: true,
              size: true,
              content_type: true,
              metadata: true,
              blocks: {
                select: {
                  id: true,
                  file_id: true,
                  index: true,
                  size: true,
                  encrypted_size: true,
                  path: true,
                },
              },
            },
          },
        },
      });

      // Check if the transfer exists
      if (!transfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Transfer not found' });
        return;
      }

      // Check permissions
      if (transfer.owner_user_id !== userId && !transfer.email_transfers.some((et) => et.recipient_user_id === userId)) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to access this transfer' });
        return;
      }
      // Check if the transfer is still active
      if (transfer.status !== TRANSFER_STATUS.ACTIVE || transfer.expiration_date < new Date()) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'Transfer is no longer active' });
        return;
      }

      // Remove email transfer from response
      delete transfer.email_transfers;

      // Generate Token
      const payloadId = uuid_v4();
      const payload: JWTDownloadRequestPayload = {
        id: payloadId,
        userId: userId ?? null,
        tid: transfer.id,
        iat: Date.now(),
        exp: Date.now() + transferConfig.tokenValidDuration,
      };
      // Store token in cache
      const key = `${cacheConfig.ID_Prefix.Download_Request}${transferId}:${payloadId}`;
      await cache.setEx(key, transferConfig.tokenValidDuration / 1000, JSON.stringify(payload));

      const token = jwt.sign(payload, process.env.TRANSFER_TOKEN_SECRET as string);

      // Non-blocking update of email transfer
      db.emailTransfers
        .updateMany({
          where: {
            recipient_user_id: userId,
            transfer_id: transferId,
            downloaded: false,
          },
          data: { downloaded: true, downloaded_at: new Date() },
        })
        .catch((err) => this.transferLogger.warn({ err }, 'Failed to mark email transfer as downloaded'));

      res.status(StatusCodes.OK).json({ message: 'Success', data: { transfer, token } });
    } catch (error) {
      this.transferLogger.error(error, 'Error requesting download');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private requestLinkDownload = async (req: Request, res: Response) => {
    const { userId } = req.session || {};
    const { slug } = req.params as { slug: string };

    try {
      const transfer = await db.transfers.findFirst({
        where: { link_transfer: { slug }, transfer_type: TRANSFER_TYPE.LINK },
        select: {
          id: true,
          owner_user_id: true,
          status: true,
          expiration_date: true,
          files: {
            select: {
              id: true,
              name: true,
              size: true,
              content_type: true,
              metadata: true,
              blocks: {
                select: {
                  id: true,
                  file_id: true,
                  index: true,
                  size: true,
                  encrypted_size: true,
                  path: true,
                },
              },
            },
          },
        },
      });

      if (!transfer) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Transfer not found' });
        return;
      }

      // Check if the transfer is still active
      if (transfer.status !== TRANSFER_STATUS.ACTIVE || transfer.expiration_date < new Date()) {
        res.status(StatusCodes.FORBIDDEN).json({ message: 'Transfer is no longer active' });
        return;
      }

      // Generate Token
      const payloadId = uuid_v4();
      const payload: JWTDownloadRequestPayload = {
        id: payloadId,
        userId: userId,
        tid: transfer.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + transferConfig.tokenValidDuration) / 1000),
      };
      // Store token in cache
      const key = `${cacheConfig.ID_Prefix.Download_Request}${transfer.id}:${payloadId}`;
      await cache.setEx(key, transferConfig.tokenValidDuration / 1000, JSON.stringify(payload));

      const token = jwt.sign(payload, process.env.TRANSFER_TOKEN_SECRET as string);

      res.status(StatusCodes.OK).json({ message: 'Success', data: { transfer, token } });
    } catch (error) {
      this.transferLogger.error(error, 'Error requesting link download');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  };

  private getValidationSchema = <T extends BodyType>(type: T): SchemaMap[T] => {
    return schemas[type];
  };

  private validateBody = bodyValidator(this.getValidationSchema);
}

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
  access_control: z.enum(Object.values(LINK_ACCESS_CONTROL) as [string, ...string[]]).default(LINK_ACCESS_CONTROL.PUBLIC),
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

const getInvitationDetailsFromTokenSchema = z.object({
  token: z.string(),
});

const acceptInviteSchema = z.object({
  token: z.string(),
});

const approveInviteSchema = z.object({
  token: z.string(),
  file_key: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), {
    message: 'Invalid PGP message format',
  }),
});

const schemas = {
  initiateEmailTransfer: initiateEmailTransferSchema,
  initiateLinkTransfer: initiateLinkTransferSchema,
  commitEmailTransfer: commitEmailTransferSchema,
  commitLinkTransfer: commitLinkTransferSchema,
  acceptInvite: acceptInviteSchema,
  approveInvite: approveInviteSchema,
  getInvitationDetailsFromToken: getInvitationDetailsFromTokenSchema,
} as const;

type SchemaMap = typeof schemas;
type BodyType = keyof SchemaMap;
type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default TransferController;
