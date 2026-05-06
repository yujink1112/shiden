import { CreditsData, CreditSection } from '../types/story';

type SupporterProfileLike = {
  displayName?: string;
  supporterCreditsName?: string;
  supporterCouponUnlocked?: boolean;
  storyBookCouponUnlocked?: boolean;
};

export type CouponFeature = 'storyBook' | 'supporter';

type CouponResolutionOptions = {
  storyBookHashes: Iterable<string>;
  supporterHashes: Iterable<string>;
};

const DEFAULT_SUPPORTER_ROLE = '';
const SPECIAL_THANKS_TITLE = 'Special Thanks';
const SHA256_K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
] as const;
const SHA256_INITIAL_HASH: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
] as const;

export const normalizeCouponCode = (value: string): string => value.trim().toUpperCase();

const encodeUtf8 = (value: string): Uint8Array => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }

  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    bytes[i] = encoded.charCodeAt(i);
  }
  return bytes;
};

export const parseCouponCodes = (value: string | undefined, fallback: string[] = []): Set<string> => {
  const source = typeof value === 'string' && value.trim() !== '' ? value.split(',') : fallback;
  return new Set(
    source
      .map((code) => normalizeCouponCode(code))
      .filter((code) => code.length > 0)
  );
};

const rightRotate = (value: number, amount: number): number => (value >>> amount) | (value << (32 - amount));

const sha256FallbackHex = (bytes: Uint8Array): string => {
  const messageLength = bytes.length;
  const bitLength = messageLength * 8;
  const paddedLength = (((messageLength + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[messageLength] = 0x80;

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  padded[paddedLength - 8] = (highBits >>> 24) & 0xff;
  padded[paddedLength - 7] = (highBits >>> 16) & 0xff;
  padded[paddedLength - 6] = (highBits >>> 8) & 0xff;
  padded[paddedLength - 5] = highBits & 0xff;
  padded[paddedLength - 4] = (lowBits >>> 24) & 0xff;
  padded[paddedLength - 3] = (lowBits >>> 16) & 0xff;
  padded[paddedLength - 2] = (lowBits >>> 8) & 0xff;
  padded[paddedLength - 1] = lowBits & 0xff;

  const hash = [...SHA256_INITIAL_HASH];
  const schedule = new Array<number>(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const base = offset + i * 4;
      schedule[i] = (
        (padded[base] << 24)
        | (padded[base + 1] << 16)
        | (padded[base + 2] << 8)
        | padded[base + 3]
      ) >>> 0;
    }

    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(schedule[i - 15], 7) ^ rightRotate(schedule[i - 15], 18) ^ (schedule[i - 15] >>> 3);
      const s1 = rightRotate(schedule[i - 2], 17) ^ rightRotate(schedule[i - 2], 19) ^ (schedule[i - 2] >>> 10);
      schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + schedule[i]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
};

export const hashCouponCode = async (code: string): Promise<string> => {
  const normalized = normalizeCouponCode(code);
  const bytes = encodeUtf8(normalized);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256FallbackHex(bytes);
};

export const resolveCouponFeaturesFromHash = (
  couponHash: string,
  options: CouponResolutionOptions
): CouponFeature[] => {
  if (!couponHash) return [];
  if (options.supporterHashes && new Set(options.supporterHashes).has(couponHash)) {
    return ['storyBook', 'supporter'];
  }
  if (options.storyBookHashes && new Set(options.storyBookHashes).has(couponHash)) {
    return ['storyBook'];
  }
  return [];
};

export const hasStoryBookAccess = (profile?: SupporterProfileLike | null, isAdmin = false): boolean =>
  Boolean(isAdmin || profile?.supporterCouponUnlocked || profile?.storyBookCouponUnlocked);

export const hasSupporterAccess = (profile?: SupporterProfileLike | null, isAdmin = false): boolean =>
  Boolean(isAdmin || profile?.supporterCouponUnlocked);

export const sanitizeSupporterCreditsName = (value: string, fallback = ''): string => {
  const trimmed = value.trim().slice(0, 10);
  return trimmed || fallback.trim().slice(0, 10);
};

export const getSupporterCreditsName = (profile?: SupporterProfileLike | null): string => {
  if (!profile) return '';
  return sanitizeSupporterCreditsName(profile.supporterCreditsName || '', profile.displayName || '');
};

export const collectSupporterCreditsNames = (profiles: SupporterProfileLike[]): string[] => {
  const names = profiles
    .filter((profile) => profile?.supporterCouponUnlocked)
    .map((profile) => getSupporterCreditsName(profile))
    .filter((name) => name.length > 0);
  return Array.from(new Set(names));
};

const findInsertionIndex = (sections: CreditSection[]): number => {
  const copyrightIndex = sections.findIndex(
    (section) => section.type === 'text' && typeof section.content === 'string' && section.content.includes('©')
  );
  if (copyrightIndex >= 0) return copyrightIndex;

  const firstAfterstoryIndex = sections.findIndex((section) => section.type === 'afterstory');
  return firstAfterstoryIndex >= 0 ? firstAfterstoryIndex : sections.length;
};

export const withSupporterCredits = (
  creditsData: CreditsData,
  supporterNames: string[]
): CreditsData => {
  const uniqueNames = Array.from(
    new Set(supporterNames.map((name) => sanitizeSupporterCreditsName(name)).filter((name) => name.length > 0))
  );

  const sectionsWithoutSupporter = creditsData.sections.filter((section) => {
    return !(section.type === 'role' && section.role === DEFAULT_SUPPORTER_ROLE)
      && !(section.type === 'title' && section.content === SPECIAL_THANKS_TITLE);
  });

  if (uniqueNames.length === 0) {
    return {
      ...creditsData,
      sections: sectionsWithoutSupporter
    };
  }

  const insertAt = findInsertionIndex(sectionsWithoutSupporter);
  const supporterSections: CreditSection[] = [
    { type: 'space', height: 120 },
    { type: 'title', content: SPECIAL_THANKS_TITLE },
    { type: 'role', role: DEFAULT_SUPPORTER_ROLE, names: uniqueNames },
    { type: 'space', height: 120 }
  ];

  return {
    ...creditsData,
    sections: [
      ...sectionsWithoutSupporter.slice(0, insertAt),
      ...supporterSections,
      ...sectionsWithoutSupporter.slice(insertAt)
    ]
  };
};
