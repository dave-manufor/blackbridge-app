import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { devOnly } from '@/utils/dev';

interface FileHandleDB extends DBSchema {
  fileHandles: {
    key: string; // sessionId
    value: {
      sessionId: string;
      handles: FileSystemFileHandle[];
      timestamp: number;
    };
  };
}

const DB_NAME = 'blackbridge-p2p-files';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

class FileHandleStore {
  private dbPromise: Promise<IDBPDatabase<FileHandleDB>> | null = null;

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<FileHandleDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Check if File System Access API is supported
   */
  public isSupported(): boolean {
    return 'showOpenFilePicker' in window && 'FileSystemFileHandle' in window;
  }

  /**
   * Save file handles for a session
   */
  public async saveFileHandles(sessionId: string, handles: FileSystemFileHandle[]): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const db = await this.getDB();
      await db.put(STORE_NAME, {
        sessionId,
        handles,
        timestamp: Date.now(),
      });
      devOnly(() => console.log(`[FileHandleStore] Saved ${handles.length} handles for session ${sessionId}`));
    } catch (error) {
      console.error('[FileHandleStore] Failed to save file handles:', error);
    }
  }

  /**
   * Retrieve file handles for a session
   */
  public async getFileHandles(sessionId: string): Promise<FileSystemFileHandle[] | null> {
    if (!this.isSupported()) return null;

    try {
      const db = await this.getDB();
      const data = await db.get(STORE_NAME, sessionId);
      
      if (!data) return null;
      
      // Check if handles are still valid (optional expiration logic could go here)
      return data.handles;
    } catch (error) {
      console.error('[FileHandleStore] Failed to get file handles:', error);
      return null;
    }
  }

  /**
   * Clear handles for a session
   */
  public async clearSession(sessionId: string): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const db = await this.getDB();
      await db.delete(STORE_NAME, sessionId);
      devOnly(() => console.log(`[FileHandleStore] Cleared handles for session ${sessionId}`));
    } catch (error) {
      console.error('[FileHandleStore] Failed to clear session:', error);
    }
  }

  /**
   * Verify if stored handles match expected file metadata
   */
  public async validateHandles(
    handles: FileSystemFileHandle[], 
    expectedFiles: Array<{ name: string; size: number; lastModified: number }>
  ): Promise<boolean> {
    if (handles.length !== expectedFiles.length) return false;

    try {
      for (let i = 0; i < handles.length; i++) {
        const file = await handles[i].getFile();
        const expected = expectedFiles.find(f => f.name === file.name);
        
        if (!expected) return false;
        
        // Check size and last modified (allow small buffer for last modified)
        if (file.size !== expected.size) return false;
        if (Math.abs(file.lastModified - expected.lastModified) > 2000) return false;
      }
      return true;
    } catch (error) {
      console.error('[FileHandleStore] Validation failed:', error);
      return false;
    }
  }
}

export const fileHandleStore = new FileHandleStore();
