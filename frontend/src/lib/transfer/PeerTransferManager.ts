import Env from "../EnvManager";
import { io, Socket } from "socket.io-client";
import webrtcConfig from "@/config/webrtc.config";
import { CryptoBridge } from "../crypto/workers/CryptoBridge";
import { SessionKey } from "openpgp";
import { devOnly } from "@/utils/dev";
import { ProgressStore } from "./ProgressStore";
import { 
  P2P_STORAGE_KEYS, 
  P2PSessionProgress, 
  P2PFileProgress 
} from "@/lib/storage/p2pStorageKeys";

export interface SocketResponse<T = unknown> {
  isError: boolean;
  code: number;
  message: string;
  data?: T;
}

// --- State and Callbacks ---

export enum PeerTransferState {
  IDLE = "IDLE",
  CONNECTING_SIGNALING = "CONNECTING_SIGNALING",
  WAITING_FOR_PEER = "WAITING_FOR_PEER",
  CONNECTING_WEBRTC = "CONNECTING_WEBRTC",
  CONNECTION_ESTABLISHED = "CONNECTION_ESTABLISHED",
  TRANSFER_IN_PROGRESS = "TRANSFER_IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CLOSED = "CLOSED",
}

export type PeerTransferCallbacks = {
  onStateChange?: (state: PeerTransferState) => void;
  onProgress?: (progress: number, details?: P2PSessionProgress) => void; // Updated signature
  onError?: (error: Error) => void;
  onFileReceived?: (file: File) => void;
};

// --- P2P Message Protocol ---

enum MsgType {
  // Control
  FILE_HEADER = "FILE_HEADER",
  FILE_CHUNK = "FILE_CHUNK",
  FILE_ACK = "FILE_ACK", // Receiver acknowledges header
  CHUNK_ACK = "CHUNK_ACK", // Receiver acknowledges chunk
  TRANSFER_COMPLETE = "TRANSFER_COMPLETE", // Sender sends
  RESUME = "RESUME", // Receiver requests resumption
}

type FileHeader = {
  id: string;
  name: string;
  size: number;
  type: string;
};
type FileChunk = { fileId: string; index: number; data: Uint8Array };

type PeerProtocolMessage =
  | { type: MsgType.FILE_HEADER; payload: FileHeader }
  | { type: MsgType.FILE_ACK; payload: { fileId: string } }
  | { type: MsgType.FILE_CHUNK; payload: FileChunk } // This is now only used INTERNALLY by AnswerPeer
  | { type: MsgType.CHUNK_ACK; payload: { fileId: string; index: number } }
  | { type: MsgType.TRANSFER_COMPLETE }
  | {
      type: MsgType.RESUME;
      payload: { fileId: string; lastChunkIndex: number };
    };

// A simplified serializer for CONTROL MESSAGES ONLY
class MessageSerializer {
  static serialize(msg: PeerProtocolMessage): string {
    // We NO LONGER handle FILE_CHUNK here
    return JSON.stringify(msg);
  }

  static deserialize(json: string): PeerProtocolMessage {
    // We NO LONGER handle FILE_CHUNK here
    return JSON.parse(json) as PeerProtocolMessage;
  }
}

// --- Signaling (Enhanced) ---

const SIGNALING_EVENTS = {
  JOIN_SESSION: "signaling:join-session",
  PEER_JOINED: "signaling:peer-joined",
  LEAVE_SESSION: "signaling:leave-session",
  PEER_LEFT: "signaling:peer-left",
  OFFER: "signaling:offer",
  OFFER_SENT: "signaling:offer-sent",
  ANSWER: "signaling:answer",
  ANSWER_SENT: "signaling:answer-sent",
  CANDIDATES: "signaling:candidates",
  CANDIDATES_SENT: "signaling:candidates-sent",
  DISCONNECT: "signaling:disconnect",
  PEER_DISCONNECTED: "signaling:peer-disconnected",
};

const cryptoBridge = CryptoBridge.getInstance();

class SignalingChannel {
  private socket: Socket;

  constructor() {
    this.socket = io(Env.VITE_API_BASE_URL, {
      path: "/ws",
      withCredentials: true,
      autoConnect: false,
    });
  }

  connect(): Promise<void> {
    devOnly(() => console.log("Signaling Channel connect method called"));
    return new Promise((resolve, reject) => {
      this.socket.once("connect", () => {
        devOnly(() => console.log("SignalingChannel connected successfully"));
        resolve();
      });
      this.socket.once("connect_error", (err) => {
        devOnly(() => console.error("SignalingChannel connect_error:", err));
        reject(new Error(`Signaling connection failed: ${err.message}`));
      });
      this.socket.connect();
    });
  }

  close() {
    this.socket.disconnect();
  }

  joinSession(
    roomId: string,
    callback: (response: SocketResponse<unknown>) => void
  ) {
    devOnly(() => console.log("Joining signaling session..."));
    this.socket.emit(
      SIGNALING_EVENTS.JOIN_SESSION,
      { room_id: roomId },
      callback
    );
  }

  sendOffer(
    roomId: string,
    offer: string,
    callback: (response: SocketResponse<unknown>) => void
  ) {
    devOnly(() => console.log("Sending offer..."));
    this.socket.emit(
      SIGNALING_EVENTS.OFFER,
      { room_id: roomId, offer },
      callback
    );
  }

