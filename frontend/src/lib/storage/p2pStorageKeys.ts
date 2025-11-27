export const P2P_STORAGE_KEYS = {
  // List of dismissed session IDs (string[])
  DISMISSED_SESSIONS: 'p2p_dismissed_sessions',
  
  // The single latest active session metadata
  LATEST_ACTIVE_SESSION: 'p2p_latest_active_session',
  
  // Per-session transfer progress
  // Key format: p2p_progress_${sessionId}
  TRANSFER_PROGRESS_PREFIX: 'p2p_progress_',
} as const;

export interface P2PLatestSession {
  sessionId: string;
  roomId: string;
  startedAt: number;
  lastActivity: number;
  recipient: {
    id: string;
    email: string;
  };
  files: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
}

export interface P2PFileProgress {
  name: string;
  status: 'queued' | 'transferring' | 'complete' | 'error';
  bytesTransferred: number;
  totalBytes: number;
  startedAt?: number;
  completedAt?: number;
}

export interface P2PSessionProgress {
  files: P2PFileProgress[];
  overallBytesTransferred: number;
  overallTotalBytes: number;
  lastUpdated: number;
}
