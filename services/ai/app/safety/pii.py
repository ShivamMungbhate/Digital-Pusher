import re
from typing import Tuple, Dict

# Regex Patterns
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
CARD_PATTERN = re.compile(r'\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b')
AADHAAR_PATTERN = re.compile(r'\b\d{4}[ -]?\d{4}[ -]?\d{4}\b')
PHONE_PATTERN = re.compile(r'(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b')
UPI_PATTERN = re.compile(r'\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b')

def mask_pii(text: str) -> Tuple[str, Dict[str, str]]:
    """
    Masks PII from input text and returns the masked text along with a mapping
    from placeholder tags to original values.
    
    Tokens used:
      [EMAIL_1], [CARD_1], [AADHAAR_1], [PHONE_1], [UPI_1]
    """
    if not text:
        return "", {}

    pii_map: Dict[str, str] = {}
    counters = {"EMAIL": 0, "CARD": 0, "AADHAAR": 0, "PHONE": 0, "UPI": 0}
    masked_text = text

    # 1. Mask Payment Cards first (to avoid conflict with 12-digit Aadhaar or 10-digit phone)
    def card_replacer(match):
        raw = match.group(0)
        digits_only = re.sub(r'\D', '', raw)
        if len(digits_only) in (15, 16):
            counters["CARD"] += 1
            tag = f"[CARD_{counters['CARD']}]"
            pii_map[tag] = raw
            return tag
        return raw

    masked_text = CARD_PATTERN.sub(card_replacer, masked_text)

    # 2. Mask Aadhaar numbers (12 digits)
    def aadhaar_replacer(match):
        raw = match.group(0)
        digits_only = re.sub(r'\D', '', raw)
        if len(digits_only) == 12:
            counters["AADHAAR"] += 1
            tag = f"[AADHAAR_{counters['AADHAAR']}]"
            pii_map[tag] = raw
            return tag
        return raw

    masked_text = AADHAAR_PATTERN.sub(aadhaar_replacer, masked_text)

    # 3. Mask Emails
    def email_replacer(match):
        raw = match.group(0)
        counters["EMAIL"] += 1
        tag = f"[EMAIL_{counters['EMAIL']}]"
        pii_map[tag] = raw
        return tag

    masked_text = EMAIL_PATTERN.sub(email_replacer, masked_text)

    # 4. Mask Phone Numbers
    def phone_replacer(match):
        raw = match.group(0)
        digits_only = re.sub(r'\D', '', raw)
        if len(digits_only) >= 10:
            counters["PHONE"] += 1
            tag = f"[PHONE_{counters['PHONE']}]"
            pii_map[tag] = raw
            return tag
        return raw

    masked_text = PHONE_PATTERN.sub(phone_replacer, masked_text)

    return masked_text, pii_map

def unmask_pii(text: str, pii_map: Dict[str, str]) -> str:
    """Restores masked tokens back to their original values if needed."""
    if not text or not pii_map:
        return text

    restored = text
    for tag, original in pii_map.items():
        restored = restored.replace(tag, original)
    return restored
