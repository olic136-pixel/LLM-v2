import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment or generate a warning
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn('WARNING: ENCRYPTION_KEY not set in environment. Using insecure fallback.');
    return Buffer.from('fallback-key-please-set-env-var', 'utf-8');
  }

  // Derive a proper key from the environment variable
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
};

export const encryptApiKey = (apiKey: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getEncryptionKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  } catch (error: any) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
};

export const decryptApiKey = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
};
