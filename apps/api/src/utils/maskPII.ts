/**
 * PII Masking Utility for Digital Pusher.
 * Masks sensitive user identifiers (phone numbers, Aadhaar numbers, credit card numbers, emails)
 * before submission to storage or external AI services.
 * Maintained in a single isolated module for simple replacement or model-specific tuning.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g;
const AADHAAR_REGEX = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;
const PHONE_REGEX = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;

export interface MaskResult {
  maskedText: string;
  piiMap: Record<string, string>;
}

export function maskPII(text: string): MaskResult {
  if (!text) {
    return { maskedText: '', piiMap: {} };
  }

  const piiMap: Record<string, string> = {};
  let cardCount = 0;
  let aadhaarCount = 0;
  let emailCount = 0;
  let phoneCount = 0;

  // 1. Mask credit/debit cards
  let result = text.replace(CARD_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length === 15 || digitsOnly.length === 16) {
      cardCount++;
      const tag = `[CARD_${cardCount}]`;
      piiMap[tag] = match;
      return tag;
    }
    return match;
  });

  // 2. Mask Aadhaar numbers (12 digits)
  result = result.replace(AADHAAR_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length === 12) {
      aadhaarCount++;
      const tag = `[AADHAAR_${aadhaarCount}]`;
      piiMap[tag] = match;
      return tag;
    }
    return match;
  });

  // 3. Mask Emails
  result = result.replace(EMAIL_REGEX, (match) => {
    emailCount++;
    const tag = `[EMAIL_${emailCount}]`;
    piiMap[tag] = match;
    return tag;
  });

  // 4. Mask Phone numbers
  result = result.replace(PHONE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      phoneCount++;
      const tag = `[PHONE_${phoneCount}]`;
      piiMap[tag] = match;
      return tag;
    }
    return match;
  });

  return { maskedText: result, piiMap };
}

export function unmaskPII(text: string, piiMap: Record<string, string>): string {
  if (!text || !piiMap) return text;
  let restored = text;
  for (const [tag, original] of Object.entries(piiMap)) {
    restored = restored.split(tag).join(original);
  }
  return restored;
}
