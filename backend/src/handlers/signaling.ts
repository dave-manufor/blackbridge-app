import { P2P_SESSION_STATUS, P2PSessions } from '@prisma/client';
import StatusCodes from 'config/StatusCodes.config';
import { SocketResponse } from 'custom';
import db from 'services/db';
import { Server, Socket } from 'socket.io';
import { PGPValidator } from 'utils/PGPValidator.utils';
import { errorResponse, successResponse } from 'utils/socket.utils';
import { prettyZodErrors } from 'utils/zod.utils';
import { z } from 'zod';

export const SIGNALING_EVENTS = {
  JOIN_SESSION: 'signaling:join-session',
  PEER_JOINED: 'signaling:peer-joined',
  LEAVE_SESSION: 'signaling:leave-session',
  PEER_LEFT: 'signaling:peer-left',
  OFFER: 'signaling:offer',
  OFFER_SENT: 'signaling:offer-sent',
  ANSWER: 'signaling:answer',
  ANSWER_SENT: 'signaling:answer-sent',
  CANDIDATES: 'signaling:candidates',
  CANDIDATES_SENT: 'signaling:candidates-sent',
  DISCONNECT: 'signaling:disconnect',
  PEER_DISCONNECTED: 'signaling:peer-disconnected',
};

const canUserAccessSession = async (
  user_id: string,
  room_id: string,
): Promise<{ canAccess: true; session: P2PSessions; error?: null } | { canAccess: false; session?: null; error: SocketResponse }> => {
  // Check if signaling room exists
  const session = await db.p2PSessions.findFirst({ where: { room_id } });
  if (!session) {
    const response = errorResponse(StatusCodes.NOT_FOUND, 'P2P session not found');
    return { canAccess: false, error: response };
  }
  // Check if user is authorized to join the signaling room
  if (![session.sender_id, session.receiver_id].includes(user_id)) {
    const response = errorResponse(StatusCodes.FORBIDDEN, 'Not authorized to join this signaling session');
    return { canAccess: false, error: response };
  }

  // Check if signaling room is still active
  if (session.status !== P2P_SESSION_STATUS.ACTIVE) {
    const response = errorResponse(StatusCodes.FORBIDDEN, 'P2P session is not active');
    return { canAccess: false, error: response };
  }
  return { canAccess: true, session };
};