  sendAnswer(
    roomId: string,
    answer: string,
    callback: (response: SocketResponse<unknown>) => void
  ) {
    devOnly(() => console.log("Sending answer..."));
    this.socket.emit(
      SIGNALING_EVENTS.ANSWER,
      { room_id: roomId, answer },
      callback
    );
  }

  sendIceCandidates(
    roomId: string,
    candidates: string[],
    callback: (response: SocketResponse<unknown>) => void
  ) {
    devOnly(() => console.log("Sending ICE candidates..."));
    this.socket.emit(
      SIGNALING_EVENTS.CANDIDATES,
      { room_id: roomId, candidates },
      callback
    );
  }

  registerOfferHandler(handler: (offer: string) => void) {
    devOnly(() => console.log("Registering offer handler..."));
    this.socket.on(
      SIGNALING_EVENTS.OFFER_SENT,
      (payload: { offer: string }) => {
        handler(payload.offer);
      }
    );
  }

  registerAnswerHandler(handler: (answer: string) => void) {
    devOnly(() => console.log("Registering answer handler..."));
    this.socket.on(
      SIGNALING_EVENTS.ANSWER_SENT,
      (payload: { answer: string }) => {
        handler(payload.answer);
      }
    );
  }

  registerIceCandidateHandler(handler: (candidates: string[]) => void) {
    devOnly(() => console.log("Registering ICE candidate handler..."));
    this.socket.on(
      SIGNALING_EVENTS.CANDIDATES_SENT,
      (payload: { candidates: string[] }) => {
        handler(payload.candidates);
      }
    );
  }

  registerPeerJoinedHandler(handler: () => void) {
    devOnly(() => console.log("Registering peer joined handler..."));
    this.socket.on(SIGNALING_EVENTS.PEER_JOINED, handler);
  }

  registerPeerLeftHandler(handler: () => void) {
    devOnly(() => console.log("Registering peer left handler..."));
    this.socket.on(SIGNALING_EVENTS.PEER_LEFT, handler);
  }
}

// --- Manager Config ---

export enum PeerTransferMode {
  INCOMING = "incoming",
  OUTGOING = "outgoing",
}

type TransferData = {
  room_id: string;
  session_key: string;
};

export type IncomingConfig = {
  mode: PeerTransferMode.INCOMING;
  transferData: TransferData & {
    files?: { name: string; size: number; type?: string }[];
  };
};

export type OutgoingConfig = {
  mode: PeerTransferMode.OUTGOING;
  files: File[];
  transferData: TransferData;
};

export type PeerTransferManagerConfig = IncomingConfig | OutgoingConfig;

type ConfigForMode<T extends PeerTransferMode> = Extract<
  PeerTransferManagerConfig,
  { mode: T }
>;

// --- Base Peer (Common Logic) ---

abstract class BasePeer<T extends PeerTransferMode> {
  protected peer: RTCPeerConnection;
  protected dataChannel: RTCDataChannel | null = null;
  protected progressStore = ProgressStore.getInstance();
  protected CHUNK_SIZE = 64 * 1024; // 64KB
  protected MAX_BUFFERED_AMOUNT = 15 * 1024 * 1024; // 15MB buffer
  protected stateSessionKey: string;
  protected candidateQueue: RTCIceCandidate[] = [];

