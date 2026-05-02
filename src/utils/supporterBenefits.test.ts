import { describe, expect, it } from '@jest/globals';
import { collectSupporterCreditsNames, parseCouponCodes, resolveCouponFeaturesFromHash, sanitizeSupporterCreditsName, withSupporterCredits } from './supporterBenefits';
import type { CreditsData } from '../types/story';

describe('supporterBenefits', () => {
  it('supports comma separated coupon code configuration', () => {
    expect(Array.from(parseCouponCodes(' aaa-111 , BBB-222 '))).toEqual(['AAA-111', 'BBB-222']);
  });

  it('resolves supporter coupon hashes to both story book and supporter benefits', () => {
    const features = resolveCouponFeaturesFromHash('hash-supporter', {
      storyBookHashes: ['hash-storybook'],
      supporterHashes: ['hash-supporter']
    });

    expect(features).toEqual(['storyBook', 'supporter']);
  });

  it('sanitizes supporter credit names and falls back to display name', () => {
    expect(sanitizeSupporterCreditsName('  星見の旅人  ', '')).toBe('星見の旅人');
    expect(
      collectSupporterCreditsNames([
        { displayName: 'レミエル', supporterCreditsName: '  ', supporterCouponUnlocked: true },
        { displayName: 'レミエル', supporterCreditsName: 'レミエル', supporterCouponUnlocked: true },
        { displayName: '未解放', supporterCreditsName: '未解放', supporterCouponUnlocked: false }
      ])
    ).toEqual(['レミエル']);
  });

  it('injects special thanks sections before copyright', () => {
    const baseCredits: CreditsData = {
      illustrations: [],
      sections: [
        { type: 'role', role: '制作', names: ['友人K'] },
        { type: 'text', content: '© 2026 Shiden Games' },
        { type: 'afterstory', title: 'あなた', text: 'ありがとう' }
      ]
    };

    const result = withSupporterCredits(baseCredits, ['海賊A', '海賊B']);

    expect(result.sections.map((section) => `${section.type}:${section.role || section.content || ''}`)).toEqual([
      'role:制作',
      'space:',
      'title:SPECIAL THANKS',
      'role:Special Thanks',
      'space:',
      'text:© 2026 Shiden Games',
      'afterstory:'
    ]);
    expect(result.sections[3].names).toEqual(['海賊A', '海賊B']);
  });
});
