import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyStore } from './KeyStore';
import IDBService, { KEY_IDB_STORE } from '../idb/IDBService';

vi.mock('../idb/IDBService', () => {
  return {
    KEY_IDB_STORE: 'key_store_idb',
    default: {
      getDB: vi.fn(),
    },
  };
});

describe('KeyStore', () => {
  let keyStore: KeyStore;
  let mockStore: any;
  let mockTransaction: any;
  let mockDb: any;

  beforeEach(() => {
    keyStore = KeyStore.getInstance();
    
    mockStore = {
      put: vi.fn().mockReturnValue({}),
      get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      delete: vi.fn().mockReturnValue({}),
    };

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockStore),
      oncomplete: null,
      onerror: null,
    };

    mockDb = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
    };

    vi.mocked(IDBService.getDB).mockResolvedValue(mockDb as unknown as IDBDatabase);
  });

  it('should be a singleton', () => {
    const instance1 = KeyStore.getInstance();
    const instance2 = KeyStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should put wrapped key successfully', async () => {
    const payload = { user_id: '123', wrappedKey: 'wrapped', salt: 'salt' };
    
    const putPromise = keyStore.putWrappedKey(payload);
    
    // Simulate oncomplete
    setTimeout(() => {
      if (mockTransaction.oncomplete) {
        mockTransaction.oncomplete();
      }
    }, 10);
    
    await putPromise;

    expect(IDBService.getDB).toHaveBeenCalled();
    expect(mockDb.transaction).toHaveBeenCalledWith(KEY_IDB_STORE, 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(KEY_IDB_STORE);
    expect(mockStore.put).toHaveBeenCalledWith(payload);
  });

  it('should handle put error', async () => {
    const payload = { user_id: '123', wrappedKey: 'wrapped', salt: 'salt' };
    
    const putPromise = keyStore.putWrappedKey(payload);
    mockTransaction.error = new Error('IDB error');
    
    setTimeout(() => {
      if (mockTransaction.onerror) {
        mockTransaction.onerror();
      }
    }, 10);
    
    await expect(putPromise).rejects.toThrow('IDB error');
  });

  it('should get wrapped key successfully', async () => {
    const expectedData = { user_id: '123', wrappedKey: 'wrapped', salt: 'salt' };
    
    let getRequest: any = {};
    mockStore.get.mockReturnValue(getRequest);

    const getPromise = keyStore.getWrappedKey('123');
    
    setTimeout(() => {
      getRequest.result = expectedData;
      if (getRequest.onsuccess) {
        getRequest.onsuccess();
      }
    }, 10);
    
    const result = await getPromise;

    expect(IDBService.getDB).toHaveBeenCalled();
    expect(mockDb.transaction).toHaveBeenCalledWith(KEY_IDB_STORE, 'readonly');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(KEY_IDB_STORE);
    expect(mockStore.get).toHaveBeenCalledWith('123');
    expect(result).toEqual(expectedData);
  });

  it('should handle get error', async () => {
    let getRequest: any = {};
    mockStore.get.mockReturnValue(getRequest);

    const getPromise = keyStore.getWrappedKey('123');
    getRequest.error = new Error('IDB get error');
    
    setTimeout(() => {
      if (getRequest.onerror) {
        getRequest.onerror();
      }
    }, 10);
    
    await expect(getPromise).rejects.toThrow('IDB get error');
  });

  it('should delete wrapped key successfully', async () => {
    const deletePromise = keyStore.deleteWrappedKey('123');
    
    setTimeout(() => {
      if (mockTransaction.oncomplete) {
        mockTransaction.oncomplete();
      }
    }, 10);
    
    await deletePromise;

    expect(IDBService.getDB).toHaveBeenCalled();
    expect(mockDb.transaction).toHaveBeenCalledWith(KEY_IDB_STORE, 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(KEY_IDB_STORE);
    expect(mockStore.delete).toHaveBeenCalledWith('123');
  });

  it('should handle delete error', async () => {
    const deletePromise = keyStore.deleteWrappedKey('123');
    mockTransaction.error = new Error('IDB delete error');
    
    setTimeout(() => {
      if (mockTransaction.onerror) {
        mockTransaction.onerror();
      }
    }, 10);
    
    await expect(deletePromise).rejects.toThrow('IDB delete error');
  });
});