  constructor(
    protected manager: PeerTransferManager<T>,
    protected sessionKey: SessionKey
  ) {
    this.peer = new RTCPeerConnection(webrtcConfig.peerConnectionConfig);
    this.setupConnectionStateLogger();
    this.stateSessionKey = `p2p-session-${this.manager.transferData.room_id}`;

    // H. Listen for ICE candidates to send to Peer
    this.peer.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidate = await this.encrypt(JSON.stringify(event.candidate));
        this.manager.signalingChannel.sendIceCandidates(
          this.manager.transferData.room_id,
          [candidate],
          (response) => {
            if (response.isError) {
              this.manager.onError(
                new Error(`Failed to send ICE candidate: ${response.message}`)
              );
            } else {
              devOnly(() => console.log("ICE candidate sent", response));
            }
          }
        );
      }
    };
  }

  protected abstract registerPeer(): void;
  protected abstract onDataChannelOpen(): void;
  protected abstract handleProtocolMessage(msg: PeerProtocolMessage): void;
  // RE-ADDED: handleChunkMessage
  protected abstract handleChunkMessage(data: ArrayBuffer): void;

  protected setupConnectionStateLogger() {
    this.peer.onconnectionstatechange = () => {
      devOnly(() =>
        console.log(`Peer state changed: ${this.peer.connectionState}`)
      );
      switch (this.peer.connectionState) {
        case "connected":
          this.manager.setState(PeerTransferState.CONNECTION_ESTABLISHED);
          break;
        case "disconnected":
        case "failed":
          this.manager.onError(
            new Error(`WebRTC connection ${this.peer.connectionState}`)
          );
          this.manager.setState(PeerTransferState.FAILED);
          this.manager.close();
          break;
        case "closed":
          this.manager.setState(PeerTransferState.CLOSED);
          break;
      }
    };
  }

  protected setupDataChannelEvents(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer"; // Ensure we receive ArrayBuffers
    channel.onopen = () => {
      devOnly(() => console.log("Data channel is OPEN"));
      this.manager.setState(PeerTransferState.TRANSFER_IN_PROGRESS);
      this.onDataChannelOpen();
    };
    channel.onmessage = (event: MessageEvent) => this._onMessage(event);
    channel.onclose = () => {
      devOnly(() => console.log("Data channel is CLOSED"));
      this.manager.close();
    };
    channel.onerror = (error) => {
      devOnly(() => console.error("Data channel error:", error));
      this.manager.onError(new Error("Data channel error"));
      this.manager.setState(PeerTransferState.FAILED);
    };
  }

  // REVERTED: _onMessage now handles both string and ArrayBuffer
  private _onMessage(event: MessageEvent) {
    try {
      if (typeof event.data === "string") {
        // This is a CONTROL message
        // This is fast, so we can await it
        this.handleControlMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        // This is a FILE_CHUNK, pass to subclass
        // This is slow, so we DO NOT await it.
        this.handleChunkMessage(event.data);
      }
    } catch (error) {
      devOnly(() => console.error("Failed to handle message", error));
      this.manager.onError(new Error("Failed to process message"));
      this.manager.setState(PeerTransferState.FAILED);
    }
  }

  // NEW: Helper to process control messages
  private async handleControlMessage(data: string) {
    try {
      const decrypted = await this.decrypt(data);
      const msg = MessageSerializer.deserialize(decrypted);
      await this.handleProtocolMessage(msg);
    } catch (error) {
      devOnly(() => console.error("Failed to handle control message", error));
      this.manager.onError(new Error("Failed to process control message"));
      this.manager.setState(PeerTransferState.FAILED);
    }
  }

  protected async sendControlMessage(msg: PeerProtocolMessage) {
    if (this.dataChannel?.readyState === "open") {
      try {
        const json = MessageSerializer.serialize(msg);
        const encrypted = await this.encrypt(json);
        this.dataChannel.send(encrypted);
      } catch (error) {
        devOnly(() => console.error("Failed to send message", error));
        this.manager.onError(new Error("Failed to send message"));
      }
    }
  }

  // RE-ADDED: sendChunkMessage for raw binary
  protected async sendChunkMessage(chunk: Uint8Array) {
    if (this.dataChannel?.readyState === "open") {
      try {
        // 1. Encrypt to BINARY
        const encryptedChunk = await cryptoBridge.encrypt(chunk, {
          sessionKey: this.sessionKey,
          outputFormat: "binary",
        });

        // 2. Get the underlying buffer
        const buffer = encryptedChunk.data.buffer as ArrayBuffer;

        this.dataChannel.send(buffer);
      } catch (error) {
        devOnly(() => console.error("Failed to send message", error));
        this.manager.onError(new Error("Failed to send message"));
      }
    }
  }

  protected async encrypt(data: string): Promise<string> {
    const encrypted = await cryptoBridge.encrypt(data, {
      sessionKey: this.sessionKey,
      outputFormat: "armored",
    });
    return encrypted.data;
  }

  protected async decrypt(data: string): Promise<string> {
    const decrypted = await cryptoBridge.decrypt(data, {
      sessionKey: this.sessionKey,
      outputFormat: "string",
    });
    return decrypted;
  }

  // Waits for the data channel buffer to clear
  protected async waitForBuffer() {
    if (
      !this.dataChannel ||
      this.dataChannel.bufferedAmount <= this.MAX_BUFFERED_AMOUNT
    ) {
      return;
    }
    devOnly(() => console.warn("Data channel buffer full, waiting..."));
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (
          !this.dataChannel ||
          this.dataChannel.bufferedAmount <= this.MAX_BUFFERED_AMOUNT
        ) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  public close() {
    this.dataChannel?.close();
    this.peer?.close();
  }

  // --- Persistence Methods ---

  protected saveProgress(progress: P2PSessionProgress) {
    try {
      const key = `${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${this.manager.transferData.room_id}`;
      localStorage.setItem(key, JSON.stringify(progress));
      
      // Also update latest active session timestamp
      const latestSessionStr = localStorage.getItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
      if (latestSessionStr) {
        const session = JSON.parse(latestSessionStr);
        if (session.roomId === this.manager.transferData.room_id) {
          session.lastActivity = Date.now();
          localStorage.setItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION, JSON.stringify(session));
        }
      }
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }

  protected loadProgress(): P2PSessionProgress | null {
    try {
      const key = `${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${this.manager.transferData.room_id}`;
      const str = localStorage.getItem(key);
      return str ? JSON.parse(str) : null;
    } catch (e) {
      console.error("Failed to load progress", e);
      return null;
    }
  }

  protected clearProgress() {
    try {
      const key = `${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${this.manager.transferData.room_id}`;
      localStorage.removeItem(key);
      
      // Also clear from latest active session if it matches
      const latestSessionStr = localStorage.getItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
      if (latestSessionStr) {
        const session = JSON.parse(latestSessionStr);
        if (session.roomId === this.manager.transferData.room_id) {
          localStorage.removeItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
        }
      }
    } catch (e) {
      console.error("Failed to clear progress", e);
    }
  }
}

