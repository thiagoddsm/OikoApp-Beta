import crypto from 'crypto';

// The ENCRYPTION_KEY must be a 32-byte (256-bit) string, preferably hex or base64 encoded
// We fall back to a hardcoded string ONLY for local dev to avoid crashing, but warn heavily
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If it's a 64-char hex or 44-char base64, we might need to process it,
    // but the easiest way is to hash any given string to ensure it's exactly 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: ENCRYPTION_KEY environment variable is missing in production!');
  }
  
  // Dev fallback
  return crypto.createHash('sha256').update('fallback_dev_key_do_not_use_in_prod').digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: "hex(iv):hex(salt):hex(authTag):hex(encryptedData)"
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // We use the salt to create a slightly modified key per encryption (optional but good practice)
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${salt.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string previously encrypted with `encrypt()`.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || !encryptedData.includes(':')) {
    // Return as is if it's not encrypted (useful for backward compatibility during backfills)
    return encryptedData;
  }
  
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) return encryptedData; // Not our format
    
    const iv = Buffer.from(parts[0], 'hex');
    const salt = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedText = parts[3];
    
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed. Wrong key or corrupted data.');
    throw new Error('Failed to decrypt data');
  }
}
