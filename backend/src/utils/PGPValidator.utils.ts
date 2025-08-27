/**
 * Utility functions for validating PGP data formats
 * based on ASCII-armored headers.
 *
 * These only check the structure, not cryptographic validity.
 */

export class PGPValidator {
  /**
   * Checks if string is an ASCII-armored PGP message.
   */
  static isValidPGPMessage(armored: string): boolean {
    if (!armored || typeof armored !== 'string') return false;
    const trimmed = armored.trim();
    return trimmed.startsWith('-----BEGIN PGP MESSAGE-----') && trimmed.includes('-----END PGP MESSAGE-----');
  }

  /**
   * Checks if string is an ASCII-armored PGP public key.
   */
  static isValidPGPPublicKey(armored: string): boolean {
    if (!armored || typeof armored !== 'string') return false;
    const trimmed = armored.trim();
    return trimmed.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----') && trimmed.includes('-----END PGP PUBLIC KEY BLOCK-----');
  }

  /**
   * Checks if string is an ASCII-armored PGP private key.
   */
  static isValidPGPPrivateKey(armored: string): boolean {
    if (!armored || typeof armored !== 'string') return false;
    const trimmed = armored.trim();
    return trimmed.startsWith('-----BEGIN PGP PRIVATE KEY BLOCK-----') && trimmed.includes('-----END PGP PRIVATE KEY BLOCK-----');
  }
}
