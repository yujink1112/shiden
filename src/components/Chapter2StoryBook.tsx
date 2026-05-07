import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseStoryText, StoryAssets } from '../types/storyParser';
import { CreditsData, CreditSection, StoryEntry } from '../types/story';
import { withSupporterCredits } from '../utils/supporterBenefits';
import './Chapter2StoryBook.css';

type Chapter2StoryBookProps = {
  onClose?: () => void;
  supporterNames?: string[];
};

type Chapter2FlowStep = {
  type: 'story' | 'battle' | 'reward' | 'title' | 'credits';
  id?: string;
};

type Chapter2StageFlow = {
  stageNo: number;
  flow: Chapter2FlowStep[];
};

type StageRecord = {
  chapter?: number;
  stage?: number;
  battle?: number;
  name?: string;
};

type TextBlockKind = 'sectionTitle' | 'partTitle' | 'dialogue' | 'direction' | 'monologue' | 'creditRole' | 'creditTitle' | 'creditAfterstory' | 'creditText' | 'creditSpace' | 'creditTightSpace' | 'theEnd' | 'tocItem';

type TextBlock = {
  key: string;
  kind: TextBlockKind;
  text: string;
  meta?: string;
  name?: string;
  align?: 'left' | 'center';
  names?: string[];
  spaceHeight?: number;
  pageNumber?: number;
  forcePageBreakBefore?: boolean;
};

type BackgroundOption = {
  label: string;
  value: string;
};

type StoryPart = {
  id: string;
  label?: string;
  blocks: TextBlock[];
};

type StorySection = {
  sectionNo: number;
  displayLabel: string;
  title: string;
  backgroundOptions: BackgroundOption[];
  defaultBackground: string;
  blocks: TextBlock[];
  parts: StoryPart[];
};

type PageLayout = {
  sectionNo: number;
  sectionLabel: string;
  sectionTitle: string;
  continuation: boolean;
  blocks: TextBlock[];
};

type RubySegment = {
  text: string;
  ruby?: string;
};

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_PADDING_PX = 56;
const PAGE_HEADER_HEIGHT_PX = 92;
const PAGE_FOOTER_HEIGHT_PX = 44;
const PAGE_LAYOUT_SAFETY_PX = 132;
const PAGE_BODY_HEIGHT_PX = A4_HEIGHT_PX - PAGE_PADDING_PX * 2 - PAGE_HEADER_HEIGHT_PX - PAGE_FOOTER_HEIGHT_PX - PAGE_LAYOUT_SAFETY_PX;
const PAGE_BODY_MEASURE_SAFETY_PX = 42;

const toPublicUrl = (path: string): string => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const publicUrl = process.env.PUBLIC_URL || '';
  if (path.startsWith('/')) {
    return `${publicUrl}${path}`;
  }
  return `${publicUrl}/${path}`;
};

const getBackgroundOptionLabel = (
  value: string,
  urlToBackgroundName: Map<string, string>
): string => {
  if (!value) return 'なし';
  return urlToBackgroundName.get(value) || value.split('/').pop() || value;
};

