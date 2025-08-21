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

  clearPrivateKey(): void;

  generateRandomFragment(length: number): string;

  encryptFragment(fragment: string, public_key: string): Promise<string>;

  decryptFragment(encryptedFragment: string): Promise<string>;

  generateSessionKey(algorithm: "aes128" | "aes256"): openpgp.SessionKey;

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
