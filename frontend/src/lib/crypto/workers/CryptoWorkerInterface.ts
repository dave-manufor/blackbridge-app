import * as openpgp from "openpgp";
import {
  EncryptAndSignOutput,
  DecryptAndVerifyOutput,
  DecryptionOutputFormat,
  EncryptionOutputFormat,
  EncryptedDataOutput,
  EncryptDataOptions,
  DecryptDataOptions,
  DecryptedDataOutput,
  EncryptSessionKeyOptions,
  DecryptSessionKeyOptions,
} from "./crypto";

// Interface
interface CryptoWorkerInterface {
  importPrivateKey(armoredKey: string, passphrase: string): Promise<void>;

  wrapPrivateKey(params: { passphrase: string }): Promise<string>;

  generateKeyPair(
    password: string,
    email: string
  ): Promise<{
    privateKey: string;
    publicKey: string;
    salt: string;
  }>;

  clearPrivateKey(): void;

  generateRandomFragment(
    length: number,
    options: {
      prefix?: string;
      suffix?: string;
      uppercase?: boolean;
      lowercase?: boolean;
      digits?: boolean;
      specialCharacters?: boolean;
    }
  ): string;

  encryptFragment(fragment: string, public_key: string): Promise<string>;

  decryptFragment(encryptedFragment: string): Promise<string>;

  generateSessionKey(): Promise<openpgp.SessionKey>;

  encryptSessionKeys<T extends EncryptionOutputFormat>(
    sessionKey: openpgp.SessionKey,
    options: EncryptSessionKeyOptions<T>
  ): Promise<string[]>;

  decryptSessionKey(
    sessionKeyArmored: string,
    options: DecryptSessionKeyOptions
  ): Promise<openpgp.SessionKey>;

  encrypt<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptedDataOutput<T>>;

  decrypt<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptedDataOutput<T>>;

  decryptBinaryAsStream<T extends DecryptionOutputFormat>(
    data: ReadableStream<Uint8Array>,
    options: DecryptDataOptions<T>
  ): Promise<ReadableStream<DecryptedDataOutput<T>>>;

  encryptAndSign<T extends EncryptionOutputFormat>(
    data: Uint8Array | string,
    options: EncryptDataOptions<T>
  ): Promise<EncryptAndSignOutput<T>>;

  decryptAndVerify<T extends DecryptionOutputFormat>(
    data: Uint8Array | string,
    options: DecryptDataOptions<T>
  ): Promise<DecryptAndVerifyOutput<T>>;

  //   TODO: Add methods for signing and verifying data
}

export default CryptoWorkerInterface;
