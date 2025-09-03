import idbConfig from "@/config/idb.config";

export const KEY_IDB_STORE = "key_store_idb";
export const PROGRESS_IDB_STORE = "progress_store_idb";

class IDBService {
  private static instance: IDBService;
  private dbPromise: Promise<IDBDatabase>;

  private constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(idbConfig.name, idbConfig.version);

      // This is now the ONLY onupgradeneeded handler for the entire app.
      request.onupgradeneeded = () => {
        const db = request.result;
        console.log("Upgrading database schema...");

        // Create the key store if it doesn't exist
        if (!db.objectStoreNames.contains(KEY_IDB_STORE)) {
          console.log(`Creating object store: ${KEY_IDB_STORE}`);
          db.createObjectStore(KEY_IDB_STORE, { keyPath: "user_id" });
        }

        // Create the progress store if it doesn't exist
        if (!db.objectStoreNames.contains(PROGRESS_IDB_STORE)) {
          console.log(`Creating object store: ${PROGRESS_IDB_STORE}`);
          db.createObjectStore(PROGRESS_IDB_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public static getInstance(): IDBService {
    if (!IDBService.instance) {
      IDBService.instance = new IDBService();
    }
    return IDBService.instance;
  }

  public getDB(): Promise<IDBDatabase> {
    return this.dbPromise;
  }
}

export default IDBService.getInstance();
