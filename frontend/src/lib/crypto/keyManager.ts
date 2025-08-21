import bcrypt from "bcryptjs";
import * as openpgp from "openpgp";

export const DEFAULT_SALT_ROUND = 12;

export const generateKeyPair = async (
  password: string,
  email: string
): Promise<{
  privateKey: string;
  publicKey: string;
  salt: string;
}> => {
  // 1. Generate salt
  const salt = await bcrypt.genSalt(DEFAULT_SALT_ROUND);
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
};

// Clear primary keys
export const clearPrimaryKeys = async (): Promise<void> => {
  console.warn("clearPrimaryKeys is not yet implemented");
  return;
};

// Decrypt private key
export const decryptPrivateKey = async (
  privateKeyArmored: string,
  passphrase: string
): Promise<openpgp.PrivateKey> => {
  let decryptedKey: openpgp.PrivateKey | null = null;
  try {
    const privateKey = await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored,
    });
    decryptedKey = await openpgp.decryptKey({
      privateKey,
      passphrase,
    });
    return decryptedKey;
  } catch (error) {
    throw new Error(`Failed to decrypt private key: ${error}`);
  } finally {
    decryptedKey = null;
  }
};
// Generate session key
export const generateSessionKey = async (): Promise<Uint8Array> => {
  const sessionKey = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
  return sessionKey;
};
// Encrypt session key
type EncryptWithPublicKeys = {
  publicKeys: string[];
};

type EncryptWithPassphrase = {
  passphrase: string;
};

type EncryptOptions = EncryptWithPublicKeys | EncryptWithPassphrase;

export function encryptSessionKey(
  sessionKey: openpgp.SessionKey,
  options: EncryptWithPublicKeys
): Promise<string>;

export function encryptSessionKey(
  sessionKey: openpgp.SessionKey,
  options: EncryptWithPassphrase
): Promise<string>;

// Unified implementation
export async function encryptSessionKey(
  sessionKey: openpgp.SessionKey,
  options: EncryptOptions
): Promise<string> {
  if ("publicKeys" in options) {
    const publicKeys = await Promise.all(
      options.publicKeys.map((key) => openpgp.readKey({ armoredKey: key }))
    );

    return await openpgp.encryptSessionKey({
      data: sessionKey.data,
      algorithm: sessionKey.algorithm,
      encryptionKeys: publicKeys,
    });
  } else {
    return await openpgp.encryptSessionKey({
      data: sessionKey.data,
      algorithm: sessionKey.algorithm,
      passwords: options.passphrase,
    });
  }
}

// Decrypt session key
type DecryptWithPrivateKey = {
  privateKey: string;
};

type DecryptWithPassphrase = {
  passphrase: string;
};

type DecryptOptions = DecryptWithPrivateKey | DecryptWithPassphrase;

export function decryptSessionKey(
  encryptedSessionKey: string,
  options: DecryptWithPrivateKey
): Promise<openpgp.SessionKey>;

export function decryptSessionKey(
  encryptedSessionKey: string,
  options: DecryptWithPassphrase
): Promise<openpgp.SessionKey>;

// Unified implementation
export async function decryptSessionKey(
  encryptedSessionKey: string,
  options: DecryptOptions
): Promise<openpgp.SessionKey> {
  const message = await openpgp.createMessage({
    text: encryptedSessionKey,
  });

  if ("privateKey" in options) {
    const privateKey = await openpgp.readPrivateKey({
      armoredKey: options.privateKey,
    });

    const sessionKeys = await openpgp.decryptSessionKeys({
      message: message,
      decryptionKeys: privateKey,
    });
    return {
      data: sessionKeys[0].data,
      algorithm: sessionKeys[0].algorithm,
    } as openpgp.SessionKey;
  } else {
    const sessionKeys = await openpgp.decryptSessionKeys({
      message: message,
      passwords: options.passphrase,
    });
    return {
      data: sessionKeys[0].data,
      algorithm: sessionKeys[0].algorithm,
    } as openpgp.SessionKey;
  }
}
