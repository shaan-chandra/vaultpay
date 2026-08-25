import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Card intake. The raw PAN lives only as a local variable in the request
 * that received it — never a column, never a log, never an error message.
 */

// TODO 1: strip everything that isn't a digit
//   "4242 4242-4242 4242"  ->  "4242424242424242"
//   Hint: raw.replace(/\D/g, '')
//   Hint: guard against undefined with (raw ?? '') or it throws on bad input
//   Why: hashing amplifies difference. If spacing survives normalization,
//   the same card produces two identities and velocity silently breaks.
export function normalizePan(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

// TODO 2: length check, then Luhn checksum
//   Hint: reject length < 12 or > 19 (Amex is 15, some cards 19 — not just 16)
//   Hint: walk RIGHT to LEFT with a `double` flag that starts false and
//         flips every iteration
//   Hint: digit = pan.charCodeAt(i) - 48
//   Hint: when doubling, if the result > 9 subtract 9
//   Hint: valid when sum % 10 === 0
//   Check your work: '4242424242424242' sums to 80 (valid)
//                    '4000000000000002' sums to 10 (valid)
//                    '1234567812345678' is not divisible by 10
//   Why: catches typos before you spend a processor call. NOT security —
//   anyone can generate Luhn-valid numbers.
export function isPlausiblePan(pan: string): boolean {
    if (pan.length < 12 || pan.length > 19) {
        return false;
    }
    let sum = 0;
    let double = false;
    for (let i = pan.length - 1; i >= 0; i--) {
        let digit = pan.charCodeAt(i) - 48
        if (digit < 0 || digit > 9) {
            return false;
        }
        if (double) {
            digit = digit * 2;
            if (digit > 9) {
                digit = digit - 9;
            }
        }
        sum += digit;
        double = !double;
    }
    return sum % 10 === 0;
}

// TODO 3: keyed hash — HMAC-SHA256, NOT createHash('sha256')
//   Hint: read process.env.CARD_FINGERPRINT_SECRET
//   Hint: throw if it's missing — do NOT fall back to an unkeyed hash
//   Hint: createHmac('sha256', secret).update(pan).digest('hex')
//   Why keyed: a card has ~9 free digits (BIN is public, check digit is
//   Luhn-determined) = ~10^9 candidates. A GPU hashes that in under a second,
//   so a plain SHA-256 column is reversible by guess-and-check. The secret
//   lives in .env, not the database, so a DB dump alone is useless.
// pan is the primary acc no
export function fingerprintPan(pan: string): string {
    const secret_key = process.env.CARD_FINGERPRINT_SECRET;
    if (!secret_key) {
        throw new Error("Card fingerprint secret not set")
    }
    return createHmac('sha256', secret_key).update(pan).digest('hex')
}

// TODO 4: last four digits, for display
//   Hint: one line
//   Why safe: it's what every receipt prints. Enough to recognise your card,
//   useless to an attacker.
export function last4(pan: string): string {
    return pan.slice(-4);
}

// TODO 5: constant-time comparison of two hex fingerprints
//   Hint: Buffer.from(a, 'hex') for both
//   Hint: timingSafeEqual THROWS on length mismatch — return false first
//   Why not ===: string equality short-circuits at the first differing
//   character, so a near-miss takes measurably longer than a wild miss.
//   Someone timing your endpoint recovers the value one char at a time.
export function fingerprintsMatch(a: string, b: string): boolean {
    // comaare bytes to prevent against timing attacks of === in js 
    const bufA = Buffer.from(a, 'hex') 
    const bufB = Buffer.from(b, 'hex')
    if (bufA.length != bufB.length) {
        return false;
    }
  return timingSafeEqual(bufA, bufB);
}