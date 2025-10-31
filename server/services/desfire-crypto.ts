import crypto from 'crypto';

/**
 * DESFire EV2/EV3 AES Cryptographic Operations
 * 
 * Implements the cryptographic primitives needed for DESFire AES mutual authentication:
 * - AES-128 encryption/decryption in CBC mode with IV=0
 * - Byte rotation (left shift)
 * - Session key derivation per NXP specification
 */

/**
 * Encrypt data using AES-128 in CBC mode with IV=0
 * @param data - Data to encrypt (Buffer)
 * @param key - AES key (16 bytes)
 * @returns Encrypted data
 */
export function aesEncrypt(data: Buffer, key: Buffer): Buffer {
  if (key.length !== 16) {
    throw new Error('AES key must be exactly 16 bytes');
  }
  
  const iv = Buffer.alloc(16, 0); // IV = all zeros
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(false); // DESFire uses no padding for 16-byte blocks
  
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

/**
 * Decrypt data using AES-128 in CBC mode with IV=0
 * @param encryptedData - Encrypted data (Buffer)
 * @param key - AES key (16 bytes)
 * @returns Decrypted data
 */
export function aesDecrypt(encryptedData: Buffer, key: Buffer): Buffer {
  if (key.length !== 16) {
    throw new Error('AES key must be exactly 16 bytes');
  }
  
  const iv = Buffer.alloc(16, 0); // IV = all zeros
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher.setAutoPadding(false); // DESFire uses no padding
  
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Rotate a buffer left by one byte
 * Example: [A, B, C, D] → [B, C, D, A]
 * @param data - Buffer to rotate
 * @returns Rotated buffer
 */
export function rotateLeft(data: Buffer): Buffer {
  if (data.length === 0) {
    return data;
  }
  
  const rotated = Buffer.alloc(data.length);
  data.copy(rotated, 0, 1); // Copy bytes [1..n] to position [0..n-1]
  rotated[data.length - 1] = data[0]; // Move first byte to end
  
  return rotated;
}

/**
 * Derive session key from RndA and RndB per NXP specification
 * Formula: SessionKey = RndA[0..3] || RndB[0..3] || RndA[12..15] || RndB[12..15]
 * 
 * @param rndA - Random number A (16 bytes)
 * @param rndB - Random number B (16 bytes)
 * @returns Session key (16 bytes)
 */
export function deriveSessionKey(rndA: Buffer, rndB: Buffer): Buffer {
  if (rndA.length !== 16 || rndB.length !== 16) {
    throw new Error('RndA and RndB must be exactly 16 bytes each');
  }
  
  const sessionKey = Buffer.alloc(16);
  
  // First 4 bytes: RndA[0..3]
  rndA.copy(sessionKey, 0, 0, 4);
  
  // Next 4 bytes: RndB[0..3]
  rndB.copy(sessionKey, 4, 0, 4);
  
  // Next 4 bytes: RndA[12..15]
  rndA.copy(sessionKey, 8, 12, 16);
  
  // Last 4 bytes: RndB[12..15]
  rndB.copy(sessionKey, 12, 12, 16);
  
  return sessionKey;
}

/**
 * Generate a cryptographically secure 16-byte random number
 * @returns Random buffer (16 bytes)
 */
export function generateRandom16(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * Convert hex string to Buffer
 * @param hex - Hex string (with or without spaces)
 * @returns Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  const cleaned = hex.replace(/\s+/g, '');
  return Buffer.from(cleaned, 'hex');
}

/**
 * Convert Buffer to hex string
 * @param buffer - Buffer to convert
 * @param withSpaces - Add spaces between bytes
 * @returns Hex string
 */
export function bufferToHex(buffer: Buffer, withSpaces: boolean = false): string {
  const hex = buffer.toString('hex').toUpperCase();
  if (withSpaces) {
    return hex.match(/.{1,2}/g)?.join(' ') || '';
  }
  return hex;
}