const parseRubyText = (text: string): RubySegment[] => {
  const segments: RubySegment[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === '\\' && index + 1 < text.length) {
      const nextChar = text[index + 1];
      if (nextChar === '《' || nextChar === '》' || nextChar === '｜' || nextChar === '|') {
        if (segments.length > 0 && !segments[segments.length - 1].ruby) {
          segments[segments.length - 1].text += nextChar;
        } else {
          segments.push({ text: nextChar });
        }
        index += 2;
        continue;
      }
    }

    if (char === '|' || char === '｜') {
      const rubyStart = text.indexOf('《', index);
      const rubyEnd = text.indexOf('》', rubyStart);
      if (rubyStart !== -1 && rubyEnd !== -1) {
        segments.push({
          text: text.substring(index + 1, rubyStart),
          ruby: text.substring(rubyStart + 1, rubyEnd)
        });
        index = rubyEnd + 1;
        continue;
      }
    } else if (char === '《') {
      const rubyEnd = text.indexOf('》', index);
      if (segments.length > 0 && rubyEnd !== -1) {
        const lastSegment = segments.pop()!;
        const ruby = text.substring(index + 1, rubyEnd);
        const lastChar = lastSegment.text.slice(-1);
        const isRubyTarget = /[々〇\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFFA-Za-z\u30A1-\u30FC]/.test(lastChar);

        if (lastSegment.ruby || !isRubyTarget) {
          segments.push(lastSegment);
        } else {
          if (lastSegment.text.length > 1) {
            segments.push({ text: lastSegment.text.slice(0, -1) });
            segments.push({ text: lastSegment.text.slice(-1), ruby });
          } else {
            segments.push({ text: lastSegment.text, ruby });
          }
          index = rubyEnd + 1;
          continue;
        }
      }
    }

    if (segments.length > 0 && !segments[segments.length - 1].ruby) {
      segments[segments.length - 1].text += char;
    } else {
      segments.push({ text: char });
    }
    index += 1;
  }

  return segments;
};

const renderRubyText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const segments = parseRubyText(line);
    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {segments.map((segment, segmentIndex) => (
          segment.ruby ? (
            <ruby key={`seg-${lineIndex}-${segmentIndex}`}>
              {segment.text}
              <rt>{segment.ruby}</rt>
            </ruby>
          ) : (
            <React.Fragment key={`seg-${lineIndex}-${segmentIndex}`}>
              {segment.text}
            </React.Fragment>
          )
        ))}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

const blockFromEntry = (entry: StoryEntry, key: string): TextBlock | null => {
  if (!entry.text) return null;

  if (entry.type === 'dialogue') {
    return {
      key,
      kind: 'dialogue',
      name: entry.textAlign === 'center' ? undefined : entry.name,
      text: entry.text,
      align: entry.textAlign === 'center' ? 'center' : 'left'
    };
  }

  if (entry.type === 'direction') {
    return {
      key,
      kind: 'direction',
      text: entry.text,
      align: entry.textAlign === 'center' ? 'center' : 'left'
    };
  }

  if (entry.type === 'monologue') {
    return {
      key,
      kind: 'monologue',
      text: entry.text,
      align: entry.textAlign === 'center' ? 'center' : 'left'
    };
  }

  return null;
};

const blockFromCreditSection = (section: CreditSection, key: string, useTightSpace: boolean = false): TextBlock | null => {
  switch (section.type) {
    case 'title':
      return {
        key,
        kind: 'creditTitle',
        text: section.content || '',
        align: 'center'
      };
    case 'role':
      return {
        key,
        kind: 'creditRole',
        text: section.role || '',
        names: section.names || []
      };
    case 'afterstory':
      return {
        key,
        kind: 'creditAfterstory',
        text: section.text || '',
        name: section.title
      };
    case 'text':
      return {
        key,
        kind: 'creditText',
        text: section.content || '',
        align: 'center'
      };
    case 'space':
      return {
        key,
        kind: useTightSpace ? 'creditTightSpace' : 'creditSpace',
        text: '',
        spaceHeight: useTightSpace
          ? Math.max(8, Math.min(section.height || 50, 20))
          : Math.max(16, Math.min(section.height || 50, 120))
      };
    default:
      return null;
  }
};

const getSectionMetaText = (meta?: string) => {
  if (!meta) return '第2章';
  if (meta === 'プロローグ' || meta === 'エピローグ') {
    return `第2章 序幕` === `第2章 序幕` && meta === 'プロローグ'
      ? '第2章 序幕'
      : '第2章 終幕';
  }
  return `第2章 ${meta}`;
};

