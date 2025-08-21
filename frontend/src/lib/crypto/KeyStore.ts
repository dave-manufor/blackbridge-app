import idbConfig from "@/config/idb.config";

const KEY_IDB_STORE = "key_store_idb";

interface WrappedKeyPayload {
  user_id: string;
  wrappedKey: string;
  salt: string;
}

export class KeyStore {
  private static instance: KeyStore;

  public static getInstance(): KeyStore {
    if (!KeyStore.instance) {
      KeyStore.instance = new KeyStore();
    }
    return KeyStore.instance;
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(idbConfig.name, idbConfig.version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEY_IDB_STORE)) {
          db.createObjectStore(KEY_IDB_STORE, { keyPath: "user_id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async putWrappedKey(data: WrappedKeyPayload): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readwrite");
    const store = transaction.objectStore(KEY_IDB_STORE);
    store.put(data);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getWrappedKey(userId: string): Promise<WrappedKeyPayload | undefined> {
    const db = await this.openDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readonly");
    const store = transaction.objectStore(KEY_IDB_STORE);
    const request = store.get(userId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWrappedKey(userId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readwrite");
    const store = transaction.objectStore(KEY_IDB_STORE);
    store.delete(userId);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