// --- Peer 1 (Offerer / Sender) ---

class OfferPeer extends BasePeer<PeerTransferMode.OUTGOING> {
  private files: File[];
  private totalTransferSize: number = 0;
  private totalBytesSent: number = 0;

  // Resumption State
  private fileQueue: File[] = [];
  private currentFile: File | null = null;
  private currentFileId: string = "";
  private currentChunkIndex: number = 0;

  constructor(
    manager: PeerTransferManager<PeerTransferMode.OUTGOING>,
    sessionKey: SessionKey,
    files: File[]
  ) {
    super(manager, sessionKey);
    this.files = files;
    this.totalTransferSize = files.reduce((acc, file) => acc + file.size, 0);
    this.fileQueue = [...files];
    this.loadState();
    this.registerPeer();
  }

  registerPeer() {
    this.manager.signalingChannel.registerAnswerHandler(async (answer) => {
      devOnly(() => console.log("PeerA: Received answer"));
      try {
        const decryptedAnswerStr = await this.decrypt(answer);
        const answerDesc = JSON.parse(decryptedAnswerStr);
        await this.peer.setRemoteDescription(
          new RTCSessionDescription(answerDesc)
        );

        devOnly(() => console.log("PeerA: Processing candidate queue..."));
        while (this.candidateQueue.length) {
          const candidate = this.candidateQueue.shift();
          if (candidate) {
            try {
              await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              devOnly(() =>
                console.warn("PeerA: Error adding queued ICE candidate", e)
              );
            }
          }
        }
      } catch {
        this.manager.onError(new Error("Failed to process answer"));
        this.manager.setState(PeerTransferState.FAILED);
      }
    });

    this.manager.signalingChannel.registerIceCandidateHandler(
      async (candidates) => {
        for (const encryptedCandidate of candidates) {
          devOnly(() => console.log("PeerA: Received ICE candidate"));
          try {
            const decryptedCandidateStr = await this.decrypt(
              encryptedCandidate
            );
            const candidate = JSON.parse(decryptedCandidateStr);
            if (this.peer.remoteDescription) {
              await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              devOnly(() =>
                console.log(
                  "PeerA: Remote description not set, queueing candidate."
                )
              );
              this.candidateQueue.push(candidate);
            }
          } catch (e) {
            devOnly(() => console.warn("Failed to add ICE candidate", e));
          }
        }
      }
    );
  }

