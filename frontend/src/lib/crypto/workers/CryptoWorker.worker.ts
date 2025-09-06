import * as openpgp from "openpgp";
import CryptoWorkerInterface from "./CryptoWorkerInterface";
import {
  EncryptAndSignOutput,
  DecryptAndVerifyOutput,
  DecryptionOutputFormat,
  EncryptionOutputFormat,
  EncryptSessionKeyOptions,
  DecryptSessionKeyOptions,
  EncryptDataOptions,
  EncryptedDataOutput,
  DecryptedDataOutput,
  DecryptDataOptions,
} from "./crypto";
import { expose } from "comlink";
import bcrypt from "bcryptjs";

/**
 * Web Worker class that performs cryptographic operations (encryption, decryption, key management)
 * using OpenPGP.js. Intended to run in an isolated thread using Comlink.
 *
 * TODO: Extract OpenPGP-specific logic into an OpenPgpProxy to decouple implementation.
 */
export class CryptoWorker implements CryptoWorkerInterface {
  /** Holds the currently imported private key (if any) */
  private privateKey: openpgp.PrivateKey | null = null;

  /**
   * Imports and decrypts a PGP armored private key.
   *
   * @param armoredKey - The PGP armored private key as a string.
   * @param passphrase - The passphrase to unlock the private key.
   * @throws Error if the key cannot be decrypted.
   */
  async importPrivateKey(
    armoredKey: string,
    passphrase: string
  ): Promise<void> {
    this.privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey }),
      passphrase,
    });
  }

  /**
   * Clears the currently held private key from memory.
   * Use this to explicitly remove sensitive material.
   */
  clearPrivateKey(): void {
    this.privateKey = null;
  }

  /**
   * Encrypts and wraps the loaded private key using the provided passphrase.
   *
   * @param params - An object containing the passphrase to encrypt the private key.
   * @param params.passphrase - The passphrase used to encrypt the private key.
   * @returns A promise that resolves to the armored (ASCII-encoded) encrypted private key string.
   * @throws If the private key is not loaded.
   */
  async wrapPrivateKey({
    passphrase,
  }: {
    passphrase: string;
  }): Promise<string> {
    if (!this.privateKey) {
      throw new Error("wrapPrivateKey(): Private key not loaded.");
    }

    const wrappedKey = await openpgp.encryptKey({
      privateKey: this.privateKey,
      passphrase: passphrase,
    });

    return wrappedKey.armor();
  }

  async generateKeyPair(
    password: string,
    email: string
  ): Promise<{
    privateKey: string;
    publicKey: string;
    salt: string;
  }> {
    // 1. Generate salt
    const salt = await bcrypt.genSalt(12);
    // 2. Hash password with salt
    const hash = await bcrypt.hash(password, salt);
    // 3. Generate key pair using the hashed password and user ID
    const { privateKey, publicKey } = await openpgp.generateKey({
      userIDs: [{ name: email }],
      passphrase: hash,
      format: "armored",
      type: "ecc",
    });
    // 4. Return the key pair and salt
    return {
      privateKey: privateKey,
      publicKey: publicKey,
      salt: salt,
    };
  }

  /**
   * Encrypts a session key using either public keys or passphrase.
   *
   * @param sessionKey - The symmetric session key to encrypt.
   * @param options - Encryption options containing either publicKeys or a passphrase.
   * @returns A list of armored session key strings.
   * @throws Error if neither publicKeys nor passphrase is provided.
   */
  async encryptSessionKeys<T extends EncryptionOutputFormat>(
    sessionKey: openpgp.SessionKey,
    options: EncryptSessionKeyOptions<T>
  ): Promise<string[]> {
    const encryptedKeys: string[] = [];

    if ("publicKeys" in options) {
      const publicKeys = await Promise.all(
        options.publicKeys.map((k) => openpgp.readKey({ armoredKey: k }))
      );

      for (const key of publicKeys) {
        const encrypted = await openpgp.encryptSessionKey({
          data: sessionKey.data,
          algorithm: sessionKey.algorithm,
          encryptionKeys: key,
          format: "armored",
        });
        encryptedKeys.push(encrypted);
      }
    } else if ("passphrase" in options) {
      const encrypted = await openpgp.encryptSessionKey({
        data: sessionKey.data,
        algorithm: sessionKey.algorithm,
        passwords: [options.passphrase],
        format: "armored",
      });
      encryptedKeys.push(encrypted);
    } else {
      throw new Error(
        "encryptSessionKey(): Must provide publicKeys or passphrase."
      );
    }

    return encryptedKeys;
  }

  /**
   * Decrypts a session key using the provided private key or passphrase.
   *
   * @param sessionKeyArmored - The armored session key string to decrypt.
   * @param options - Options specifying how to decrypt (privateKey or passphrase).
   * @returns The decrypted session key object.
   * @throws Error if decryption fails or method is invalid.
   */
  async decryptSessionKey(
    sessionKeyArmored: string,
    options: DecryptSessionKeyOptions
  ): Promise<openpgp.SessionKey> {
    const message = await openpgp.readMessage({
      armoredMessage: sessionKeyArmored,
    });

    if (options.decryptWith === "privateKey") {
      if (!this.privateKey) {
        throw new Error("decryptSessionKey(): Private key not loaded.");
      }

      const [sessionKey] = await openpgp.decryptSessionKeys({
        message,
        decryptionKeys: [this.privateKey],
      });

      if (!sessionKey) {
        throw new Error(
          "decryptSessionKey(): Failed to decrypt session key with private key."
        );
      }

      return sessionKey as openpgp.SessionKey;
    }

    if (options.decryptWith === "passphrase") {
      const [sessionKey] = await openpgp.decryptSessionKeys({
        message,
        passwords: [options.passphrase],
      });

      if (!sessionKey) {
        throw new Error(
          "decryptSessionKey(): Failed to decrypt session key with passphrase."
        );
      }

      return sessionKey as openpgp.SessionKey;
    }

    throw new Error("decryptSessionKey(): Invalid decryption method.");
  }

  /**
   * Converts input data into an OpenPGP message.
   *
   * @param data - Input data (string or binary).
   * @returns OpenPGP message object.
   * @throws Error if input data type is invalid.
   */
  private async createMessageFromData(
    data: string | Uint8Array
  ): Promise<openpgp.Message<openpgp.MaybeStream<typeof data>>> {
    if (typeof data === "string") {
      return await openpgp.createMessage({ text: data });
    } else if (data instanceof Uint8Array) {
      return await openpgp.createMessage({ binary: data });
    } else {
      throw new Error(
        "createMessageFromData(): Invalid data type. Expected string or Uint8Array."
      );
    }
  }

  private async streamMessageFromBinary(
    data: ReadableStream<Uint8Array>
  ): Promise<openpgp.Message<ReadableStream<Uint8Array>>> {
    return await openpgp.createMessage({ binary: data });
  }

  /**
   * Parses encrypted input data into a readable OpenPGP message.
   *
   * @param data - Armored or binary encrypted message.
   * @returns Parsed OpenPGP message object.
   * @throws Error if data type is invalid.
   */
  private async readMessageFromData(
    data: string | Uint8Array
  ): Promise<openpgp.Message<openpgp.MaybeStream<typeof data>>> {
    if (typeof data === "string") {
      return await openpgp.readMessage({ armoredMessage: data });
    } else if (data instanceof Uint8Array) {
      return await openpgp.readMessage({ binaryMessage: data });
    } else {
      throw new Error(
        "readMessageFromData(): Invalid data type. Expected string or Uint8Array."
      );
    }
  }

  /**
   * Generates a random session key using the specified AES algorithm.
   *
   * @param algorithm - AES algorithm variant ('aes128' or 'aes256'). Defaults to 'aes256'.
   * @returns A new session key with random data.
   */
  async generateSessionKey(): Promise<openpgp.SessionKey> {
    return await openpgp.generateSessionKey({
      encryptionKeys: [],
    });
  }

  generateRandomFragment(
    length: number = 12,
    options: {
      prefix?: string;
      suffix?: string;
      uppercase?: boolean;
      lowercase?: boolean;
      digits?: boolean;
      specialCharacters?: boolean;
    } = {
      uppercase: true,
      lowercase: true,
      digits: true,
      specialCharacters: false,
    }
  ): string {
    const uppercaseString = options?.uppercase
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      : "";
    const lowercaseString = options?.lowercase
      ? "abcdefghijklmnopqrstuvwxyz"
      : "";
    const digitsString = options?.digits ? "0123456789" : "";
    const specialCharactersString = options?.specialCharacters ? "!@#$%&?" : "";
    const characters =
      uppercaseString +
      lowercaseString +
      digitsString +
      specialCharactersString;

    let fragment = "";

    // Create a Uint32Array to hold random values
    const randomValues = new Uint32Array(length);

    // Fill the array with cryptographically secure random numbers
    crypto.getRandomValues(randomValues);

    // Iterate through the random values to pick characters for the password
    for (let i = 0; i < length; i++) {
      // Map the random value to an index within the characters string
      const randomIndex = randomValues[i] % characters.length;
      fragment += characters.charAt(randomIndex);
    }

    return fragment;
  }

  async encryptFragment(fragment: string, public_key: string): Promise<string> {
    const message = await openpgp.createMessage({ text: fragment });
    const key = await openpgp.readKey({ armoredKey: public_key });
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys: key,
      format: "armored",
    });

    return encrypted;
  }

  async decryptFragment(encryptedFragment: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error("decryptFragment(): Private key not loaded.");
    }

    const message = await openpgp.readMessage({
      armoredMessage: encryptedFragment,
    });
    const decrypted = await openpgp.decrypt({
      message,
      decryptionKeys: this.privateKey,
    });

    return decrypted.data;
  }

  /**
   * Encrypts the provided data using a newly generated or provided session key.
   * The session key is encrypted with public keys or a passphrase.
   *
   * @param data - The data to encrypt (string or binary).
   * @param options - Encryption options (output format, keys, etc).
   * @returns An object containing encrypted data and encrypted session keys.
   * @throws Error if session key is invalid.
   */
  async encrypt<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptedDataOutput<T>> {
    const sessionKey = options.sessionKey;

    const message = await this.createMessageFromData(data);

    if (options.outputFormat === "armored") {
      const encryptedMessage = await openpgp.encrypt({
        message,
        sessionKey,
        format: "armored",
      });

      return {
        data: encryptedMessage,
      } as EncryptedDataOutput<T>;
    } else if (options.outputFormat === "binary") {
      const encryptedMessage = await openpgp.encrypt({
        message,
        sessionKey,
        format: "binary",
      });

      return {
        data: encryptedMessage,
      } as EncryptedDataOutput<T>;
    }

    throw new Error(
      `encrypt(): Unsupported output format: ${options.outputFormat}`
    );
  }

  /**
   * Decrypts the provided encrypted data using a decrypted session key.
   *
   * @param data - Encrypted message (string or binary).
   * @param options - Decryption options including session key and format.
   * @returns The decrypted data (as binary or string).
   * @throws Error if private key is missing or decryption fails.
   */
  async decrypt<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptedDataOutput<T>> {
    const sessionKey = options.sessionKey;

    const message = await this.readMessageFromData(data);

    const decryptedData = await openpgp.decrypt({
      message,
      sessionKeys: sessionKey,
      format: options.outputFormat === "string" ? "utf8" : "binary",
    });

    return decryptedData.data as DecryptedDataOutput<T>;
  }

  /**
   * Decrypts a binary stream of data.
   * @param data The binary stream to decrypt.
   * @param options Decryption options including session key and format.
   * @returns A stream of decrypted data.
   */
  async decryptBinaryAsStream<T extends DecryptionOutputFormat>(
    data: ReadableStream<Uint8Array>,
    options: DecryptDataOptions<T>
  ): Promise<ReadableStream<DecryptedDataOutput<T>>> {
    const sessionKey = options.sessionKey;

    const message = await this.streamMessageFromBinary(data);

    const decryptedStream = await openpgp.decrypt({
      message,
      sessionKeys: sessionKey,
      format: options.outputFormat === "string" ? "utf8" : "binary",
    });

    return decryptedStream.data as ReadableStream<DecryptedDataOutput<T>>;
  }

  /**
   * Decrypts a binary stream from a URL.
   * @param url The URL to fetch the encrypted data from.
   * @param options Decryption options including session key and format.
   * @returns A stream of decrypted data.
   */
  async decryptFromUrlAsStream<T extends DecryptionOutputFormat>(
    url: string,
    options: DecryptDataOptions<T>
  ): Promise<ReadableStream<DecryptedDataOutput<T>>> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch data from URL: ${url}`);
    }

    return this.decryptBinaryAsStream<T>(response.body, options);
  }

  /**
   * Placeholder for future method to encrypt and sign data.
   * Currently unimplemented.
   */
  async encryptAndSign<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptAndSignOutput<T>> {
    console.log(data, options);
    throw new Error("Method not implemented yet.");
  }

  /**
   * Placeholder for future method to decrypt and verify signatures.
   * Currently unimplemented.
   */
  async decryptAndVerify<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptAndVerifyOutput<T>> {
    console.log(data, options);
    throw new Error("Method not implemented yet.");
  }

  // TODO: Add signing and verification methods
}

expose(new CryptoWorker());
