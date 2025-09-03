import IDBService, { KEY_IDB_STORE } from "../idb/IDBService";

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

  async putWrappedKey(data: WrappedKeyPayload): Promise<void> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readwrite");
    const store = transaction.objectStore(KEY_IDB_STORE);
    store.put(data);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getWrappedKey(userId: string): Promise<WrappedKeyPayload | undefined> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readonly");
    const store = transaction.objectStore(KEY_IDB_STORE);
    const request = store.get(userId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWrappedKey(userId: string): Promise<void> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(KEY_IDB_STORE, "readwrite");
    const store = transaction.objectStore(KEY_IDB_STORE);
    store.delete(userId);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
