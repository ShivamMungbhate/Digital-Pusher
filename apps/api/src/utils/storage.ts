import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface StorageProvider {
  save(buffer: Buffer, originalFilename: string): Promise<{ storageKey: string; sizeBytes: number }>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

// Derive a 32-byte key from STORAGE_ENCRYPTION_KEY
function getEncryptionKey(): Buffer {
  const rawKey = env.STORAGE_ENCRYPTION_KEY || 'default_fallback_32_bytes_key_demo!';
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * Output format: [IV 12 bytes] + [AuthTag 16 bytes] + [Ciphertext]
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts a buffer encrypted with AES-256-GCM.
 */
export function decryptBuffer(buffer: Buffer): Buffer {
  if (buffer.length < 28) {
    throw new Error('Encrypted payload too short to contain IV and AuthTag');
  }

  const key = getEncryptionKey();
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export class LocalEncryptedStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(env.STORAGE_PATH);
    this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err: any) {
      logger.error({ err }, 'Failed to create storage directory');
    }
  }

  async save(buffer: Buffer, originalFilename: string): Promise<{ storageKey: string; sizeBytes: number }> {
    await this.ensureDir();
    const ext = path.extname(originalFilename);
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${uniqueId}${ext}.enc`;
    const targetPath = path.join(this.baseDir, storageKey);

    const encryptedData = encryptBuffer(buffer);
    await fs.writeFile(targetPath, encryptedData);

    return {
      storageKey,
      sizeBytes: buffer.length
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    const targetPath = path.join(this.baseDir, storageKey);
    const encryptedData = await fs.readFile(targetPath);
    return decryptBuffer(encryptedData);
  }

  async delete(storageKey: string): Promise<void> {
    try {
      const targetPath = path.join(this.baseDir, storageKey);
      await fs.unlink(targetPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        logger.warn({ err, storageKey }, 'Error deleting file from storage');
      }
    }
  }
}

export const storage = new LocalEncryptedStorageProvider();
