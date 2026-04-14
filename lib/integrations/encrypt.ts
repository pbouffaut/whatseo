import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY environment variable is not set. ' +
      'Set it to a 32-byte (64 hex character) random value.'
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ` +
      `Got ${hex.length} characters.`
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @returns A colon-separated hex string: "iv:authTag:ciphertext"
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a string produced by `encrypt`.
 * @param encrypted - A colon-separated hex string: "iv:authTag:ciphertext"
 * @returns The original plaintext string
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format. Expected "iv:authTag:ciphertext".');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