const getPageHeaderTitle = (sectionLabel: string, sectionTitle: string) => {
  if (sectionLabel === sectionTitle) {
    return sectionTitle;
  }
  return `${sectionLabel} ${sectionTitle}`.trim();
};

const paginateSectionBlocks = (
  sections: StorySection[],
  measuredHeights: Record<string, number>,
  maxBodyHeight: number
): PageLayout[] => {
  const pages: PageLayout[] = [];

  sections.forEach((section) => {
    let currentPage: PageLayout = {
      sectionNo: section.sectionNo,
      sectionLabel: section.displayLabel,
      sectionTitle: section.title,
      continuation: false,
      blocks: []
    };
    let usedHeight = 0;

    section.blocks.forEach((block) => {
      if (block.forcePageBreakBefore && currentPage.blocks.length > 0) {
        pages.push(currentPage);
        currentPage = {
          sectionNo: section.sectionNo,
          sectionLabel: section.displayLabel,
          sectionTitle: section.title,
          continuation: true,
          blocks: []
        };
        usedHeight = 0;
      }

      const blockHeight = measuredHeights[block.key] || 0;
      const exceedsPage = usedHeight > 0 && usedHeight + blockHeight > maxBodyHeight;

      if (exceedsPage) {
        pages.push(currentPage);
        currentPage = {
          sectionNo: section.sectionNo,
          sectionLabel: section.displayLabel,
          sectionTitle: section.title,
          continuation: true,
          blocks: []
        };
        usedHeight = 0;
      }

      currentPage.blocks.push(block);
      usedHeight += blockHeight;
    });

    if (currentPage.blocks.length > 0) {
      pages.push(currentPage);
    }
  });

  return pages;
};

