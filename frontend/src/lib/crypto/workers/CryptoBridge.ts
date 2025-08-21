import * as openpgp from "openpgp";
import {
  EncryptionOutputFormat,
  DecryptionOutputFormat,
  EncryptAndSignOutput,
  DecryptAndVerifyOutput,
  EncryptSessionKeyOptions,
  DecryptSessionKeyOptions,
  EncryptDataOptions,
  EncryptedDataOutput,
  DecryptedDataOutput,
  DecryptDataOptions,
} from "./crypto";
import CryptoWorkerInterface from "./CryptoWorkerInterface";
import { CryptoWorkerPool } from "./CryptoWorkerPool";
import { Asyncify } from "@/utils/typescript";
import bcrypt from "bcryptjs";
import { KeyStore } from "../KeyStore";

type CryptoBridgeInterface = Asyncify<
  Omit<
    CryptoWorkerInterface,
    "importPrivateKey" | "clearPrivateKey" | "wrapPrivateKey"
  >
>;

/**
 * This class serves as a bridge to the CryptoWorkerPool, allowing
 * for RPC-like communication with the worker pool.
 */
export class CryptoBridge implements CryptoBridgeInterface {
  private static instance: CryptoBridge;
  private workerPool: CryptoWorkerPool = CryptoWorkerPool.getInstance();
  private initialized: boolean = false;

  private assertInitialized() {
    if (!this.initialized) {
      throw new Error("CryptoBridge is not initialized");
    }
  }

  public static getInstance(): CryptoBridge {
    if (!CryptoBridge.instance) {
      CryptoBridge.instance = new CryptoBridge();
    }
    return CryptoBridge.instance;
  }

  public async initialize(
    userId: string,
    armoredKey: string,
    passphrase: string
  ): Promise<string> {
    if (this.initialized) {
      await this.workerPool.clearWorkers();
    }

    // Initialize Pool
    await this.workerPool.initialize(armoredKey, passphrase);

    // Wrap and store key
    const fragment = await this.workerPool
      .getWorker()
      .generateRandomFragment(32, {
        uppercase: true,
        lowercase: true,
        digits: true,
        specialCharacters: true,
      });

    const salt = await bcrypt.genSalt(10);
    const hashedFragment = await bcrypt.hash(fragment, salt);

    const wrappedKey = await this.workerPool.getWorker().wrapPrivateKey({
      passphrase: hashedFragment,
    });

    await KeyStore.getInstance().putWrappedKey({
      user_id: userId,
      wrappedKey,
      salt,
    });

    // Mark as initialized
    this.initialized = true;

    return fragment;
  }

  public async initializeFromLocal(
    userId: string,
    password: string
  ): Promise<void> {
    if (this.initialized) {
      await this.workerPool.clearWorkers();
    }

    // Get user wrapped key from KeyStore
    const data = await KeyStore.getInstance().getWrappedKey(userId);
    // If no wrapped key, throw error
    if (!data) {
      throw new Error("No local key found");
    }

    // Hash password with wrappedKey salt
    const hashedPassword = await bcrypt.hash(password, data.salt);

    // Reinitialize pool with wrapped key and hashed password
    await this.workerPool.initialize(data.wrappedKey, hashedPassword);

    // Mark as initialized
    this.initialized = true;
  }

  public async terminate(userId: string): Promise<void> {
    // Terminate the worker pool
    await this.workerPool.clearWorkers();
    // Delete local key
    await KeyStore.getInstance().deleteWrappedKey(userId);
    // Marked as initialized
    this.initialized = false;
  }

  async generateRandomFragment(
    length: number = 12,
    options?: {
      prefix?: string;
      suffix?: string;
      uppercase?: boolean;
      lowercase?: boolean;
      digits?: boolean;
      specialCharacters?: boolean;
    }
  ): Promise<string> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .generateRandomFragment(length, options)) as string;
  }

  async encryptFragment(fragment: string, public_key: string): Promise<string> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .encryptFragment(fragment, public_key)) as string;
  }

  async decryptFragment(encryptedFragment: string): Promise<string> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .decryptFragment(encryptedFragment)) as string;
  }

  async generateSessionKey(
    algorithm: "aes128" | "aes256" = "aes256"
  ): Promise<openpgp.SessionKey> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .generateSessionKey(algorithm)) as openpgp.SessionKey;
  }

  async encryptSessionKeys<T extends EncryptionOutputFormat>(
    sessionKey: openpgp.SessionKey,
    options: EncryptSessionKeyOptions<T>
  ): Promise<string[]> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .encryptSessionKeys(sessionKey, options)) as string[];
  }

  async decryptSessionKey(
    sessionKeyArmored: string,
    options: DecryptSessionKeyOptions
  ): Promise<openpgp.SessionKey> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .decryptSessionKey(sessionKeyArmored, options)) as openpgp.SessionKey;
  }

  async generateKeyPair(
    password: string,
    email: string
  ): Promise<{
    privateKey: string;
    publicKey: string;
    salt: string;
  }> {
    return (await this.workerPool
      .getWorker()
      .generateKeyPair(password, email)) as {
      privateKey: string;
      publicKey: string;
      salt: string;
    };
  }

  async encrypt<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptedDataOutput<T>> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .encrypt(data, options)) as EncryptedDataOutput<T>;
  }

  async decrypt<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptedDataOutput<T>> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .decrypt(data, options)) as DecryptedDataOutput<T>;
  }

  async encryptAndSign<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptAndSignOutput<T>> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .encryptAndSign(data, options)) as EncryptAndSignOutput<T>;
  }

  async decryptAndVerify<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptAndVerifyOutput<T>> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .decryptAndVerify(data, options)) as DecryptAndVerifyOutput<T>;
  }

  // Additional methods to interact with the CryptoWorkerPool can be added here
}