  async createCall() {
    try {
      devOnly(() => console.log("PeerA: Creating data channel..."));
      this.dataChannel = this.peer.createDataChannel(
        this.manager.transferData.room_id,
        webrtcConfig.dataChannelConfig
      );
      this.setupDataChannelEvents(this.dataChannel);

      devOnly(() => console.log("PeerA: Creating offer..."));
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);

      const encryptedOffer = await this.encrypt(JSON.stringify(offer));
      this.manager.signalingChannel.sendOffer(
        this.manager.transferData.room_id,
        encryptedOffer,
        (response) => {
          if (response.isError) {
            this.manager.onError(
              new Error(`Failed to send offer: ${response.message}`)
            );
          } else {
            devOnly(() => console.log("PeerA: Offer sent", response));
          }
        }
      );
    } catch (e) {
      this.manager.onError(e as Error);
      this.manager.setState(PeerTransferState.FAILED);
    }
  }

  onDataChannelOpen(): void {
    this.manager.signalingChannel.registerPeerJoinedHandler(() => {
      devOnly(() => console.log("Peer re-joined, waiting for RESUME..."));
    });
    if (this.currentChunkIndex === 0) {
      this.sendNextFileHeader();
    }
  }

  // Sender should not receive raw chunks
  protected handleChunkMessage(data: ArrayBuffer): void {
    devOnly(() =>
      console.warn("OfferPeer received unexpected file chunk.", data.byteLength)
    );
  }

  protected async handleProtocolMessage(msg: PeerProtocolMessage) {
    switch (msg.type) {
      case MsgType.FILE_ACK:
        devOnly(() => console.log("OfferPeer received FILE_ACK:", msg.payload));
        if (msg.payload.fileId === this.currentFileId) {
          devOnly(() =>
            console.log(`Receiver ACK file: ${this.currentFileId}`)
          );
          this.currentChunkIndex = 0;
          this.updateProgress();
          this.sendNextChunk();
        }
        break;
      case MsgType.CHUNK_ACK:
        devOnly(() =>
          console.log("OfferPeer received CHUNK_ACK:", msg.payload)
        );
        if (
          msg.payload.fileId === this.currentFileId &&
          msg.payload.index >= this.currentChunkIndex
        ) {
          const chunk = this.currentFile!.slice(
            this.currentChunkIndex * this.CHUNK_SIZE,
            (this.currentChunkIndex + 1) * this.CHUNK_SIZE
          );
          this.totalBytesSent += chunk.size;
          this.manager.onProgress(this.totalBytesSent / this.totalTransferSize);
          this.currentChunkIndex = msg.payload.index + 1;
          this.updateProgress();
          this.sendNextChunk();
        } else {
          devOnly(() =>
            console.log(
              `Ignoring CHUNK_ACK for fileId=${msg.payload.fileId}, index=${msg.payload.index}`
            )
          );
        }
        break;
      case MsgType.RESUME:
        devOnly(() => console.log("OfferPeer received RESUME:", msg.payload));
        devOnly(() =>
          console.log(
            `Receiver requested RESUME: ${msg.payload.fileId} at ${msg.payload.lastChunkIndex}`
          )
        );
        this.currentFileId = msg.payload.fileId;
        this.currentFile =
          this.files.find(
            (f) =>
              f.name ===
              this.fileQueue.find((fq) => fq.name === this.currentFile?.name)
                ?.name
          ) || null;
        this.currentFile = this.files[parseInt(this.currentFileId)];
        this.currentChunkIndex = msg.payload.lastChunkIndex + 1;
        this.sendNextChunk();
        break;
    }
  }

  private sendNextFileHeader() {
    if (this.fileQueue.length === 0) {
      devOnly(() => console.log("All files sent. Sending TRANSFER_COMPLETE."));
      this.sendControlMessage({ type: MsgType.TRANSFER_COMPLETE });
      this.manager.setState(PeerTransferState.COMPLETED);
      this.clearProgress();
      return;
    }

    this.currentFile = this.fileQueue.shift()!;
    this.currentFileId = this.files.indexOf(this.currentFile).toString();
    this.currentChunkIndex = 0;
    this.updateProgress();

    const header: FileHeader = {
      id: this.currentFileId,
      name: this.currentFile.name,
      size: this.currentFile.size,
      type: this.currentFile.type,
    };
    devOnly(() => console.log(`Sending FILE_HEADER: ${header.name}`));
    this.sendControlMessage({ type: MsgType.FILE_HEADER, payload: header });
  }

  // REVERTED: sendNextChunk now sends raw binary
  private async sendNextChunk() {
    if (!this.currentFile) return;

    devOnly(() =>
      console.log(
        `Sending chunk ${this.currentChunkIndex} of file: ${this.currentFileId}`
      )
    );

    await this.waitForBuffer();

    const start = this.currentChunkIndex * this.CHUNK_SIZE;
    if (start >= this.currentFile.size) {
      devOnly(() =>
        console.log(`Finished sending file: ${this.currentFileId}`)
      );
      this.sendNextFileHeader(); // Send next file
      return;
    }

    const end = start + this.CHUNK_SIZE;
    const chunk = this.currentFile.slice(start, end);
    const data = await chunk.arrayBuffer();

    // REVERTED: Call sendChunkMessage
    await this.sendChunkMessage(new Uint8Array(data));
  }

  private updateProgress() {
    const filesProgress: P2PFileProgress[] = this.files.map((file, index) => {
      const isComplete = index < parseInt(this.currentFileId);
      const isCurrent = index === parseInt(this.currentFileId);
      
      let status: 'queued' | 'transferring' | 'complete' | 'error' = 'queued';
      let bytesTransferred = 0;

      if (isComplete) {
        status = 'complete';
        bytesTransferred = file.size;
      } else if (isCurrent) {
        status = 'transferring';
        bytesTransferred = this.currentChunkIndex * this.CHUNK_SIZE;
        if (bytesTransferred > file.size) bytesTransferred = file.size;
      }

      return {
        name: file.name,
        status,
        bytesTransferred,
        totalBytes: file.size,
      };
    });

    const progress: P2PSessionProgress = {
      files: filesProgress,
      overallBytesTransferred: this.totalBytesSent,
      overallTotalBytes: this.totalTransferSize,
      lastUpdated: Date.now(),
    };

    this.saveProgress(progress);
    this.manager.onProgress(this.totalBytesSent / this.totalTransferSize, progress);
  }

  private loadState() {
    const progress = this.loadProgress();
    if (!progress) return;

    try {
      // Find the first non-complete file
      const currentFileIndex = progress.files.findIndex(f => f.status !== 'complete');
      
      if (currentFileIndex === -1) {
        // All complete?
        return;
      }

      this.currentFileId = currentFileIndex.toString();
      this.currentFile = this.files[currentFileIndex];
      
      // Calculate chunk index from bytes transferred
      const currentFileProgress = progress.files[currentFileIndex];
      this.currentChunkIndex = Math.floor(currentFileProgress.bytesTransferred / this.CHUNK_SIZE);
      
      // Reconstruct queue
      this.fileQueue = this.files.slice(currentFileIndex);
      this.totalBytesSent = progress.overallBytesTransferred;

      devOnly(() =>
        console.log(
          `Resuming sender state: file ${this.currentFileId}, chunk ${this.currentChunkIndex}`
        )
      );
    } catch (e) {
      this.clearProgress();
    }
  }

  public hasResumedState(): boolean {
    return this.currentChunkIndex > 0 || parseInt(this.currentFileId) > 0;
  }
}

// --- Peer 2 (Answerer / Receiver) ---

class AnswerPeer extends BasePeer<PeerTransferMode.INCOMING> {
  // Resumption State
  private receivedFilesMetadata = new Map<string, FileHeader>();
  private lastAcknowledgedChunk = new Map<string, number>();

