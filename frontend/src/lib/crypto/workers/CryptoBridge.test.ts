// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CryptoBridge } from './CryptoBridge';
import { CryptoWorkerPool } from './CryptoWorkerPool';
import { KeyStore } from '../KeyStore';
import bcrypt from 'bcryptjs';

vi.mock('./CryptoWorkerPool', () => {
  const mockWorker = {
    generateRandomFragment: vi.fn(),
    wrapPrivateKey: vi.fn(),
    changePrivateKeyPassphrase: vi.fn(),
    testPassphrase: vi.fn(),
    encryptFragment: vi.fn(),
    decryptFragment: vi.fn(),
    generateSessionKey: vi.fn(),
    encryptSessionKeys: vi.fn(),
    decryptSessionKey: vi.fn(),
    generateKeyPair: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    decryptBinaryAsStream: vi.fn(),
    encryptAndSign: vi.fn(),
    decryptAndVerify: vi.fn(),
  };

  return {
    CryptoWorkerPool: {
      getInstance: vi.fn().mockReturnValue({
        spawn: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        clearWorkers: vi.fn().mockResolvedValue(undefined),
        getWorker: vi.fn().mockReturnValue(mockWorker),
      }),
    },
  };
});

vi.mock('../KeyStore', () => {
  return {
    KeyStore: {
      getInstance: vi.fn().mockReturnValue({
        putWrappedKey: vi.fn().mockResolvedValue(undefined),
        getWrappedKey: vi.fn(),
        deleteWrappedKey: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue('mockSalt'),
    hash: vi.fn().mockImplementation(async (data: string) => `hashed_${data}`),
  },
  genSalt: vi.fn().mockResolvedValue('mockSalt'),
  hash: vi.fn().mockImplementation(async (data: string) => `hashed_${data}`),
}));

vi.mock('@/lib/StreamBridge', () => ({
  StreamBridge: {
    serialize: vi.fn().mockReturnValue('mockPort'),
    deserialize: vi.fn().mockReturnValue('mockStream'),
  },
}));

vi.mock('comlink', () => ({
  transfer: vi.fn().mockReturnValue('mockTransfer'),
}));

describe('CryptoBridge', () => {
  let cryptoBridge: CryptoBridge;
  let mockWorkerPool: any;
  let mockWorker: any;
  let mockKeyStore: any;

  beforeEach(() => {
    // Reset singleton instance to ensure clean tests
    // @ts-ignore
    CryptoBridge.instance = undefined;
    cryptoBridge = CryptoBridge.getInstance();
    
    mockWorkerPool = CryptoWorkerPool.getInstance();
    mockWorker = mockWorkerPool.getWorker();
    mockKeyStore = KeyStore.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = CryptoBridge.getInstance();
    const instance2 = CryptoBridge.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should spawn worker pool', async () => {
    await cryptoBridge.spawn();
    expect(mockWorkerPool.spawn).toHaveBeenCalledTimes(1);
    
    // Calling spawn again should not call spawn on workerPool
    await cryptoBridge.spawn();
    expect(mockWorkerPool.spawn).toHaveBeenCalledTimes(1);
  });

  it('should initialize and store wrapped key', async () => {
    const userId = 'user123';
    const armoredKey = 'armored_key';
    const passphrase = 'password';
    
    mockWorker.generateRandomFragment.mockResolvedValue('random_fragment');
    mockWorker.wrapPrivateKey.mockResolvedValue('wrapped_private_key');
    
    const fragment = await cryptoBridge.initialize(userId, armoredKey, passphrase);
    
    expect(fragment).toBe('random_fragment');
    expect(mockWorkerPool.initialize).toHaveBeenCalledWith(armoredKey, passphrase);
    expect(mockWorker.generateRandomFragment).toHaveBeenCalled();
    expect(bcrypt.genSalt || (bcrypt as any).default.genSalt).toHaveBeenCalled();
    const hashFunc = bcrypt.hash || (bcrypt as any).default.hash;
    expect(hashFunc).toHaveBeenCalledWith('random_fragment', 'mockSalt');
    expect(mockWorker.wrapPrivateKey).toHaveBeenCalledWith({ passphrase: 'hashed_random_fragment' });
    expect(mockKeyStore.putWrappedKey).toHaveBeenCalledWith({
      user_id: userId,
      wrappedKey: 'wrapped_private_key',
      salt: 'mockSalt',
    });
  });

  it('should initialize from local storage', async () => {
    const userId = 'user123';
    const password = 'password';
    
    mockKeyStore.getWrappedKey.mockResolvedValue({
      salt: 'storedSalt',
      wrappedKey: 'storedWrappedKey',
    });
    
    await cryptoBridge.initializeFromLocal(userId, password);
    
    expect(mockKeyStore.getWrappedKey).toHaveBeenCalledWith(userId);
    const hashFunc = bcrypt.hash || (bcrypt as any).default.hash;
    expect(hashFunc).toHaveBeenCalledWith(password, 'storedSalt');
    expect(mockWorkerPool.initialize).toHaveBeenCalledWith('storedWrappedKey', 'hashed_password');
  });

  it('should throw error when initializing from local if no key found', async () => {
    mockKeyStore.getWrappedKey.mockResolvedValue(undefined);
    
    await expect(cryptoBridge.initializeFromLocal('user123', 'pass')).rejects.toThrow('No local key found');
  });

  it('should terminate and cleanup', async () => {
    const userId = 'user123';
    
    await cryptoBridge.terminate(userId);
    
    expect(mockWorkerPool.clearWorkers).toHaveBeenCalled();
    expect(mockKeyStore.deleteWrappedKey).toHaveBeenCalledWith(userId);
  });

  it('should throw if not initialized when required', async () => {
    await expect(cryptoBridge.decryptFragment('fragment')).rejects.toThrow('CryptoBridge is not initialized');
  });

  it('should allow loose mode methods if spawned even if not initialized', async () => {
    await cryptoBridge.spawn();
    
    mockWorker.generateRandomFragment.mockResolvedValue('frag');
    const result = await cryptoBridge.generateRandomFragment(12);
    
    expect(result).toBe('frag');
    expect(mockWorker.generateRandomFragment).toHaveBeenCalledWith(12, undefined);
  });

  it('should proxy methods to worker correctly after initialization', async () => {
    // Initialize first
    mockWorker.generateRandomFragment.mockResolvedValue('random_fragment');
    mockWorker.wrapPrivateKey.mockResolvedValue('wrapped_private_key');
    await cryptoBridge.initialize('id', 'key', 'pass');

    // test decryptFragment
    mockWorker.decryptFragment.mockResolvedValue('decrypted');
    const result = await cryptoBridge.decryptFragment('encrypted');
    expect(result).toBe('decrypted');
    expect(mockWorker.decryptFragment).toHaveBeenCalledWith('encrypted');

    // test encryptAndSign
    const mockOutput = { encrypted: 'data' };
    mockWorker.encryptAndSign.mockResolvedValue(mockOutput);
    const encryptResult = await cryptoBridge.encryptAndSign('data', {} as any);
    expect(encryptResult).toEqual(mockOutput);
  });
});
