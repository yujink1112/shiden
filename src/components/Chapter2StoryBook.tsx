import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseStoryText, StoryAssets } from '../types/storyParser';
import { StoryEntry } from '../types/story';
import './Chapter2StoryBook.css';

type Chapter2StoryBookProps = {
  onClose?: () => void;
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

type TextBlockKind = 'sectionTitle' | 'partTitle' | 'dialogue' | 'direction' | 'monologue';

type TextBlock = {
  key: string;
  kind: TextBlockKind;
  text: string;
  name?: string;
  align?: 'left' | 'center';
};

type BackgroundOption = {
  label: string;
  value: string;
};

type StoryPart = {
  id: string;
  label: string;
  blocks: TextBlock[];
};

type StorySection = {
  sectionNo: number;
  title: string;
  backgroundOptions: BackgroundOption[];
  defaultBackground: string;
  blocks: TextBlock[];
  parts: StoryPart[];
};

type PageLayout = {
  sectionNo: number;
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
const PAGE_LAYOUT_SAFETY_PX = 72;
const PAGE_BODY_HEIGHT_PX = A4_HEIGHT_PX - PAGE_PADDING_PX * 2 - PAGE_HEADER_HEIGHT_PX - PAGE_FOOTER_HEIGHT_PX - PAGE_LAYOUT_SAFETY_PX;

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

const PrintableBlock: React.FC<{ block: TextBlock }> = ({ block }) => {
  if (block.kind === 'sectionTitle') {
    return (
      <section className="storybook-block storybook-section-title">
        <div className="storybook-section-meta">第2章 第{block.key.split('-')[1]}節</div>
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

  return (
    <section className={`storybook-block storybook-text-block storybook-text-${block.kind} ${block.align === 'center' ? 'is-center' : ''}`}>
      {block.name && <div className="storybook-speaker">{block.name}</div>}
      <div className="storybook-text">{renderRubyText(block.text)}</div>
    </section>
  );
};

const Chapter2StoryBook: React.FC<Chapter2StoryBookProps> = ({ onClose }) => {
  const [sections, setSections] = useState<StorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.16);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<Record<number, string>>({});
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [assetsRes, flowRes, stagesRes] = await Promise.all([
          fetch(toPublicUrl('/data/story_assets.json')),
          fetch(toPublicUrl('/data/chapter2_flow.json')),
          fetch(toPublicUrl('/data/stages.json'))
        ]);

        if (!assetsRes.ok || !flowRes.ok || !stagesRes.ok) {
          throw new Error('ストーリーデータの読み込みに失敗しました。');
        }

        const assets = await assetsRes.json() as StoryAssets;
        const flows = await flowRes.json() as Chapter2StageFlow[];
        const stages = await stagesRes.json() as StageRecord[];

        const storyIds = flows
          .flatMap((flow) => flow.flow.filter((step) => step.type === 'story').map((step) => step.id))
          .filter((id): id is string => Boolean(id));

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

        const nextSections: StorySection[] = flows.map((flow) => {
          const sectionNo = Math.max(flow.stageNo - 12, 1);
          const stageTitle = stages.find((stage) => stage.chapter === 2 && stage.stage === sectionNo && stage.battle === 1)?.name || `第${sectionNo}節`;
          const storySteps = flow.flow.filter((step) => step.type === 'story' && step.id);

          const partBackgroundValues: string[] = [];
          const parts: StoryPart[] = storySteps.map((step, partIndex) => {
            const rawText = textMap.get(step.id!);
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
              id: step.id!,
              label: `パート ${partIndex + 1}`,
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
              text: stageTitle
            }
          ];

          parts.forEach((part, partIndex) => {
            blocks.push({
              key: `section-${sectionNo}-part-${partIndex + 1}-title`,
              kind: 'partTitle',
              text: part.label
            });
            blocks.push(...part.blocks);
          });

          return {
            sectionNo,
            title: stageTitle,
            backgroundOptions,
            defaultBackground: backgroundOptions[1]?.value || '',
            blocks,
            parts
          };
        });

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
  }, []);

  const allBlocks = useMemo(() => sections.flatMap((section) => section.blocks), [sections]);

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
      setMeasuredHeights(nextHeights);
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

  const pageLayouts = useMemo<PageLayout[]>(() => {
    if (sections.length === 0) return [];

    const pages: PageLayout[] = [];

    sections.forEach((section) => {
      let currentPage: PageLayout = {
        sectionNo: section.sectionNo,
        sectionTitle: section.title,
        continuation: false,
        blocks: []
      };
      let usedHeight = 0;

      section.blocks.forEach((block) => {
        const blockHeight = measuredHeights[block.key] || 0;
        const exceedsPage = usedHeight > 0 && usedHeight + blockHeight > PAGE_BODY_HEIGHT_PX;

        if (exceedsPage) {
          pages.push(currentPage);
          currentPage = {
            sectionNo: section.sectionNo,
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
  }, [measuredHeights, sections]);

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
          各節ごとに3パートをまとめ、`StoryCanvas` の本文をそのまま読める形でA4ページに整えています。
        </p>

        <label className="storybook-opacity-control">
          <span>背景の濃さ</span>
          <input
            type="range"
            min="0"
            max="0.35"
            step="0.01"
            value={backgroundOpacity}
            onChange={(event) => setBackgroundOpacity(Number(event.target.value))}
          />
          <strong>{Math.round(backgroundOpacity * 100)}%</strong>
        </label>

        <div className="storybook-background-grid">
          {sections.map((section) => (
            <label key={section.sectionNo} className="storybook-select-card">
              <span>第{section.sectionNo}節 背景</span>
              <select
                value={selectedBackgrounds[section.sectionNo] ?? section.defaultBackground}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedBackgrounds((prev) => ({
                    ...prev,
                    [section.sectionNo]: value
                  }));
                }}
              >
                {section.backgroundOptions.map((option) => (
                  <option key={`${section.sectionNo}-${option.value || 'none'}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </aside>

      <main className="storybook-preview">
        {pageLayouts.map((page, pageIndex) => {
          const backgroundValue = selectedBackgrounds[page.sectionNo] || '';
          return (
            <article key={`page-${page.sectionNo}-${pageIndex}`} className="storybook-page">
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

              <header className="storybook-page-header">
                <div className="storybook-page-header-kicker">SHIDEN CHAPTER 2</div>
                <div className="storybook-page-header-title">
                  第{page.sectionNo}節 {page.sectionTitle}
                  {page.continuation ? ' 続き' : ''}
                </div>
              </header>

              <div className="storybook-page-body">
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
        <div className="storybook-measure-page">
          <div className="storybook-measure-body">
            {allBlocks.map((block) => (
              <div
                key={`measure-${block.key}`}
                ref={(element) => {
                  measureRefs.current[block.key] = element;
                }}
              >
                <PrintableBlock block={block} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter2StoryBook;