  // RE-ADDED: Queue properties
  private chunkQueue: ArrayBuffer[] = [];
  private processingQueue = false;
  private totalTransferSize = 0;

  constructor(
    manager: PeerTransferManager<PeerTransferMode.INCOMING>,
    sessionKey: SessionKey
  ) {
    super(manager, sessionKey);
    // Initialize totalTransferSize from config
    if (this.manager.config.transferData.files) {
      this.totalTransferSize = this.manager.config.transferData.files.reduce((acc, f) => acc + f.size, 0);
    }
    this.loadState();
    this.registerPeer();
  }

  registerPeer() {
    this.manager.signalingChannel.registerOfferHandler(async (offer) => {
      devOnly(() => console.log("PeerB: Received offer"));
      try {
        const decryptedOfferStr = await this.decrypt(offer);
        const offerDesc = JSON.parse(decryptedOfferStr);
        await this.peer.setRemoteDescription(
          new RTCSessionDescription(offerDesc)
        );

        this.peer.ondatachannel = (event: RTCDataChannelEvent) => {
          devOnly(() => console.log("PeerB: Received data channel"));
          this.dataChannel = event.channel;
          this.setupDataChannelEvents(this.dataChannel);
        };

        devOnly(() => console.log("PeerB: Creating answer..."));
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        const encryptedAnswer = await this.encrypt(JSON.stringify(answer));
        this.manager.signalingChannel.sendAnswer(
          this.manager.transferData.room_id,
          encryptedAnswer,
          (response) => {
            if (response.isError) {
              this.manager.onError(
                new Error(`Failed to send answer: ${response.message}`)
              );
            } else {
              devOnly(() => console.log("PeerB: Answer sent", response));
            }
          }
        );

        devOnly(() => console.log("PeerB: Processing candidate queue..."));
        while (this.candidateQueue.length) {
          const candidate = this.candidateQueue.shift();
          if (candidate) {
            try {
              await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              devOnly(() =>
                console.warn("PeerB: Error adding queued ICE candidate", e)
              );
            }
          }
        }
      } catch (e) {
        this.manager.onError(e as Error);
        this.manager.setState(PeerTransferState.FAILED);
      }
    });

    this.manager.signalingChannel.registerIceCandidateHandler(
      async (candidates) => {
        for (const encryptedCandidate of candidates) {
          devOnly(() => console.log("PeerB: Received ICE candidate"));
          try {
            const decryptedCandidateStr = await this.decrypt(
              encryptedCandidate
            );
            const candidate = JSON.parse(decryptedCandidateStr);
            if (this.peer.remoteDescription) {
              await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              devOnly(() =>
                console.log(
                  "PeerB: Remote description not set, queueing candidate."
                )
              );
              this.candidateQueue.push(candidate);
            }
          } catch (e) {
            devOnly(() => console.warn("Failed to add ICE candidate", e));
          }
        }
      }
    );
  }

  onDataChannelOpen(): void {
    if (this.receivedFilesMetadata.size > 0) {
      const lastFileId = Array.from(this.receivedFilesMetadata.keys()).pop()!;
      const lastChunkIndex = this.lastAcknowledgedChunk.get(lastFileId) || -1;
      devOnly(() =>
        console.log(
          `Requesting RESUME from file ${lastFileId}, chunk ${lastChunkIndex}`
        )
      );
      this.sendControlMessage({
        type: MsgType.RESUME,
        payload: { fileId: lastFileId, lastChunkIndex },
      });
    }
  }

  // RE-ADDED: handleChunkMessage (Producer)
  protected handleChunkMessage(data: ArrayBuffer): void {
    try {
      this.chunkQueue.push(data);
      this.processChunkQueue();
    } catch (error) {
      devOnly(() => console.error("Failed to enqueue chunk", error));
      this.manager.onError(new Error("Failed to process chunk"));
      this.manager.setState(PeerTransferState.FAILED);
    }
  }

