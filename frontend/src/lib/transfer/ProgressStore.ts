import IDBService, { PROGRESS_IDB_STORE } from "../idb/IDBService";

export class ProgressStore {
  private static instance: ProgressStore;

  public static getInstance(): ProgressStore {
    if (!ProgressStore.instance) {
      ProgressStore.instance = new ProgressStore();
    }
    return ProgressStore.instance;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(PROGRESS_IDB_STORE, "readwrite");
    const store = transaction.objectStore(PROGRESS_IDB_STORE);
    store.put(data, key);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(PROGRESS_IDB_STORE, "readonly");
    const store = transaction.objectStore(PROGRESS_IDB_STORE);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await IDBService.getDB();
    const transaction = db.transaction(PROGRESS_IDB_STORE, "readwrite");
    const store = transaction.objectStore(PROGRESS_IDB_STORE);
    store.delete(key);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}
