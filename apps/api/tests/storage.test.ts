import { describe, it, expect } from 'vitest';
import { encryptBuffer, decryptBuffer, storage } from '../src/utils/storage.js';

describe('Storage & AES-256-GCM Encryption', () => {
  it('performs an encryption and decryption round-trip correctly', () => {
    const originalText = 'Sensitive senior medical and financial document data: Rs 50,000 Aadhaar 1234 5678 9012';
    const originalBuffer = Buffer.from(originalText, 'utf-8');

    const encrypted = encryptBuffer(originalBuffer);
    expect(encrypted.length).toBe(originalBuffer.length + 28);
    expect(encrypted.toString('utf-8')).not.toContain(originalText);

    const decrypted = decryptBuffer(encrypted);
    expect(decrypted.toString('utf-8')).toBe(originalText);
  });

  it('saves and reads encrypted file to storage provider', async () => {
    const filename = 'test_evidence.pdf';
    const content = Buffer.from('%PDF-1.4 Mock legal notice document', 'utf-8');

    const saved = await storage.save(content, filename);
    expect(saved.storageKey).toBeDefined();
    expect(saved.storageKey).toContain('.enc');

    const retrieved = await storage.read(saved.storageKey);
    expect(retrieved.toString('utf-8')).toBe(content.toString('utf-8'));

    // Clean up
    await storage.delete(saved.storageKey);
  });
});
