from app.safety.pii import mask_pii, unmask_pii

def test_mask_phone_number():
    text = "Call officer Sharma at +91 9876543210 or 9123456789 immediately."
    masked, pii_map = mask_pii(text)
    assert "[PHONE_1]" in masked
    assert "+91 9876543210" not in masked
    assert "9876543210" in pii_map["[PHONE_1]"] or "+91 9876543210" in pii_map["[PHONE_1]"]

def test_mask_aadhaar():
    text = "Your Aadhaar number 2345 6789 0123 has been suspended."
    masked, pii_map = mask_pii(text)
    assert "[AADHAAR_1]" in masked
    assert "2345 6789 0123" not in masked
    assert pii_map["[AADHAAR_1]"] == "2345 6789 0123"

def test_mask_credit_card():
    text = "Verify transaction on card 4111 2222 3333 4444."
    masked, pii_map = mask_pii(text)
    assert "[CARD_1]" in masked
    assert "4111 2222 3333 4444" not in masked

def test_mask_email():
    text = "Send confirmation to victim.help@example.com right now."
    masked, pii_map = mask_pii(text)
    assert "[EMAIL_1]" in masked
    assert "victim.help@example.com" not in masked
    assert pii_map["[EMAIL_1]"] == "victim.help@example.com"

def test_unmask_pii():
    text = "Contact [EMAIL_1] and [PHONE_1]."
    pii_map = {"[EMAIL_1]": "test@demo.org", "[PHONE_1]": "9876543210"}
    restored = unmask_pii(text, pii_map)
    assert restored == "Contact test@demo.org and 9876543210."
