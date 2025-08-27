import { Remote, wrap } from "comlink";
import { CryptoWorker } from "./CryptoWorker.worker";
import { devOnly } from "@/utils/dev";

// Determine optimal pool size based on the user's CPU capabilities,
// defaulting to 4 if navigator.hardwareConcurrency is unavailable.
const poolSize =
  typeof navigator !== "undefined" &&
  typeof navigator.hardwareConcurrency === "number"
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 4;

/**
 * Singleton class that manages a pool of Web Workers for cryptographic operations.
 * It initializes a set of workers using Comlink, distributes tasks using a round-robin algorithm,
 * and handles resource cleanup.
 */
export class CryptoWorkerPool {
  /** Singleton instance of the CryptoWorkerPool */
  private static instance: CryptoWorkerPool;

  /** Raw Worker instances to allow manual termination */
  private bareWorkers: Worker[] = [];

  /** Comlink-wrapped workers to enable RPC-like communication */
  private workers: Remote<CryptoWorker>[] = [];

  /** Maximum number of worker instances in the pool */
  private maxWorkers = poolSize;

  /** Index of the next worker to receive a task (round-robin) */
  private currentWorkerIndex: number = 0;

  /** Indicates whether the worker pool has been initialized with private key*/
  public initialized: boolean = false;

  public spawned: boolean = false;

  /**
   * Returns the singleton instance of the CryptoWorkerPool.
   * If it doesn't exist yet, it will be created.
   *
   * @returns {CryptoWorkerPool} Singleton instance of the worker pool
   */
  public static getInstance(): CryptoWorkerPool {
    if (!CryptoWorkerPool.instance) {
      const workerPoolInstance = new CryptoWorkerPool();
      CryptoWorkerPool.instance = workerPoolInstance;
    }
    return CryptoWorkerPool.instance;
  }

  /**
   * Spawns a set of Web Workers for cryptographic operations not requiring private key access.
   * This method is idempotent and can be called multiple times without adverse effects.
   *
   * @returns {Promise<void>}
   */
  public async spawn() {
    if (this.spawned) return;

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(
        new URL("./CryptoWorker.worker.ts", import.meta.url),
        { type: "module" }
      );

      const cryptoWorker = wrap<CryptoWorker>(worker);

      this.bareWorkers.push(worker);
      this.workers.push(cryptoWorker);
    }

    devOnly(() => console.log("Workers spawned:", this.workers.length));

    this.spawned = true;
    this.currentWorkerIndex = 0;
  }

  /**
   * Initializes all workers in the pool by importing the provided PGP private key.
   *
   * @param {string} armoredKey - The PGP armored private key to import
   * @param {string} passphrase - The passphrase used to decrypt the private key
   * @returns {Promise<void>} Resolves once all workers are initialized
   */
  public async initialize(
    armoredKey: string,
    passphrase: string
  ): Promise<void> {
    await this.spawn();

    await Promise.all(
      this.workers.map((worker) =>
        worker.importPrivateKey(armoredKey, passphrase)
      )
    );

    this.initialized = true;
  }

  /**
   * Returns a worker from the pool using round-robin scheduling.
   * Throws an error if the pool is not yet initialized.
   *
   * @throws {Error} If called before `initialize()`
   * @returns {Remote<CryptoWorker>} A Comlink-wrapped CryptoWorker instance
   */
  public getWorker(): Remote<CryptoWorker> {
    if (!this.spawned) {
      throw new Error("CryptoWorkerPool is not spawned. Call spawn() first.");
    }

    // Select the next worker in round-robin fashion
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.maxWorkers;
    return worker;
  }

  /**
   * Clears the worker pool by:
   * - Removing the imported keys from each worker.
   * - Terminating all Web Worker threads.
   * - Resetting internal state.
   *
   * @returns {Promise<void>} Resolves when cleanup is complete
   */
  public async clearWorkers(): Promise<void> {
    // Clear private key material from each worker
    for (const worker of this.workers) {
      await worker.clearPrivateKey();
    }

    // Terminate the actual Web Worker threads
    for (const bareWorker of this.bareWorkers) {
      bareWorker.terminate();
    }

    // Reset state
    this.workers = [];
    this.bareWorkers = [];
    this.currentWorkerIndex = 0;
    this.spawned = false;
    this.initialized = false;
  }
}