const PrintableBlock: React.FC<{ block: TextBlock }> = ({ block }) => {
  if (block.kind === 'sectionTitle') {
    return (
      <section className="storybook-block storybook-section-title">
        <div className="storybook-section-meta">{getSectionMetaText(block.meta)}</div>
        <h2>{block.text}</h2>
      </section>
    );
  }

  if (block.kind === 'partTitle') {
    return (
      <section className="storybook-block storybook-part-title">
        <div className="storybook-part-chip">{block.text}</div>
      </section>
    );
  }

  if (block.kind === 'creditTitle') {
    return (
      <section className="storybook-block storybook-credit-title">
        <div className="storybook-text">{renderRubyText(block.text)}</div>
      </section>
    );
  }

  if (block.kind === 'creditRole') {
    return (
      <section className="storybook-block storybook-credit-role">
        <div className="storybook-credit-role-name">{block.text}</div>
        <div className="storybook-credit-role-names">
          {(block.names || []).map((name, index) => (
            <div key={`${block.key}-${index}`}>{name}</div>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === 'creditAfterstory') {
    return (
      <section className="storybook-block storybook-credit-afterstory">
        {block.name && <div className="storybook-credit-afterstory-name">{block.name}</div>}
        <div className="storybook-text">{renderRubyText(block.text)}</div>
      </section>
    );
  }

  if (block.kind === 'creditText') {
    return (
      <section className="storybook-block storybook-credit-text">
        <div className="storybook-text">{renderRubyText(block.text)}</div>
      </section>
    );
  }

  if (block.kind === 'creditSpace') {
    return <div className="storybook-credit-space" style={{ height: `${block.spaceHeight || 24}px` }} />;
  }

  if (block.kind === 'creditTightSpace') {
    return <div className="storybook-credit-tight-space" style={{ height: `${block.spaceHeight || 12}px` }} />;
  }

  if (block.kind === 'theEnd') {
    return (
      <section className="storybook-block storybook-the-end">
        <div className="storybook-the-end-text">{block.text}</div>
      </section>
    );
  }

  if (block.kind === 'tocItem') {
    return (
      <section className="storybook-block storybook-toc-item">
        <div className="storybook-toc-label">{block.text}</div>
        <div className="storybook-toc-dots" />
        <div className="storybook-toc-page">{block.pageNumber}</div>
      </section>
    );
  }

  return (
    <section className={`storybook-block storybook-text-block storybook-text-${block.kind} ${block.align === 'center' ? 'is-center' : ''}`}>
      {block.name && <div className="storybook-speaker">{block.name}</div>}
      <div className="storybook-text">{renderRubyText(block.text)}</div>
    </section>
  );
};

const Chapter2StoryBook: React.FC<Chapter2StoryBookProps> = ({ onClose, supporterNames = [] }) => {
  const [sections, setSections] = useState<StorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundOpacity] = useState(0.16);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<Record<number, string>>({});
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [pageBodyHeight, setPageBodyHeight] = useState(PAGE_BODY_HEIGHT_PX);
  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const measurePageBodyRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [assetsRes, flowRes, stagesRes, creditsRes] = await Promise.all([
          fetch(toPublicUrl('/data/story_assets.json')),
          fetch(toPublicUrl('/data/chapter2_flow.json')),
          fetch(toPublicUrl('/data/stages.json')),
          fetch(toPublicUrl('/data/credits.json'))
        ]);

        if (!assetsRes.ok || !flowRes.ok || !stagesRes.ok || !creditsRes.ok) {
          throw new Error('ストーリーデータの読み込みに失敗しました。');
        }

        const assets = await assetsRes.json() as StoryAssets;
        const flows = await flowRes.json() as Chapter2StageFlow[];
        const stages = await stagesRes.json() as StageRecord[];
        const creditsData = withSupporterCredits(await creditsRes.json() as CreditsData, supporterNames);

        const storyIds = [
          'prologue',
          ...flows
            .flatMap((flow) => flow.flow.filter((step) => step.type === 'story').map((step) => step.id))
            .filter((id): id is string => Boolean(id)),
          'epilogue'
        ];

        const uniqueIds = Array.from(new Set(storyIds));
        const stories = await Promise.all(
          uniqueIds.map(async (id) => {
            const response = await fetch(toPublicUrl(`/story/v2/${id}.txt`));
            if (!response.ok) {
              throw new Error(`${id}.txt の読み込みに失敗しました。`);
            }
            return [id, await response.text()] as const;
          })
        );

        if (cancelled) return;

        const textMap = new Map<string, string>(stories);
        const urlToBackgroundName = new Map<string, string>();
        Object.entries(assets.backgrounds || {}).forEach(([name, value]) => {
          urlToBackgroundName.set(value, name);
        });

        const buildSection = (
          sectionNo: number,
          displayLabel: string,
          title: string,
          partDefs: Array<{ id: string; label?: string }>
        ): StorySection => {
          const partBackgroundValues: string[] = [];
          const parts: StoryPart[] = partDefs.map((part, partIndex) => {
            const rawText = textMap.get(part.id);
            const script = parseStoryText(rawText || '', assets);
            const blocks = script
              .map((entry, entryIndex) => {
                if (entry.background && entry.background !== 'OFF') {
                  partBackgroundValues.push(entry.background);
                }
                return blockFromEntry(entry, `section-${sectionNo}-part-${partIndex + 1}-entry-${entryIndex}`);
              })
              .filter((block): block is TextBlock => Boolean(block));

            return {
              id: part.id,
              label: part.label,
              blocks
            };
          });

          const uniqueBackgroundValues = Array.from(new Set(partBackgroundValues));
          const backgroundOptions: BackgroundOption[] = [
            { label: 'なし', value: '' },
            ...uniqueBackgroundValues.map((value) => ({
              label: getBackgroundOptionLabel(value, urlToBackgroundName),
              value
            }))
          ];

          const blocks: TextBlock[] = [
            {
              key: `section-${sectionNo}-title`,
              kind: 'sectionTitle',
              meta: displayLabel,
              text: title
            }
          ];

          parts.forEach((part, partIndex) => {
            if (part.label) {
              blocks.push({
                key: `section-${sectionNo}-part-${partIndex + 1}-title`,
                kind: 'partTitle',
                text: part.label
              });
            }
            blocks.push(...part.blocks);
          });

          return {
            sectionNo,
            displayLabel,
            title,
            backgroundOptions,
            defaultBackground: backgroundOptions[1]?.value || '',
            blocks,
            parts
          };
        };

        const chapterSections = flows.map((flow) => {
          const sectionNo = Math.max(flow.stageNo - 12, 1);
          const stageTitle = stages.find((stage) => stage.chapter === 2 && stage.stage === sectionNo && stage.battle === 1)?.name || `第${sectionNo}節`;
          const storySteps = flow.flow.filter((step) => step.type === 'story' && step.id);

          return buildSection(
            sectionNo,
            `第${sectionNo}節`,
            stageTitle,
            storySteps.map((step, partIndex) => ({
              id: step.id!,
              label: `パート ${partIndex + 1}`
            }))
          );
        });

        const rawCreditBlocks = creditsData.sections
          .map((section, index, list) => {
            const previousType = index > 0 ? list[index - 1].type : null;
            const nextType = index < list.length - 1 ? list[index + 1].type : null;
            const useTightSpace = section.type === 'space' && (previousType === 'afterstory' || nextType === 'afterstory');
            return blockFromCreditSection(section, `section-100-credit-${index}`, useTightSpace);
          })
          .filter((block): block is TextBlock => Boolean(block));

        const firstAfterstoryIndex = rawCreditBlocks.findIndex((block) => block.kind === 'creditAfterstory');
        const creditBlocks = firstAfterstoryIndex >= 0
          ? [
              ...rawCreditBlocks.slice(0, firstAfterstoryIndex),
              {
                key: 'section-100-afterstory-title',
                kind: 'creditTitle' as const,
                text: '後日談',
                align: 'center' as const,
                forcePageBreakBefore: true
              } satisfies TextBlock,
              ...rawCreditBlocks.slice(firstAfterstoryIndex)
            ]
          : rawCreditBlocks;

        const endSection: StorySection = {
          sectionNo: 101,
          displayLabel: '終幕',
          title: 'THE END',
          backgroundOptions: [{ label: 'なし', value: '' }],
          defaultBackground: '',
          parts: [{ id: 'the-end', blocks: [] }],
          blocks: [
            {
              key: 'section-101-the-end',
              kind: 'theEnd',
              text: 'THE END',
              align: 'center'
            }
          ]
        };

        const nextSections: StorySection[] = [
          buildSection(0, 'プロローグ', 'プロローグ', [{ id: 'prologue' }]),
          ...chapterSections,
          buildSection(99, 'エピローグ', 'エピローグ', [{ id: 'epilogue' }]),
          {
            sectionNo: 100,
            displayLabel: 'エンドロール',
            title: 'エンドロール',
            backgroundOptions: [{ label: 'なし', value: '' }],
            defaultBackground: '',
            parts: [{ id: 'credits', blocks: creditBlocks }],
            blocks: [
              {
                key: 'section-100-title',
                kind: 'sectionTitle',
                meta: 'エンドロール',
                text: 'エンドロール'
              },
              ...creditBlocks
            ]
          },
          endSection
        ];

        setSections(nextSections);
        setSelectedBackgrounds(
          nextSections.reduce<Record<number, string>>((acc, section) => {
            acc[section.sectionNo] = section.defaultBackground;
            return acc;
          }, {})
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '不明なエラーが発生しました。');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [supporterNames]);

  const contentPageLayouts = useMemo(
    () => paginateSectionBlocks(sections, measuredHeights, pageBodyHeight),
    [measuredHeights, pageBodyHeight, sections]
  );

  const tocBlocks = useMemo<TextBlock[]>(() => {
    if (sections.length === 0) return [];

    const firstPageBySection = new Map<number, number>();
    contentPageLayouts.forEach((page, index) => {
      if (!firstPageBySection.has(page.sectionNo)) {
        firstPageBySection.set(page.sectionNo, index + 2);
      }
    });

    return [
      {
        key: 'section--1-title',
        kind: 'sectionTitle',
        meta: '目次',
        text: '目次'
      },
      ...sections
        .filter((section) => section.displayLabel !== '終幕')
        .map((section) => ({
          key: `section--1-toc-${section.sectionNo}`,
          kind: 'tocItem' as const,
          text: section.displayLabel === section.title
            ? section.title
            : `${section.displayLabel} ${section.title}`,
          pageNumber: firstPageBySection.get(section.sectionNo) || 1
        }))
    ];
  }, [contentPageLayouts, sections]);

  const tocSection = useMemo<StorySection>(() => ({
    sectionNo: -1,
    displayLabel: '目次',
    title: '目次',
    backgroundOptions: [{ label: 'なし', value: '' }],
    defaultBackground: '',
    parts: [{ id: 'toc', blocks: tocBlocks }],
    blocks: tocBlocks
  }), [tocBlocks]);

  const allBlocks = useMemo(() => [tocSection, ...sections].flatMap((section) => section.blocks), [sections, tocSection]);

  useLayoutEffect(() => {
    if (allBlocks.length === 0) return;

    const measure = () => {
      const nextHeights = allBlocks.reduce<Record<string, number>>((acc, block) => {
        const element = measureRefs.current[block.key];
        if (element) {
          acc[block.key] = Math.ceil(element.getBoundingClientRect().height);
        }
        return acc;
      }, {});
      const measuredBodyHeight = measurePageBodyRef.current
        ? Math.max(0, Math.floor(measurePageBodyRef.current.getBoundingClientRect().height) - PAGE_BODY_MEASURE_SAFETY_PX)
        : PAGE_BODY_HEIGHT_PX;
      setMeasuredHeights(nextHeights);
      setPageBodyHeight(measuredBodyHeight || PAGE_BODY_HEIGHT_PX);
    };

    const rafId = window.requestAnimationFrame(measure);
    let cancelled = false;

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (!cancelled) {
          window.requestAnimationFrame(measure);
        }
      });
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [allBlocks]);

  const pageLayouts = useMemo<PageLayout[]>(
    () => paginateSectionBlocks([tocSection, ...sections], measuredHeights, pageBodyHeight),
    [measuredHeights, pageBodyHeight, sections, tocSection]
  );

  const firstPageIndexBySection = useMemo(() => {
    return pageLayouts.reduce<Record<number, number>>((acc, page, index) => {
      if (acc[page.sectionNo] === undefined) {
        acc[page.sectionNo] = index;
      }
      return acc;
    }, {});
  }, [pageLayouts]);

  const sectionJumpItems = useMemo(() => {
    return sections
      .filter((section) => section.sectionNo !== 101)
      .map((section) => ({
        sectionNo: section.sectionNo,
        label: section.displayLabel === section.title
          ? section.title
          : `${section.displayLabel} ${section.title}`,
        pageNumber: (firstPageIndexBySection[section.sectionNo] ?? 0) + 1
      }));
  }, [firstPageIndexBySection, sections]);

  const handleJumpToSection = (sectionNo: number) => {
    const targetPage = pageRefs.current[sectionNo];
    if (!targetPage) return;
    targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <div className="storybook-loading">
        <div className="storybook-loading-card">
          <h1>第2章 ストーリーブック</h1>
          <p>ストーリーを読み込んでいます…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storybook-loading">
        <div className="storybook-loading-card">
          <h1>第2章 ストーリーブック</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="storybook-shell">
      <aside className="storybook-controls">
        <div className="storybook-controls-header">
          <div>
            <div className="storybook-controls-kicker">Web / A4 Preview</div>
            <h1>第2章 ストーリーブック</h1>
          </div>
          <div className="storybook-controls-actions">
            {onClose && (
              <button type="button" className="storybook-close-button" onClick={onClose}>
                閉じる
              </button>
            )}
            <button type="button" className="storybook-print-button" onClick={() => window.print()}>
              印刷
            </button>
          </div>
        </div>

        <p className="storybook-description">
          各節ごとに3パートをまとめ、ストーリー本文をそのまま読める形でA4ページに整えています。
        </p>

        <section className="storybook-jump-panel">
          <div className="storybook-jump-header">
            <h2>節ジャンプ</h2>
            <p>読みたい節の冒頭ページへ移動できます。</p>
          </div>
          <div className="storybook-jump-grid">
            {sectionJumpItems.map((item) => (
              <button
                key={`jump-${item.sectionNo}`}
                type="button"
                className="storybook-jump-button"
                onClick={() => handleJumpToSection(item.sectionNo)}
              >
                <span className="storybook-jump-label">{item.label}</span>
                <span className="storybook-jump-page">P.{item.pageNumber}</span>
              </button>
            ))}
          </div>
        </section>

      </aside>

      <main className="storybook-preview">
        {pageLayouts.map((page, pageIndex) => {
          const backgroundValue = selectedBackgrounds[page.sectionNo] || '';
          const isTheEndPage = page.blocks.length === 1 && page.blocks[0].kind === 'theEnd';
          const isSectionStart = firstPageIndexBySection[page.sectionNo] === pageIndex;
          return (
            <article
              key={`page-${page.sectionNo}-${pageIndex}`}
              className={`storybook-page ${isTheEndPage ? 'is-the-end-only-page' : ''}`}
              ref={(element) => {
                if (isSectionStart) {
                  pageRefs.current[page.sectionNo] = element;
                }
              }}
            >
              {backgroundValue && (
                <div
                  className="storybook-page-background"
                  style={{ backgroundImage: `url("${toPublicUrl(backgroundValue)}")` }}
                  aria-hidden="true"
                />
              )}
              <div
                className="storybook-page-overlay"
                style={{ backgroundColor: `rgba(245, 239, 229, ${0.92 - backgroundOpacity * 0.35})` }}
                aria-hidden="true"
              />

              {!isTheEndPage && (
                <header className="storybook-page-header">
                  <div className="storybook-page-header-kicker">SHIDEN ISSEN CHAPTER 2</div>
                  <div className="storybook-page-header-title">
                    {getPageHeaderTitle(page.sectionLabel, page.sectionTitle)}
                  </div>
                </header>
              )}

              <div className={`storybook-page-body ${isTheEndPage ? 'is-the-end-page' : ''}`}>
                {page.blocks.map((block) => (
                  <PrintableBlock key={block.key} block={block} />
                ))}
              </div>

              <footer className="storybook-page-footer">
                <span>{pageIndex + 1}</span>
              </footer>
            </article>
          );
        })}
      </main>

      <div className="storybook-measure-layer" aria-hidden="true">
        <div className="storybook-page storybook-measure-page">
          <div className="storybook-page-header">
            <div className="storybook-page-header-kicker">SHIDEN ISSEN CHAPTER 2</div>
            <div className="storybook-page-header-title">第1節 サンプル</div>
          </div>
          <div className="storybook-page-body storybook-measure-body" ref={measurePageBodyRef}>
            <div className="storybook-measure-blocks">
              {allBlocks.map((block) => (
                <div
                  key={`measure-${block.key}`}
                  className="storybook-measure-block"
                  ref={(element) => {
                    measureRefs.current[block.key] = element;
                  }}
                >
                  <PrintableBlock block={block} />
                </div>
              ))}
            </div>
          </div>
          <div className="storybook-page-footer">
            <span>1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter2StoryBook;