  // RE-ADDED: processChunkQueue (Consumer)
  private async processChunkQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }
    if (this.chunkQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    const encryptedChunkData = this.chunkQueue.shift()!;

    try {
      // 1. Decrypt the raw binary chunk
      const encryptedChunk = new Uint8Array(encryptedChunkData);
      const decryptedChunk = await cryptoBridge.decrypt(encryptedChunk, {
        sessionKey: this.sessionKey,
        outputFormat: "binary",
      });

      // 2. Get the chunk ID from *our* state
      const { fileId, index } = this.getCurrentExpectedChunk();

      // 3. Pass a synthetic CHUNK message to the protocol handler
      // We await this to ensure handleProtocolMessage finishes before we process the next chunk
      await this.handleProtocolMessage({
        type: MsgType.FILE_CHUNK,
        payload: { fileId, index, data: decryptedChunk },
      });
    } catch (error) {
      devOnly(() => console.error("Failed processing queued chunk", error));
      this.manager.onError(new Error("Failed to process chunk"));
      this.manager.setState(PeerTransferState.FAILED);
    } finally {
      // 5. Release the lock
      this.processingQueue = false;
      // 6. Check for more work
      this.processChunkQueue();
    }
  }

  // RE-ADDED: getCurrentExpectedChunk
  private getCurrentExpectedChunk(): { fileId: string; index: number } {
    const fileId = Array.from(this.receivedFilesMetadata.keys()).pop()!;
    const index = (this.lastAcknowledgedChunk.get(fileId) ?? -1) + 1;
    devOnly(() =>
      console.log(
        `Expecting chunk ${index} for file ${fileId} (last acknowledged: ${
          this.lastAcknowledgedChunk.get(fileId) ?? -1
        })`
      )
    );
    return { fileId, index };
  }

  protected async handleProtocolMessage(msg: PeerProtocolMessage) {
    switch (msg.type) {
      case MsgType.FILE_HEADER:
        devOnly(() => console.log(`Received FILE_HEADER: ${msg.payload.name}`));
        this.receivedFilesMetadata.set(msg.payload.id, msg.payload);
        this.lastAcknowledgedChunk.set(msg.payload.id, -1);
        this.updateProgress();
        this.sendControlMessage({
          type: MsgType.FILE_ACK,
          payload: { fileId: msg.payload.id },
        });
        break;

      case MsgType.FILE_CHUNK: {
        devOnly(() =>
          console.log(
            `Received FILE_CHUNK: fileId=${msg.payload.fileId}, index=${msg.payload.index}, size=${msg.payload.data.byteLength}`
          )
        );
        const { fileId, index, data } = msg.payload;

        // This check is now implicit, as getCurrentExpectedChunk dictates the index
        // We just trust the index we were given by our own state.

        await this.progressStore.put(this.getChunkKey(fileId, index), data);
        devOnly(() =>
          console.log(
            `Stored chunk ${index} for file ${fileId} in progress store.`
          )
        );
        this.lastAcknowledgedChunk.set(fileId, index);
        devOnly(() =>
          console.log(
            "Last acknowledged chunk updated:",
            this.lastAcknowledgedChunk
          )
        );
        this.updateProgress(); // Save last acknowledged chunk index
        this.sendControlMessage({
          type: MsgType.CHUNK_ACK,
          payload: { fileId, index },
        });
        break;
      }

      case MsgType.TRANSFER_COMPLETE:
        devOnly(() =>
          console.log("Received TRANSFER_COMPLETE. Assembling files.")
        );
        this.manager.setState(PeerTransferState.COMPLETED);
        await this.assembleFiles();
        this.clearProgress();
        this.manager.close();
        break;
    }
  }

  private async assembleFiles() {
    for (const [fileId, header] of this.receivedFilesMetadata.entries()) {
      try {
        const totalChunks = Math.ceil(header.size / this.CHUNK_SIZE);
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkKey = this.getChunkKey(fileId, i);
          const chunk = await this.progressStore.get(chunkKey);
          if (chunk) {
            chunks.push(chunk);
            await this.progressStore.delete(chunkKey); // Clean up
          } else {
            throw new Error(`Missing chunk ${i} for file ${fileId}`);
          }
        }
        const blob = new Blob(chunks as BlobPart[], { type: header.type });
        const file = new File([blob], header.name, { type: header.type });
        this.manager.onFileReceived(file);
      } catch (e) {
        devOnly(() => console.error(`Failed to assemble file ${fileId}`, e));
        this.manager.onError(e as Error);
      }
    }
  }

  private getChunkKey(fileId: string, index: number): string {
    return `p2p-${this.manager.transferData.room_id}-${fileId}-chunk-${index}`;
  }

  private updateProgress() {
    // Calculate total bytes received based on acknowledged chunks
    let totalBytesReceived = 0;
    const filesProgress: P2PFileProgress[] = [];

    // We need to reconstruct file progress from metadata and last acknowledged chunk
    this.receivedFilesMetadata.forEach((meta, fileId) => {
      const lastChunk = this.lastAcknowledgedChunk.get(fileId) ?? -1;
      const bytesReceived = Math.min((lastChunk + 1) * this.CHUNK_SIZE, meta.size);
      totalBytesReceived += bytesReceived;

      const isComplete = bytesReceived >= meta.size;
      
      filesProgress.push({
        name: meta.name,
        status: isComplete ? 'complete' : 'transferring', // Simplified status for receiver
        bytesTransferred: bytesReceived,
        totalBytes: meta.size,
      });
    });

    // Sort by file ID to maintain order if possible, or just push
    // For receiver, we might not know the full list initially until we receive headers
    // But we can send what we know.

    const progress: P2PSessionProgress = {
      files: filesProgress,
      overallBytesTransferred: totalBytesReceived,
      overallTotalBytes: this.totalTransferSize,
      lastUpdated: Date.now(),
    };

    this.saveProgress(progress);
    // Calculate percentage
    const percentage = this.totalTransferSize > 0 ? totalBytesReceived / this.totalTransferSize : 0;
    this.manager.onProgress(percentage, progress); 
  }

  private loadState() {
    const progress = this.loadProgress();
    if (!progress) return;

    try {
      devOnly(() => console.log("Loading resume state...", progress));
      
      // 1. Reconstruct receivedFilesMetadata from config
      if (this.manager.config.transferData.files) {
        this.manager.config.transferData.files.forEach((file, index) => {
          const fileId = index.toString();
          this.receivedFilesMetadata.set(fileId, {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream'
          });
        });
      }

      // 2. Restore lastAcknowledgedChunk from saved progress
      progress.files.forEach((f, index) => {
        const fileId = index.toString();
        // Calculate last chunk index based on bytes transferred
        // If bytesTransferred is 0, lastChunk is -1 (start)
        // If bytesTransferred is CHUNK_SIZE, lastChunk is 0
        if (f.bytesTransferred > 0) {
          const lastChunk = Math.floor(f.bytesTransferred / this.CHUNK_SIZE) - 1;
          this.lastAcknowledgedChunk.set(fileId, lastChunk);
        }
      });

      // 3. Emit initial progress to UI
      const percentage = this.totalTransferSize > 0 ? progress.overallBytesTransferred / this.totalTransferSize : 0;
      this.manager.onProgress(percentage, progress);
      
    } catch (e) {
      devOnly(() => console.error("Failed to load receiver state", e));
      this.clearProgress();
    }
  }

  public hasResumedState(): boolean {
    return this.receivedFilesMetadata.size > 0 && this.lastAcknowledgedChunk.size > 0;
  }


}

