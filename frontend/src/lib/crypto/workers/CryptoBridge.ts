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

type CryptoBridgeInterface = Asyncify<
  Omit<CryptoWorkerInterface, "importPrivateKey" | "clearPrivateKey">
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
    armoredKey: string,
    passphrase: string
  ): Promise<void> {
    const pool = CryptoWorkerPool.getInstance();
    await pool.initialize(armoredKey, passphrase);
    this.initialized = true;
  }

  public async terminate(): Promise<void> {
    const pool = CryptoWorkerPool.getInstance();
    await pool.clearWorkers();
    this.initialized = false;
  }

  async generateRandomFragment(length?: number): Promise<string> {
    this.assertInitialized();
    return (await this.workerPool
      .getWorker()
      .generateRandomFragment(length)) as string;
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
