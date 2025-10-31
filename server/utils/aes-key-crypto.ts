import crypto from 'crypto';

/**
 * AES Key Encryption/Decryption Utilities
 * 
 * Uses the MASTER_KEY environment variable to encrypt and decrypt
 * individual card AES keys before storing them in the database.
 * 
 * Format: IV (16 bytes) + Encrypted Data
 * Encryption: AES-256-CBC
 */

/**
 * Get master key from environment and hash it to 32 bytes for AES-256
 */
function getMasterKey(): Buffer {
  const masterKeyString = process.env.MASTER_KEY;
  
  if (!masterKeyString) {
    throw new Error('MASTER_KEY environment variable not set');
  }
  
  // Hash the master key to get exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(masterKeyString).digest();
}

/**
 * Encrypt an AES key before storing in database
 * 
 * @param plainKey - Plain AES key as hex string (32 chars = 16 bytes)
 * @returns Encrypted key as hex string (IV + encrypted data)
 */
export function encryptAESKey(plainKey: string): string {
  try {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(16);
    
    // Encrypt the plain hex key
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    let encrypted = cipher.update(plainKey, 'hex');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Return IV + encrypted data as hex
    const result = Buffer.concat([iv, encrypted]);
    return result.toString('hex');
  } catch (error) {
    console.error('Failed to encrypt AES key:', error);
    throw new Error('AES key encryption failed');
  }
}

/**
 * Decrypt an AES key from database
 * 
 * @param encryptedKey - Encrypted key as hex string (IV + encrypted data)
 * @returns Plain AES key as hex string (32 chars = 16 bytes)
 */
export function decryptAESKey(encryptedKey: string): string {
  try {
    const masterKey = getMasterKey();
    const encryptedBuffer = Buffer.from(encryptedKey, 'hex');
    
    // Check minimum length (16 bytes IV + at least 16 bytes data)
    if (encryptedBuffer.length < 32) {
      // This might be a legacy plain hex key (32 chars = 16 bytes)
      if (encryptedKey.length === 32 && /^[0-9A-Fa-f]+$/.test(encryptedKey)) {
        console.warn('Detected legacy plain AES key - should be encrypted!');
        return encryptedKey.toUpperCase();
      }
      throw new Error('Invalid encrypted key format');
    }
    
    // Extract IV (first 16 bytes) and encrypted data (rest)
    const iv = encryptedBuffer.subarray(0, 16);
    const encrypted = encryptedBuffer.subarray(16);
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Return as uppercase hex string
    return decrypted.toString('hex').toUpperCase();
  } catch (error) {
    console.error('Failed to decrypt AES key:', error);
    
    // Fallback for legacy plain keys (backward compatibility)
    if (encryptedKey.length === 32 && /^[0-9A-Fa-f]+$/.test(encryptedKey)) {
      console.warn('Using legacy plain AES key as fallback');
      return encryptedKey.toUpperCase();
    }
    
    throw new Error('AES key decryption failed');
  }
}

/**
 * Check if a key string is encrypted or plain
 * 
 * @param key - Key string to check
 * @returns true if encrypted, false if plain
 */
export function isEncrypted(key: string): boolean {
  // Encrypted keys are longer than 32 chars (IV + encrypted data)
  // Plain keys are exactly 32 hex chars
  if (key.length === 32 && /^[0-9A-Fa-f]+$/.test(key)) {
    return false; // Plain hex key
  }
  return true; // Likely encrypted
}
