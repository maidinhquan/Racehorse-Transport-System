/**
 * Windows-1252 to byte mapping for common UTF-8 mojibake repair
 */
const WIN1252_MAP: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/**
 * Recovers UTF-8 text that was mistakenly decoded as Windows-1252/ANSI.
 * Example: "Nguyá»...n VÄƒn A" -> "Nguyễn Văn A"
 */
export function fixMojibake(str?: string | null): string {
  if (!str) return '';
  // Normalize 3 dots representing ellipsis in mojibake
  let s = str.replace(/á»\.\.\./g, 'á»\u2026');

  // Fast check: if no typical mojibake characters exist, return as is
  if (!/[ÃÂáÄ»ƒ]/.test(s)) return s;

  try {
    const bytes: number[] = [];
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else if (WIN1252_MAP[code]) {
        bytes.push(WIN1252_MAP[code]);
      } else {
        return s;
      }
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    if (decoded && !decoded.includes('\uFFFD') && decoded.length < s.length) {
      return decoded;
    }
  } catch {
    // Return original on error
  }
  return s;
}

/**
 * Cleans user display name by fixing mojibake and stripping parenthetical annotations.
 */
export function cleanDisplayName(name?: string | null): string {
  if (!name) return '';
  const fixed = fixMojibake(name);
  return fixed.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Computes 2-letter avatar initials from a full name.
 */
export function getInitials(name?: string | null, fallback = 'VA'): string {
  const clean = cleanDisplayName(name);
  if (!clean) return fallback;
  const parts = clean.split(' ').filter(Boolean);
  if (!parts.length) return fallback;
  const inits = parts.map((p) => p[0]).join('').slice(-2).toUpperCase();
  return inits || fallback;
}
