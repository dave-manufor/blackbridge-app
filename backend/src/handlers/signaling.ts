import { Server, Socket } from 'socket.io';

export const SIGNALING_EVENTS = {
  JOIN_SESSION: 'signaling:join-session',
  OFFER: 'signaling:offer',
  ANSWER: 'signaling:answer',
  CANDIDATES: 'signaling:candidates',
};

const registerSignalingHandlers = () => {
  return (io: Server, socket: Socket) => {
    const joinSignalingSession = async () => {};

    const handleOffer = async () => {};

    const handleAnswer = async () => {};

    const handleCandidates = async () => {};

    socket.on(SIGNALING_EVENTS.JOIN_SESSION, joinSignalingSession);
    socket.on(SIGNALING_EVENTS.OFFER, handleOffer);
    socket.on(SIGNALING_EVENTS.ANSWER, handleAnswer);
    socket.on(SIGNALING_EVENTS.CANDIDATES, handleCandidates);
  };
};

export default registerSignalingHandlers;
