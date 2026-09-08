/**
 * Passport ID — the human-readable identifier printed on a Creative
 * Passport, its QR pass and the public directory.
 *
 * One implementation, one prefix. The two surfaces that render this used to
 * each carry their own copy of the same expression with the legacy `THR-`
 * prefix; the brand is Kretopia, so the prefix is `KRT-`.
 *
 * Format: KRT-ABCDE — the first five hex characters of the user's id,
 * uppercased. Derived, never stored, so it is stable for a given account
 * without needing its own column.
 */
export const PASSPORT_ID_PREFIX = "KRT";

export function passportId(userId?: string | null): string {
  if (!userId) return `${PASSPORT_ID_PREFIX}-—`;
  return `${PASSPORT_ID_PREFIX}-${userId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

export default passportId;
