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

const DEFAULT_SUPPORTER_ROLE = 'Special Thanks';
const SPECIAL_THANKS_TITLE = 'SPECIAL THANKS';

export const normalizeCouponCode = (value: string): string => value.trim().toUpperCase();

export const parseCouponCodes = (value: string | undefined, fallback: string[] = []): Set<string> => {
  const source = typeof value === 'string' && value.trim() !== '' ? value.split(',') : fallback;
  return new Set(
    source
      .map((code) => normalizeCouponCode(code))
      .filter((code) => code.length > 0)
  );
};

export const hashCouponCode = async (code: string): Promise<string> => {
  const normalized = normalizeCouponCode(code);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
  const trimmed = value.trim().slice(0, 24);
  return trimmed || fallback.trim().slice(0, 24);
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