const registerSignalingHandlers = () => {
  return (io: Server, socket: Socket) => {
    const joinSignalingSession = async (payload: z.infer<typeof joinSignalingSessionSchema>, callback?: (response: SocketResponse) => void) => {
      const parseResult = joinSignalingSessionSchema.safeParse(payload);
      if (!parseResult.success) {
        const errors = prettyZodErrors(parseResult.error);
        const response = errorResponse(StatusCodes.BAD_REQUEST, 'Invalid payload', { errors });
        callback?.(response);
        return;
      }

      const user_id = socket.session?.userId;

      const { room_id } = parseResult.data;

      const { canAccess, session, error } = await canUserAccessSession(user_id, room_id);

      if (!canAccess) {
        callback?.(error);
        return;
      }

      // Add user to the signaling room
      socket.join(room_id);
      socket.data.signaling = { room_id, sender_id: session.sender_id, receiver_id: session.receiver_id };

      // Update user's socket ID in the session
      await db.p2PSessions.update({
        where: { id: session.id },
        data: {
          ...(session.sender_id === user_id ? { sender_socket_id: socket.id } : { receiver_socket_id: socket.id }),
        },
      });

      // Notify other peer in the room about the new peer
      socket.to(room_id).emit(SIGNALING_EVENTS.PEER_JOINED, { room_id, user_id });

      // Send success response to the joining peer
      const response = successResponse(session, 'Joined signaling session');
      callback?.(response);
    };

    const handleOffer = async (payload: z.infer<typeof handleOfferSchema>, callback?: (response: SocketResponse) => void) => {
      const parseResult = handleOfferSchema.safeParse(payload);
      if (!parseResult.success) {
        const errors = prettyZodErrors(parseResult.error);
        const response = errorResponse(StatusCodes.BAD_REQUEST, 'Invalid payload', { errors });
        callback?.(response);
        return;
      }

      const user_id = socket.session?.userId;

      const { room_id, offer } = parseResult.data;

      const { canAccess, error } = await canUserAccessSession(user_id, room_id);

      if (!canAccess) {
        callback?.(error);
        return;
      }

      // Broadcast the offer to the other peer in the room
      socket.to(room_id).emit(SIGNALING_EVENTS.OFFER_SENT, { room_id, user_id, offer });

      // Send success response to the sender
      const response = successResponse(null, 'Offer sent');
      callback?.(response);
    };

    const handleAnswer = async (payload: z.infer<typeof handleAnswerSchema>, callback?: (response: SocketResponse) => void) => {
      const parseResult = handleAnswerSchema.safeParse(payload);
      if (!parseResult.success) {
        const errors = prettyZodErrors(parseResult.error);
        const response = errorResponse(StatusCodes.BAD_REQUEST, 'Invalid payload', { errors });
        callback?.(response);
        return;
      }

      const user_id = socket.session?.userId;

      const { room_id, answer } = parseResult.data;

      const { canAccess, error } = await canUserAccessSession(user_id, room_id);

      if (!canAccess) {
        callback?.(error);
        return;
      }

      // Broadcast the answer to the other peer in the room
      socket.to(room_id).emit(SIGNALING_EVENTS.ANSWER_SENT, { room_id, user_id, answer });

      // Send success response to the sender
      const response = successResponse(null, 'Answer sent');
      callback?.(response);
    };

    const handleCandidates = async (payload: z.infer<typeof handleCandidatesSchema>, callback?: (response: SocketResponse) => void) => {
      const parseResult = handleCandidatesSchema.safeParse(payload);
      if (!parseResult.success) {
        const errors = prettyZodErrors(parseResult.error);
        const response = errorResponse(StatusCodes.BAD_REQUEST, 'Invalid payload', { errors });
        callback?.(response);
        return;
      }

      const user_id = socket.session?.userId;

      const { room_id, candidates } = parseResult.data;

      const { canAccess, error } = await canUserAccessSession(user_id, room_id);

      if (!canAccess) {
        callback?.(error);
        return;
      }

      // Broadcast the candidates to the other peer in the room
      socket.to(room_id).emit(SIGNALING_EVENTS.CANDIDATES_SENT, { room_id, user_id, candidates });

      // Send success response to the sender
      const response = successResponse(null, 'Candidates sent');
      callback?.(response);
    };

    const handleDisconnect = async () => {
      const user_id = socket.session?.userId;
      const signalingData = socket.data.signaling;
      if (!signalingData) {
        return;
      }
      const { room_id } = signalingData;

      socket.leave(room_id);

      // Clear user's socket ID in the session
      const session = await db.p2PSessions.findFirst({ where: { room_id } });
      if (session) {
        await db.p2PSessions.update({
          where: { id: session.id },
          data: {
            ...(session.sender_id === user_id ? { sender_socket_id: null } : { receiver_socket_id: null }),
          },
        });
      }

      // Notify other peers in the room about the disconnection
      socket.to(room_id).emit(SIGNALING_EVENTS.PEER_DISCONNECTED, { room_id, user_id });
    };

    socket.on(SIGNALING_EVENTS.JOIN_SESSION, joinSignalingSession);
    socket.on(SIGNALING_EVENTS.OFFER, handleOffer);
    socket.on(SIGNALING_EVENTS.ANSWER, handleAnswer);
    socket.on(SIGNALING_EVENTS.CANDIDATES, handleCandidates);
    socket.on(SIGNALING_EVENTS.DISCONNECT, handleDisconnect);
    socket.on('disconnect', handleDisconnect);
  };
};

const joinSignalingSessionSchema = z.object({
  room_id: z.string().uuid(),
});

const handleOfferSchema = z.object({
  room_id: z.string().uuid(),
  offer: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), { message: 'Invalid PGP armored message' }),
});

const handleAnswerSchema = z.object({
  room_id: z.string().uuid(),
  answer: z.string().refine((val) => PGPValidator.isValidPGPMessage(val), { message: 'Invalid PGP armored message' }),
});

const handleCandidatesSchema = z.object({
  room_id: z.string().uuid(),
  candidates: z.array(z.string().refine((val) => PGPValidator.isValidPGPMessage(val), { message: 'Invalid PGP armored message' })),
});

export default registerSignalingHandlers;
