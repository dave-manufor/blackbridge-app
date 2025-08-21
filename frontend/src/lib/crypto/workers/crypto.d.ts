import { SessionKey } from "openpgp";

export type EncryptionOutputFormat = "binary" | "armored";
export type DecryptionOutputFormat = "string" | "binary";
export type EncryptionInputFormat = "binary" | "armored";
export type DecryptionInputFormat = "binary" | "armored";

export type EncryptDataOptions<T extends EncryptionOutputFormat> = {
  outputFormat: T;
  sessionKey: openpgp.SessionKey;
};
// Encryption Mode Options
export type EncryptWithPublicKeys = {
  publicKeys: string[];
};

export type EncryptWithPassphrase = {
  passphrase: string;
};
export type EncryptSessionKeyOptions<T extends EncryptionOutputFormat> = (
  | EncryptWithPublicKeys
  | EncryptWithPassphrase
) & {
  outputFormat: T;
};

export type EncryptedDataOutput<T extends EncryptionOutputFormat> = {
  data: T extends "binary" ? Uint8Array : string;
};

export type EncryptAndSignOutput<T extends EncryptionOutputFormat> =
  EncryptedDataOutput<T> & {
    signature?: string;
  };

export type DecryptDataOptions<T extends DecryptionOutputFormat> = {
  sessionKey: SessionKey;
  outputFormat: T;
};

export type DecryptedDataOutput<T extends DecryptionOutputFormat> =
  T extends "binary" ? Uint8Array : string;

// Decryption Mode Options
export type DecryptWithPrivateKey = {
  decryptWith: "privateKey";
};

export type DecryptWithPassphrase = {
  decryptWith: "passphrase";
  passphrase: string;
};
export type DecryptSessionKeyOptions =
  | DecryptWithPrivateKey
  | DecryptWithPassphrase;

export type DecryptAndVerifyOutput<T extends DecryptionOutputFormat> = {
  data: DecryptedDataOutput<T>;
  verified?: boolean;
};
