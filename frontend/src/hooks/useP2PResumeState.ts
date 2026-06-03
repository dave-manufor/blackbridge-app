import { useState, useEffect, useCallback } from 'react';
import { 
  P2P_STORAGE_KEYS, 
  P2PLatestSession, 
  P2PSessionProgress 
} from '@/lib/storage/p2pStorageKeys';
import { fileHandleStore } from '@/lib/storage/fileHandleStore';
import { devOnly } from '@/utils/dev';

const RESUME_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const useP2PResumeState = () => {
  const [resumableSession, setResumableSession] = useState<P2PLatestSession | null>(null);
  const [progress, setProgress] = useState<P2PSessionProgress | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Load state on mount
  useEffect(() => {
    checkResumableSession();
  }, []);

  const checkResumableSession = useCallback(() => {
    setIsChecking(true);
    try {
      // 1. Get latest session
      const latestSessionStr = localStorage.getItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
      if (!latestSessionStr) {
        setResumableSession(null);
        setIsChecking(false);
        return;
      }

      const session = JSON.parse(latestSessionStr) as P2PLatestSession;

      // 2. Check if expired (> 1 hour since last activity)
      const now = Date.now();
      if (now - session.lastActivity > RESUME_WINDOW_MS) {
        devOnly(() => console.log('[P2P Resume] Session expired', session.sessionId));
        clearSession(session.sessionId);
        setResumableSession(null);
        setIsChecking(false);
        return;
      }

      // 3. Check if dismissed
      const dismissedStr = localStorage.getItem(P2P_STORAGE_KEYS.DISMISSED_SESSIONS);
      const dismissed = dismissedStr ? JSON.parse(dismissedStr) : [];
      if (dismissed.includes(session.sessionId)) {
        devOnly(() => console.log('[P2P Resume] Session dismissed', session.sessionId));
        setResumableSession(null);
        setIsChecking(false);
        return;
      }

      // 4. Load progress if available
      const progressStr = localStorage.getItem(`${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${session.sessionId}`);
      if (progressStr) {
        setProgress(JSON.parse(progressStr));
      }

      setResumableSession(session);
    } catch (error) {
      console.error('[P2P Resume] Error checking session:', error);
      setResumableSession(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const dismissSession = useCallback((sessionId: string, dontAskAgain: boolean) => {
    if (dontAskAgain) {
      const dismissedStr = localStorage.getItem(P2P_STORAGE_KEYS.DISMISSED_SESSIONS);
      const dismissed = dismissedStr ? JSON.parse(dismissedStr) : [];
      dismissed.push(sessionId);
      localStorage.setItem(P2P_STORAGE_KEYS.DISMISSED_SESSIONS, JSON.stringify(dismissed));
    }
    
    // Clear current session from "latest" slot so we don't ask again immediately
    // unless we want to allow resuming later if they didn't check "don't ask again"?
    // The requirement says "permanently skips that specific transfer" if dismissed.
    // If they just click "Start New" without "Don't ask again", we should probably still clear it 
    // from being the "active" one to unblock the UI, but maybe not add to dismissed list?
    // Actually, "Start New" implies abandoning the old one.
    
    clearSession(sessionId);
    setResumableSession(null);
  }, []);

  const clearSession = useCallback((sessionId: string) => {
    // Remove from latest active session if it matches
    const latestSessionStr = localStorage.getItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
    if (latestSessionStr) {
      const session = JSON.parse(latestSessionStr) as P2PLatestSession;
      if (session.sessionId === sessionId) {
        localStorage.removeItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
      }
    }

    // Clear progress
    localStorage.removeItem(`${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${sessionId}`);
    
    // Clear file handles
    fileHandleStore.clearSession(sessionId);
  }, []);

  const saveSessionActivity = useCallback((session: P2PLatestSession) => {
    localStorage.setItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION, JSON.stringify({
      ...session,
      lastActivity: Date.now()
    }));
  }, []);

  const saveProgress = useCallback((sessionId: string, progressData: P2PSessionProgress) => {
    localStorage.setItem(
      `${P2P_STORAGE_KEYS.TRANSFER_PROGRESS_PREFIX}${sessionId}`, 
      JSON.stringify({
        ...progressData,
        lastUpdated: Date.now()
      })
    );
    
    // Also update last activity timestamp
    const latestSessionStr = localStorage.getItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION);
    if (latestSessionStr) {
      const session = JSON.parse(latestSessionStr) as P2PLatestSession;
      if (session.sessionId === sessionId) {
        localStorage.setItem(P2P_STORAGE_KEYS.LATEST_ACTIVE_SESSION, JSON.stringify({
          ...session,
          lastActivity: Date.now()
        }));
      }
    }
  }, []);

  return {
    resumableSession,
    progress,
    isChecking,
    dismissSession,
    clearSession,
    saveSessionActivity,
    saveProgress,
    checkResumableSession
  };
};