// --- Main Manager Class ---

class PeerTransferManager<T extends PeerTransferMode> {
  public state: PeerTransferState = PeerTransferState.IDLE;
  public signalingChannel = new SignalingChannel();
  public transferData: TransferData;
  public config: ConfigForMode<T>;

  private mode: T;
  private peer: OfferPeer | AnswerPeer | null = null;
  private sessionKey: SessionKey | null = null;
  private files: File[] = [];

  // Callbacks
  private onStateChange: (state: PeerTransferState) => void;
  public onProgress: (progress: number, details?: P2PSessionProgress) => void;
  public onError: (error: Error) => void;
  public onFileReceived: (file: File) => void;

  constructor(config: ConfigForMode<T>, callbacks: PeerTransferCallbacks) {
    this.config = config;
    this.mode = config.mode;
    this.transferData = config.transferData;
    if (config.mode === PeerTransferMode.OUTGOING) {
      this.files = (config as OutgoingConfig).files;
    }

    this.onStateChange = callbacks.onStateChange || (() => {});
    this.onProgress = callbacks.onProgress || (() => {});
    this.onError =
      callbacks.onError || ((e) => devOnly(() => console.error(e)));
    this.onFileReceived = callbacks.onFileReceived || (() => {});
  }

  public setState(newState: PeerTransferState) {
    if (this.state === newState) return;
    this.state = newState;
    devOnly(() => console.log(`PeerManager State -> ${newState}`));
    this.onStateChange(newState);
  }

  public async startTransfer() {
    try {
      this.setState(PeerTransferState.CONNECTING_SIGNALING);
      devOnly(() => console.log("Connecting to signaling server..."));

      await this.signalingChannel.connect();

      devOnly(() =>
        console.log("Signaling connected. Decrypting session key...")
      );

      const key = this.transferData.session_key;
      console.log("Encrypted session key:", key);

      this.sessionKey = await cryptoBridge.decryptSessionKey(key, {
        decryptWith: "privateKey",
      });

      devOnly(() => console.log("Session key decrypted. Joining session..."));

      this.signalingChannel.joinSession(
        this.transferData.room_id,
        (response) => {
          if (response.isError) {
            this.onError(
              new Error(`Failed to join session: ${response.message}`)
            );
            this.setState(PeerTransferState.FAILED);
          } else {
            devOnly(() => console.log("Joined session", response.data));
            this.setState(PeerTransferState.WAITING_FOR_PEER);
          }
        }
      );

      this.signalingChannel.registerPeerLeftHandler(() => {
        devOnly(() => console.log("Peer has left the session"));
        this.onError(new Error("Peer left the session"));
        this.setState(PeerTransferState.CLOSED);
        this.close();
      });

      if (this.mode === PeerTransferMode.OUTGOING) {
        this.peer = new OfferPeer(
          this as any as PeerTransferManager<PeerTransferMode.OUTGOING>,
          this.sessionKey,
          this.files
        );
        this.signalingChannel.registerPeerJoinedHandler(() => {
          this.setState(PeerTransferState.CONNECTING_WEBRTC);
          (this.peer as OfferPeer).createCall();
        });
      } else {
        this.peer = new AnswerPeer(
          this as any as PeerTransferManager<PeerTransferMode.INCOMING>,
          this.sessionKey
        );
        this.setState(PeerTransferState.CONNECTING_WEBRTC);
      }
    } catch (e) {
      devOnly(() => console.error("Error in startTransfer catch block:", e));
      this.onError(e as Error);
      this.setState(PeerTransferState.FAILED);
    }
  }

  public hasResumedState(): boolean {
    if (this.peer instanceof AnswerPeer) {
      return this.peer.hasResumedState();
    }
    if (this.peer instanceof OfferPeer) {
      return this.peer.hasResumedState();
    }
    return false;
  }



  public close() {
    devOnly(() => {
      console.log("Closing PeerTransferManager...");
      console.trace();
    });

    this.signalingChannel.close();
    this.peer?.close();
    this.peer = null;
    this.setState(PeerTransferState.CLOSED);
  }
}

export default PeerTransferManager;
