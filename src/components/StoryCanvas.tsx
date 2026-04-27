import React, { useState, useEffect, useRef } from 'react';
import { StoryScript, StoryEntry, CreditsData, CreditIllustration, CreditSection } from '../types/story';
import { getStorageUrl } from '../firebase';
import { parseStoryText, StoryAssets } from '../types/storyParser';
import AudioManager from '../utils/audioManager';

interface StoryCanvasProps {
  script?: StoryScript; // 以前の互換性のために残す
  scriptUrl?: string; // 新しいURL指定
  creditsUrl?: string; // エンドロール用URL
  onEnd: () => void;
  onOpenSettings?: () => void;
  onToggleMute?: () => void;
  isBgmEnabled?: boolean;
  loadingImageUrl?: string;
  charScalePC?: number;
  charScaleMobile?: number;
  offsetYPC?: number;
  offsetYMobile?: number;
  autoEndOnScriptEnd?: boolean;
}

interface RubySegment {
  text: string;
  ruby?: string;
}

const STORY_CANVAS_TEXT_FONT = '"Yu Mincho", "Hiragino Mincho ProN", "BIZ UDPMincho", serif';

const parseRubyText = (text: string): RubySegment[] => {
  const segments: RubySegment[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    
    // エスケープ処理 (\\《 -> 《)
    if (char === '\\' && i + 1 < text.length) {
        const nextChar = text[i + 1];
        if (nextChar === '《' || nextChar === '》' || nextChar === '｜' || nextChar === '|') {
            if (segments.length > 0 && !segments[segments.length - 1].ruby) {
                segments[segments.length - 1].text += nextChar;
            } else {
                segments.push({ text: nextChar });
            }
            i += 2;
            continue;
        }
    }

    if (char === '|' || char === '｜') {
      const rubyStart = text.indexOf('《', i);
      const rubyEnd = text.indexOf('》', rubyStart);
      if (rubyStart !== -1 && rubyEnd !== -1) {
        const parent = text.substring(i + 1, rubyStart);
        const ruby = text.substring(rubyStart + 1, rubyEnd);
        segments.push({ text: parent, ruby });
        i = rubyEnd + 1;
        continue;
      }
    } else if (char === '《') {
       const rubyEnd = text.indexOf('》', i);
       if (segments.length > 0 && rubyEnd !== -1) {
         const lastSegment = segments.pop()!;
         const ruby = text.substring(i + 1, rubyEnd);
         
         // 簡易記法の判定: 直前の1文字が漢字、英字、またはカタカナの場合のみルビとみなす
         const lastChar = lastSegment.text.slice(-1);
         const isRubyTarget = /[々〇\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uD840-\uD87F[\uDC00-\uDFFF]A-Za-z\u30A1-\u30FC]/.test(lastChar);

         if (lastSegment.ruby || !isRubyTarget) {
           segments.push(lastSegment);
           // 通常の文字として処理
         } else {
           if (lastSegment.text.length > 1) {
             segments.push({ text: lastSegment.text.slice(0, -1) });
             segments.push({ text: lastSegment.text.slice(-1), ruby });
           } else {
             segments.push({ text: lastSegment.text, ruby });
           }
           i = rubyEnd + 1;
           continue;
         }
       }
    }
    
    if (segments.length > 0 && !segments[segments.length - 1].ruby) {
      segments[segments.length - 1].text += char;
    } else {
      segments.push({ text: char });
    }
    i++;
  }
  return segments;
};

const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach((paragraph) => {
    if (paragraph === '') {
      lines.push('');
      return;
    }

    let currentLine = '';
    Array.from(paragraph).forEach((char) => {
      const nextLine = currentLine + char;
      if (currentLine && ctx.measureText(nextLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = nextLine;
      }
    });

    lines.push(currentLine);
  });

  return lines;
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const lines = wrapCanvasText(ctx, text, maxWidth);
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
  return lines.length;
};

const getTypingSpeed = (entry?: StoryEntry): number => {
  return entry?.typingSpeed && entry.typingSpeed > 0 ? entry.typingSpeed : 40;
};

const measureTextWithLetterSpacing = (
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number => {
  const chars = Array.from(text);
  if (chars.length === 0) return 0;
  const textWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0);
  return textWidth + letterSpacing * Math.max(0, chars.length - 1);
};

const wrapTextWithLetterSpacing = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacing: number
): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach((paragraph) => {
    if (paragraph === '') {
      lines.push('');
      return;
    }

    let currentLine = '';
    Array.from(paragraph).forEach((char) => {
      const nextLine = currentLine + char;
      const nextWidth = measureTextWithLetterSpacing(ctx, nextLine, letterSpacing);
      if (currentLine && nextWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = nextLine;
      }
    });
    lines.push(currentLine);
  });

  return lines;
};

const drawTextWithLetterSpacing = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
) => {
  let currentX = x;
  Array.from(text).forEach((char) => {
    ctx.strokeText(char, currentX, y);
    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width + letterSpacing;
  });
};

const StoryCanvas: React.FC<StoryCanvasProps> = ({ script: initialScript, scriptUrl, creditsUrl, onEnd, onOpenSettings, onToggleMute, isBgmEnabled = true, loadingImageUrl, charScalePC, charScaleMobile, offsetYPC, offsetYMobile, autoEndOnScriptEnd = false }) => {
  const [script, setScript] = useState<StoryScript>(initialScript || []);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [displayedCharCount, setDisplayedCharCount] = useState(0); // ルび対応用の表示文字数
  const [isTyping, setIsTyping] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const activeCharactersRef = useRef<{ [key: string]: { img: HTMLImageElement; focus: boolean; position: string; opacity: number } }>({});
  const currentBackgroundRef = useRef<HTMLImageElement | null>(null);
  const currentBackgroundMobileRef = useRef<HTMLImageElement | null>(null);
  const currentBackgroundMobileOffsetXRef = useRef(0);
  const currentStillRef = useRef<HTMLImageElement | null>(null); // スチル画像用
  const bgOpacityRef = useRef(0);
  const screenFadeAlphaRef = useRef(0); // 演出用フェード
  const whiteFlashAlphaRef = useRef(0); // 白フラッシュ演出
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [shakeAmount, setShakeAmount] = useState(0); // 画面揺れ用
  const endingAlphaRef = useRef(1);
  const waitAfterEndingTimerRef = useRef<number | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1);
  const [, setForceUpdate] = useState(false); // UI更新用

  // エンドロール用
  const scrollOffsetRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const [showTheEnd, setShowTheEnd] = useState(false);
  const [theEndAlpha, setTheEndAlpha] = useState(0);
  const creditsBgmStartedRef = useRef(false);

  const renderCredits = (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
    if (!creditsData) return;

    const now = Date.now();
    if (lastTimeRef.current === 0) lastTimeRef.current = now;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // スマホ判定 (縦長または幅が狭い場合)
    const isMobileMode = (width / dpr) < 800;
    const mobileScrollSpeedFactor = isMobileMode ? 0.55 : 1;
    const scrollSpeed = (creditsData.scrollSpeed || 1) * mobileScrollSpeedFactor * dpr * (delta / 16.6);
    scrollOffsetRef.current += scrollSpeed;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // --- レイアウト設定 ---
    const illAreaWidth = isMobileMode ? width : width * 0.5;
    const illAreaHeight = isMobileMode ? height * 0.45 : height; // スマホ時は約45%を画像エリアに
    const creditsX = isMobileMode ? 0 : width * 0.5;
    const creditsY = isMobileMode ? illAreaHeight : 0;
    const creditsWidth = isMobileMode ? width : width * 0.5;
    const creditsHeight = isMobileMode ? height - creditsY : height;

    const illProgress = scrollOffsetRef.current; // スクロール量を時間軸として利用

    // 背景描画
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // スマホ時のクレジット背景
    if (isMobileMode) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(creditsX, creditsY, creditsWidth, creditsHeight);
        
        // 境界線
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, illAreaHeight);
        ctx.lineTo(width, illAreaHeight);
        ctx.stroke();
    }

    // --- 左側（または上部）: イラスト ---
    const activeIllustration = creditsData.illustrations
      .map((ill) => {
        const start = ill.startTime * dpr;
        const duration = (ill.duration || 8000) * dpr; // デフォルト8秒
        const fadeTime = Math.min(1000 * dpr, duration * 0.3);
        const end = start + duration;
        return { ill, start, fadeTime, end };
      })
      .filter(({ start, end }) => illProgress >= start && illProgress <= end)
      .pop();

    if (activeIllustration) {
        const { ill, start, fadeTime, end } = activeIllustration;
        let alpha = 0;
        if (illProgress < start + fadeTime) {
            alpha = (illProgress - start) / fadeTime;
        } else if (illProgress > end - fadeTime) {
            alpha = (end - illProgress) / fadeTime;
        } else {
            alpha = 1;
        }

        const img = imagesRef.current[ill.image];
        if (img) {
            ctx.save();
            ctx.globalAlpha = alpha;
            // スマホ時は枠いっぱいに表示しやすくするためスケールを微調整
            const scale = Math.min(illAreaWidth / img.width, illAreaHeight / img.height) * (isMobileMode ? 1.0 : 0.95);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (illAreaWidth - w) / 2;
            const y = (isMobileMode ? (illAreaHeight - h) / 2 : (height - h) / 2);

            ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
            ctx.shadowBlur = 20 * dpr;
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
        }
    }

    // --- 右側（または下部）: クレジットスクロール ---
    ctx.save();
    
    // クレジット表示領域のクリッピング
    ctx.beginPath();
    ctx.rect(creditsX, creditsY, creditsWidth, creditsHeight);
    ctx.clip();

    const padding = (isMobileMode ? 15 : 40) * dpr;
    const contentX = creditsX + padding;
    const maxContentWidth = creditsWidth - padding * 2;

    let currentY = creditsY + creditsHeight - scrollOffsetRef.current;

    creditsData.sections.forEach(section => {
        switch (section.type) {
            case "title":
                ctx.fillStyle = '#81d4fa';
                ctx.font = `bold ${(isMobileMode ? 22 : 32) * dpr}px "Yu Gothic", "YuGothic", "sans-serif"`;
                ctx.textAlign = 'center';
                currentY += drawWrappedText(ctx, section.content || "", creditsX + creditsWidth / 2, currentY, maxContentWidth, (isMobileMode ? 30 : 42) * dpr) * (isMobileMode ? 30 : 42) * dpr;
                currentY += (isMobileMode ? 10 : 18) * dpr;
                break;
            case "role":
                ctx.fillStyle = '#aaa';
                ctx.font = `${(isMobileMode ? 13 : 18) * dpr}px "Yu Gothic", "YuGothic", "sans-serif"`;
                const roleX = isMobileMode ? contentX : creditsX + creditsWidth * 0.4;
                const namesX = isMobileMode ? contentX : creditsX + creditsWidth * 0.45;
                const roleMaxWidth = isMobileMode ? maxContentWidth : Math.max(20 * dpr, roleX - contentX);
                const namesMaxWidth = Math.max(20 * dpr, creditsX + creditsWidth - padding - namesX);
                const roleLineHeight = (isMobileMode ? 18 : 24) * dpr;
                const nameLineHeight = (isMobileMode ? 21 : 31) * dpr;

                ctx.textAlign = isMobileMode ? 'left' : 'right';
                const roleLines = drawWrappedText(ctx, section.role || "", roleX, currentY, roleMaxWidth, roleLineHeight);
                
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${(isMobileMode ? 15 : 22) * dpr}px "Yu Gothic", "YuGothic", "sans-serif"`;
                ctx.textAlign = 'left';
                const namesStartY = currentY + (isMobileMode ? roleLines * roleLineHeight + 6 * dpr : 0);
                let namesHeight = 0;
                section.names?.forEach((name) => {
                    const lineCount = drawWrappedText(ctx, name, namesX, namesStartY + namesHeight, namesMaxWidth, nameLineHeight);
                    namesHeight += lineCount * nameLineHeight;
                });
                const roleBlockHeight = isMobileMode
                    ? roleLines * roleLineHeight + 6 * dpr + (namesHeight || nameLineHeight)
                    : Math.max(roleLines * roleLineHeight, namesHeight || nameLineHeight);
                currentY += roleBlockHeight + (isMobileMode ? 25 : 40) * dpr;
                break;
            case "afterstory":
                const titleFontSize = (isMobileMode ? 15 : 20) * dpr;
                const textFontSize = (isMobileMode ? 13 : 18) * dpr;
                const iconSize = (isMobileMode ? 28 : 40) * dpr;

                // アイコン描画
                let titleX = contentX;
                if (section.icon && imagesRef.current[section.icon]) {
                    const iconImg = imagesRef.current[section.icon];
                    ctx.drawImage(iconImg, contentX, currentY - titleFontSize * 0.2, iconSize, iconSize);
                    titleX += iconSize + 8 * dpr;
                }

                ctx.fillStyle = '#ffd54f';
                ctx.font = `bold ${titleFontSize}px "Yu Gothic", "YuGothic", "sans-serif"`;
                ctx.textAlign = 'left';
                const titleLineHeight = titleFontSize * 1.25;
                const titleMaxWidth = Math.max(20 * dpr, creditsX + creditsWidth - padding - titleX);
                const titleLines = drawWrappedText(ctx, section.title || "", titleX, currentY + (section.icon ? (iconSize - titleFontSize) / 2 : 0), titleMaxWidth, titleLineHeight);
                
                ctx.fillStyle = '#eee';
                ctx.font = `${textFontSize}px ${STORY_CANVAS_TEXT_FONT}`;
                const textLineHeight = textFontSize * 1.4;
                const titleHeight = titleLines * titleLineHeight;
                const storyTextY = currentY + Math.max(iconSize, titleHeight) + 10 * dpr;
                const textLines = drawWrappedText(ctx, section.text || "", contentX, storyTextY, maxContentWidth, textLineHeight);
                currentY = storyTextY + textLines * textLineHeight + (isMobileMode ? 35 : 60) * dpr;
                break;
            case "text":
                ctx.fillStyle = '#fff';
                ctx.font = `${(isMobileMode ? 15 : 20) * dpr}px ${STORY_CANVAS_TEXT_FONT}`;
                ctx.textAlign = 'center';
                const simpleTextLineHeight = (isMobileMode ? 22 : 30) * dpr;
                currentY += drawWrappedText(ctx, section.content || "", creditsX + creditsWidth / 2, currentY, maxContentWidth, simpleTextLineHeight) * simpleTextLineHeight;
                currentY += (isMobileMode ? 8 : 10) * dpr;
                break;
            case "space":
                currentY += (section.height || 50) * (isMobileMode ? 0.7 : 1.0) * dpr;
                break;
        }
    });

    ctx.restore();

    if (showTheEnd) {
        if (theEndAlpha < 1 && !isEnding) {
            setTheEndAlpha(prev => Math.min(1, prev + 0.01));
        }

        ctx.save();
        ctx.globalAlpha = theEndAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${(isMobileMode ? 72 : 132) * dpr}px "Cinzel", "Georgia", "Times New Roman", serif`;
        ctx.lineWidth = 2.5 * dpr;
        ctx.strokeStyle = 'rgba(255, 224, 130, 0.9)';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.95)';
        ctx.shadowBlur = 34 * dpr;
        ctx.strokeText("THE END", width / 2, height / 2);
        ctx.fillStyle = '#fff8dc';
        ctx.fillText("THE END", width / 2, height / 2);
        ctx.shadowBlur = 0;
        ctx.font = `bold ${(isMobileMode ? 20 : 30) * dpr}px "Yu Gothic", "YuGothic", "sans-serif"`;
        // ctx.fillStyle = 'rgba(129, 212, 250, 0.9)';
        // ctx.fillText("FLAG", width / 2, height / 2 + (isMobileMode ? 58 : 92) * dpr);
        ctx.restore();
        
        if (theEndAlpha >= 1 && !isEnding) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
            ctx.fillStyle = '#ddd';
            ctx.font = `${(isMobileMode ? 15 : 20) * dpr}px "Yu Gothic", "YuGothic", "sans-serif"`;
            ctx.textAlign = 'center';
            ctx.fillText("- CLICK TO TITLE -", width / 2, height / 2 + (isMobileMode ? 92 : 136) * dpr);
            ctx.restore();
        }
    }

    if (isEnding) {
        if (endingAlphaRef.current > 0) {
          endingAlphaRef.current -= 0.015;
          if (endingAlphaRef.current < 0) endingAlphaRef.current = 0;
        } else {
          if (waitAfterEndingTimerRef.current === null) {
            waitAfterEndingTimerRef.current = Date.now();
          }
          if (Date.now() - waitAfterEndingTimerRef.current > 500) {
            onEnd();
            return;
          }
        }

        ctx.save();
        ctx.globalAlpha = 1 - endingAlphaRef.current;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
  };

  const currentEntry = script[currentEntryIndex];

  const CONFIG = {
    PC: {
      boxHeight: 180,
      fontSize: 22,
      nameFontSize: 24,
      margin: 40,
      paddingX: 30,
      paddingY: 25,
      charScale: charScalePC || 0.85,
      offsetY: offsetYPC || 0,
      lineSpacing: 1.6
    },
    MOBILE: {
      boxHeight: 180, // 4行分確保するために高さを調整
      fontSize: 18,
      nameFontSize: 19,
      margin: 10,
      paddingX: 15,
      paddingY: 15,
      charScale: charScaleMobile || 0.7,
      offsetY: offsetYMobile || 0,
      lineSpacing: 1.4 // 行間を少し詰めて4行入りやすくする
    }
  };

  // スクリプトとアセットの読み込み
  useEffect(() => {
    const loadScriptAndAssets = async () => {
      try {
        let finalScript = initialScript;
        const imageUrls = new Set<string>();

        if (creditsUrl) {
          const creditsResponse = await fetch(creditsUrl);
          const creditsData: CreditsData = await creditsResponse.json();
          setCreditsData(creditsData);
          setShowTheEnd(false);
          setTheEndAlpha(0);
          endingAlphaRef.current = 1;
          waitAfterEndingTimerRef.current = null;
          creditsBgmStartedRef.current = false;

          creditsData.illustrations.forEach(ill => imageUrls.add(ill.image));
          creditsData.sections.forEach(sec => {
            if (sec.icon) imageUrls.add(sec.icon);
          });
          setIsLoaded(false); // エンドロールモードでもロード待機
        } else if (scriptUrl) {
          // アセット設定の読み込み
          const assetsResponse = await fetch('/data/story_assets.json');
          const assets: StoryAssets = await assetsResponse.json();

          // スクリプトの読み込み
          const scriptResponse = await fetch(scriptUrl);
          const scriptText = await scriptResponse.text();

          if (scriptUrl.endsWith('.json')) {
            finalScript = JSON.parse(scriptText);
          } else {
            finalScript = parseStoryText(scriptText, assets);
          }
        }

        if (finalScript) {
          setScript(finalScript);
          for (const entry of finalScript) {
            if (entry.background) imageUrls.add(entry.background);
            if (entry.backgroundMobile) imageUrls.add(entry.backgroundMobile);
            if (entry.characterImage) imageUrls.add(entry.characterImage);
            if (entry.icon) imageUrls.add(entry.icon);
            if (entry.still) imageUrls.add(entry.still);
          }
        }

        if (imageUrls.size === 0 && !creditsUrl && !finalScript) return;

        const loadPromises = Array.from(imageUrls).map(async (key) => {
          if (imagesRef.current[key]) return;

          const tryLoad = (u: string) => {
            return new Promise<boolean>((resolve) => {
              const img = new Image();
              img.src = u;
              img.onload = () => {
                imagesRef.current[key] = img;
                resolve(true);
              };
              img.onerror = () => resolve(false);
            });
          };

          let url = key;
          if (!key.startsWith("/") && !key.startsWith("http")) {
            let storagePath = key;
            if (!key.startsWith("images/")) {
              storagePath = `images/character/${key}`;
            }

            // すでに拡張子が含まれている場合は直接読み込む
            if (storagePath.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
              await tryLoad(getStorageUrl(storagePath));
              return;
            }

            if (!storagePath.includes(".")) {
              const success = await tryLoad(getStorageUrl(storagePath + ".png"));
              if (success) return;
              const successJpg = await tryLoad(getStorageUrl(storagePath + ".jpg"));
              if (successJpg) return;
              await tryLoad(getStorageUrl(storagePath + ".gif"));
            } else {
              await tryLoad(getStorageUrl(storagePath));
            }
          } else {
            await tryLoad(key);
          }
        });

        await Promise.all(loadPromises);
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load story script:", error);
      }
    };

    loadScriptAndAssets();
  }, [scriptUrl, initialScript, creditsUrl]);

  useEffect(() => {
    if (!isLoaded || !creditsData?.bgm || creditsBgmStartedRef.current) return;

    creditsBgmStartedRef.current = true;
    AudioManager.getInstance().playBgm(creditsData.bgm, false, () => {
      setShowTheEnd(true);
    });
  }, [isLoaded, creditsData]);

  // シーン管理
  useEffect(() => {
    if (!currentEntry || !isLoaded) return;

    if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
    }
    if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
    }
    if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
    }

    setDisplayedCharCount(0);
    lastProcessedIndexRef.current = currentEntryIndex;

    if (currentEntry.background) {
      if (currentEntry.background === "OFF" || currentEntry.background === "None") {
        currentBackgroundRef.current = null;
        currentBackgroundMobileRef.current = null;
        currentBackgroundMobileOffsetXRef.current = 0;
      } else if (imagesRef.current[currentEntry.background]) {
        const newBg = imagesRef.current[currentEntry.background];
        const newMobileBg = currentEntry.backgroundMobile ? imagesRef.current[currentEntry.backgroundMobile] || null : null;
        const hasBackgroundChanged = currentBackgroundRef.current !== newBg || currentBackgroundMobileRef.current !== newMobileBg;
        currentBackgroundMobileRef.current = newMobileBg;
        currentBackgroundMobileOffsetXRef.current = currentEntry.backgroundMobileOffsetX || 0;
        if (hasBackgroundChanged) {
          currentBackgroundRef.current = newBg;
          // もし画面が完全に暗い状態なら、背景は最初から表示しておく (フェードアウト演出用)
          bgOpacityRef.current = screenFadeAlphaRef.current >= 0.95 ? 1 : 0;
          activeCharactersRef.current = {};
          currentStillRef.current = null; // 背景が変わったらスチル解除
        }
      }
    }

    // スチル表示処理
    if (currentEntry.still) {
        if (currentEntry.still === "none") {
            currentStillRef.current = null;
        } else if (imagesRef.current[currentEntry.still]) {
            currentStillRef.current = imagesRef.current[currentEntry.still];
        }
    }

    // 演出処理 (画面揺れ、フェード)
    if (currentEntry.type === "effect") {
        if (currentEntry.animation === "shake") {
            setShakeAmount(15);
            setTimeout(() => setShakeAmount(0), 500);
        } else if (currentEntry.animation === "flash") {
            const duration = currentEntry.duration || 350;
            const startTime = Date.now();
            whiteFlashAlphaRef.current = 1;

            const animateFlash = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                whiteFlashAlphaRef.current = 1 - progress;

                if (progress < 1) {
                    requestAnimationFrame(animateFlash);
                }
            };
            requestAnimationFrame(animateFlash);
        } else if (currentEntry.animation === "fadeOut" || currentEntry.animation === "fadeIn") {
            const isFadeOut = currentEntry.animation === "fadeOut";
            const duration = currentEntry.duration || 1000;
            const startTime = Date.now();
            
            const animateFade = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (isFadeOut) {
                    screenFadeAlphaRef.current = progress;
                } else {
                    screenFadeAlphaRef.current = 1 - progress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateFade);
                }
            };
            requestAnimationFrame(animateFade);
        }
    }

    const setFocus = (targetPos: string) => {
        Object.keys(activeCharactersRef.current).forEach(pos => {
            activeCharactersRef.current[pos].focus = (pos === targetPos);
        });
    };

    if (currentEntry.type === "character" && currentEntry.characterImage && currentEntry.position) {
      const img = imagesRef.current[currentEntry.characterImage];
      if (img) {
        const pos = currentEntry.position;
        if (!activeCharactersRef.current[pos] || activeCharactersRef.current[pos].img !== img) {
            activeCharactersRef.current[pos] = {
              img,
              focus: true,
              position: pos,
              opacity: 0
            };
        }
        setFocus(pos);
      }
    } else if (currentEntry.type === "dialogue" || currentEntry.type === "direction") {
        const targetIcon = currentEntry.icon || currentEntry.characterImage;
        if (targetIcon) {
            const img = imagesRef.current[targetIcon];
            if (img) {
                const targetPos = currentEntry.position || "center";
                if (!activeCharactersRef.current[targetPos] || activeCharactersRef.current[targetPos].img !== img) {
                    activeCharactersRef.current[targetPos] = {
                        img,
                        focus: true,
                        position: targetPos,
                        opacity: 0
                    };
                }
                setFocus(targetPos);
            }
        }
    } else if (currentEntry.type === "clearCharacter" && currentEntry.position) {
        if (activeCharactersRef.current[currentEntry.position]) {
            delete activeCharactersRef.current[currentEntry.position];
        }
    }

    if (currentEntry.text) {
      setIsTyping(true);
      const fullSegments = parseRubyText(currentEntry.text);
      const totalChars = fullSegments.reduce((sum, seg) => sum + seg.text.length, 0);
      let i = 0;
      typingIntervalRef.current = setInterval(() => {
        setDisplayedCharCount(i + 1);
        i++;
        if (i >= totalChars) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          setIsTyping(false);
        }
      }, getTypingSpeed(currentEntry));
    } else {
      setIsTyping(false);
    }

    // SE再生
    if (currentEntry.soundEffect) {
      AudioManager.getInstance().playSe(currentEntry.soundEffect);
    }

    // BGM再生
    if (currentEntry.bgm) {
      if (currentEntry.bgm === "OFF") {
        AudioManager.getInstance().fadeOutAndStop(currentEntry.duration || 2000);
      } else {
        // duration（自動進行）が設定されている場合は、1回限りの再生（ループなし）とする
        const loop = !currentEntry.duration;
        AudioManager.getInstance().playBgm(currentEntry.bgm, loop);
      }
    }

    // 自動で次へ進むかどうかの判定
    const isAutoNext = !!currentEntry.duration;
    const isEffectOnly = !currentEntry.text && (
      currentEntry.type === "effect" ||
      currentEntry.type === "background" ||
      currentEntry.type === "clearCharacter" ||
      currentEntry.still ||
      currentEntry.bgm
    );

    if (isAutoNext || isEffectOnly) {
      const getEffectDelay = () => {
        if (currentEntry.duration) return currentEntry.duration;
        if (currentEntry.animation === "shake") return 600;
        if (currentEntry.animation === "flash") return 350;
        if (currentEntry.animation === "fadeOut" || currentEntry.animation === "fadeIn") return 1000;
        return 50;
      };
      const delay = getEffectDelay();
      autoNextTimerRef.current = setTimeout(() => {
        if (currentEntryIndex >= script.length - 1) {
          if (autoEndOnScriptEnd) {
            onEnd();
            return;
          }
          setIsEnding(true);
          return;
        }
        if (currentEntryIndex === lastProcessedIndexRef.current) {
          setCurrentEntryIndex(currentEntryIndex + 1);
        }
      }, delay);

      // BGMフェードアウトの予約処理
      if (currentEntry.duration && currentEntry.fadeDuration) {
        const fadeDelay = Math.max(0, currentEntry.duration - currentEntry.fadeDuration);
        fadeTimerRef.current = setTimeout(() => {
          AudioManager.getInstance().fadeOutAndStop(currentEntry.fadeDuration!);
        }, fadeDelay);
      }

      if (!currentEntry.text) {
        setDisplayedCharCount(0);
        setIsTyping(false);
      }
    }

    return () => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [currentEntryIndex, isLoaded, currentEntry]);

  // 描画ループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      if (creditsData) {
        renderCredits(ctx, width, height, dpr);
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const isMobileMode = (width / dpr) < 800;
      const conf = isMobileMode ? CONFIG.MOBILE : CONFIG.PC;

      if (isEnding) {
        if (endingAlphaRef.current > 0) {
          endingAlphaRef.current -= 0.015;
          if (endingAlphaRef.current < 0) endingAlphaRef.current = 0;
        } else {
          if (waitAfterEndingTimerRef.current === null) {
            waitAfterEndingTimerRef.current = Date.now();
          }
          if (Date.now() - waitAfterEndingTimerRef.current > 2000) {
            onEnd();
            return;
          }
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // 画面揺れの適用
      ctx.save();
      if (shakeAmount > 0) {
        const sx = (Math.random() - 0.5) * shakeAmount * dpr;
        const sy = (Math.random() - 0.5) * shakeAmount * dpr;
        ctx.translate(sx, sy);
      }

      if (bgOpacityRef.current < 1) {
        bgOpacityRef.current += 0.03;
        if (bgOpacityRef.current > 1) bgOpacityRef.current = 1;
      }

      if (currentBackgroundRef.current) {
        const bgImg = isMobileMode && currentBackgroundMobileRef.current ? currentBackgroundMobileRef.current : currentBackgroundRef.current;
        const scale = Math.max(width / bgImg.width, height / bgImg.height);

        const drawW = bgImg.width * scale;
        const drawH = bgImg.height * scale;
        const mobileOffsetX = isMobileMode ? currentBackgroundMobileOffsetXRef.current * dpr : 0;
        const x = (width - drawW) / 2 + mobileOffsetX;
        const focalY = isMobileMode ? 0.42 : 0.32;
        const y = drawH > height ? (height - drawH) * focalY : (height - drawH) / 2;
        
        ctx.save();
        if (currentEntry?.sepia) ctx.filter = "sepia(100%) brightness(90%)";
        ctx.globalAlpha = bgOpacityRef.current;
        ctx.drawImage(bgImg, x, y, drawW, drawH);
        ctx.restore();
      }

      // 1.5 スチル描画 (背景の上に重ねる)
      if (currentStillRef.current) {
        const stillImg = currentStillRef.current;
        // スマホ版では幅400px、通常は800px。高さは4:3を維持
        const baseW = isMobileMode ? 300 : 600;
        const baseH = isMobileMode ? 200 : 400;
        const stillW = baseW * dpr;
        const stillH = baseH * dpr;
        const x = (width - stillW) / 2;
        // セリフ枠との重なりを避けるため、少し上に配置
        const y = (height - stillH) / 2 - (isMobileMode ? 40 : 60) * dpr;
        
        ctx.save();
        if (currentEntry?.sepia) ctx.filter = "sepia(100%) brightness(90%)";
        ctx.globalAlpha = bgOpacityRef.current;
        
        // 枠の描画
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4 * dpr;
        ctx.strokeRect(x - 2 * dpr, y - 2 * dpr, stillW + 4 * dpr, stillH + 4 * dpr);

        // スチル本体（アスペクト比を維持しつつ指定サイズ内に収める）
        const imgScale = Math.min(stillW / stillImg.width, stillH / stillImg.height);
        const drawW = stillImg.width * imgScale;
        const drawH = stillImg.height * imgScale;
        const drawX = x + (stillW - drawW) / 2;
        const drawY = y + (stillH - drawH) / 2;

        // 黒い背景で塗りつぶしてから描画
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, stillW, stillH);
        ctx.drawImage(stillImg, drawX, drawY, drawW, drawH);
        
        ctx.restore();
      }

      Object.values(activeCharactersRef.current)
        .sort((a, b) => {
            if (a.focus && !b.focus) return 1;
            if (!a.focus && b.focus) return -1;
            return 0;
        })
        .forEach(char => {
        if (char.opacity < 1) {
            char.opacity += 0.05;
            if (char.opacity > 1) char.opacity = 1;
        }

        const charImg = char.img;
        let charScale = (height * conf.charScale) / charImg.height;
        if (currentEntry?.scale) {
          charScale *= currentEntry.scale;
        }
        const charW = charImg.width * charScale;
        const charH = charImg.height * charScale;
        
        let charX = (width - charW) / 2;
        if (char.position === "left") charX = width * 0.22 - charW / 2;
        if (char.position === "right") charX = width * 0.78 - charW / 2;

        const baseAlpha = char.opacity;
        
        ctx.save();
        if (currentEntry?.sepia) ctx.filter = "sepia(100%) brightness(90%)";
        if (!char.focus) {
          ctx.globalAlpha = baseAlpha * 0.5;
          if (ctx.filter === "none") ctx.filter = "brightness(60%)";
          else ctx.filter += " brightness(60%)";
        } else {
          ctx.globalAlpha = baseAlpha;
        }

        const slideY = (1 - char.opacity) * 20 * dpr;
        const entryOffsetY = (currentEntry?.offsetY || 0) * dpr;
        const globalOffsetY = (conf.offsetY || 0) * dpr;
        ctx.drawImage(charImg, charX, height - charH + slideY + entryOffsetY + globalOffsetY, charW, charH);
        ctx.restore();
      });

      const margin = conf.margin * dpr;
      const boxHeight = conf.boxHeight * dpr;
      const boxY = height - boxHeight - margin;
      const boxW = width - margin * 2;
      const cornerRadius = 12 * dpr;
      
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(margin, boxY, boxW, boxHeight, cornerRadius);
      } else {
        ctx.rect(margin, boxY, boxW, boxHeight);
      }
      ctx.fillStyle = 'rgba(0, 0, 25, 1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.restore();

      const paddingX = conf.paddingX * dpr;
      const paddingY = conf.paddingY * dpr;
      ctx.textBaseline = 'top';

      const usesCenteredPanelText = currentEntry?.textAlign === "center";

      // 名前欄の表示 (dialogueタイプのみ、またはnameがありdirectionでない場合)
      const shouldDisplayName = currentEntry?.name && currentEntry.type !== "direction" && !usesCenteredPanelText;
      if (shouldDisplayName) {
        const nameFontSize = conf.nameFontSize * dpr;
        ctx.fillStyle = '#81d4fa';
        ctx.font = `bold ${nameFontSize}px ${STORY_CANVAS_TEXT_FONT}`;
        ctx.fillText(currentEntry.name!, margin + paddingX, boxY + paddingY);
      }

      const textFontSize = conf.fontSize * dpr;
      ctx.fillStyle = '#fff';
      ctx.font = `${textFontSize}px ${STORY_CANVAS_TEXT_FONT}`;
      const textX = margin + paddingX;
      const nameOffset = shouldDisplayName ? (isMobileMode ? 30 : 48) * dpr : 0;
      const textY = boxY + paddingY + nameOffset;
      const maxWidth = boxW - paddingX * 2;
      
      if (lastProcessedIndexRef.current === currentEntryIndex && currentEntry?.text) {
          const fullSegments = parseRubyText(currentEntry.text);
          const currentSegments = getDisplayedSegments(fullSegments, displayedCharCount);
          if (usesCenteredPanelText) {
            ctx.font = `bold ${textFontSize}px ${STORY_CANVAS_TEXT_FONT}`;
            const visibleText = currentSegments.map(seg => seg.text).join('');
            const letterSpacing = (currentEntry.letterSpacing || 0) * dpr;
            const centeredLines = wrapTextWithLetterSpacing(ctx, visibleText, maxWidth, letterSpacing);
            const lineHeight = textFontSize * conf.lineSpacing;
            const totalTextHeight = textFontSize + Math.max(0, centeredLines.length - 1) * lineHeight;
            const centeredStartY = boxY + (boxHeight - totalTextHeight) / 2;

            ctx.save();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4 * dpr;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            centeredLines.forEach((line, index) => {
              const lineWidth = measureTextWithLetterSpacing(ctx, line, letterSpacing);
              const lineX = margin + boxW / 2 - lineWidth / 2;
              const lineY = centeredStartY + index * lineHeight;
              drawTextWithLetterSpacing(ctx, line, lineX, lineY, letterSpacing);
            });
            ctx.restore();
          } else {
          const lines = wrapTextWithRuby(ctx, currentSegments, maxWidth);
          
          ctx.save();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          lines.forEach((line, index) => {
            const ly = textY + index * textFontSize * conf.lineSpacing;
            let currentX = textX;
            
            line.forEach(seg => {
                const charWidth = ctx.measureText(seg.text).width;
                
                // 親文字の描画
                ctx.strokeText(seg.text, currentX, ly);
                ctx.fillText(seg.text, currentX, ly);
                
                // ルビの描画
                if (seg.ruby) {
                    ctx.save();
                    const rubyFontSize = textFontSize * 0.5;
                    ctx.font = `${rubyFontSize}px ${STORY_CANVAS_TEXT_FONT}`;
                    const rubyWidth = ctx.measureText(seg.ruby).width;
                    const rubyX = currentX + (charWidth - rubyWidth) / 2;
                    const rubyY = ly - rubyFontSize * 0.9;
                    
                    ctx.strokeText(seg.ruby, rubyX, rubyY);
                    ctx.fillText(seg.ruby, rubyX, rubyY);
                    ctx.restore();
                }
                
                currentX += charWidth;
            });
          });
          ctx.restore();
          }
      }

      ctx.restore(); // 画面揺れ ctx.save() の対

      // 演出用フェードオーバーレイ
      if (screenFadeAlphaRef.current > 0) {
          ctx.save();
          ctx.globalAlpha = screenFadeAlphaRef.current;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
      }

      if (whiteFlashAlphaRef.current > 0) {
          ctx.save();
          ctx.globalAlpha = whiteFlashAlphaRef.current;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
      }

      if (isEnding) {
          ctx.save();
          ctx.globalAlpha = 1 - endingAlphaRef.current;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoaded, currentEntryIndex, displayedCharCount, isEnding, shakeAmount, CONFIG.PC, CONFIG.MOBILE, creditsData]);

const getDisplayedSegments = (fullSegments: RubySegment[], count: number): RubySegment[] => {
  const result: RubySegment[] = [];
  let remaining = count;
  for (const seg of fullSegments) {
    if (remaining <= 0) break;
    if (seg.text.length <= remaining) {
      result.push(seg);
      remaining -= seg.text.length;
    } else {
      result.push({ text: seg.text.substring(0, remaining), ruby: seg.ruby });
      remaining = 0;
    }
  }
  return result;
};

const wrapTextWithRuby = (ctx: CanvasRenderingContext2D, segments: RubySegment[], maxWidth: number): RubySegment[][] => {
  const lines: RubySegment[][] = [];
  const kinsokuChars = '、。！？）］｝〉》」』】〕ゝゞー々';
  
  let currentLine: RubySegment[] = [];
  let currentWidth = 0;
  
  for (const seg of segments) {
    if (seg.ruby) {
      // ルビ付きセグメントは基本的には塊として扱う
      const segWidth = ctx.measureText(seg.text).width;
      if (currentWidth + segWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [seg];
        currentWidth = segWidth;
      } else {
        currentLine.push(seg);
        currentWidth += segWidth;
      }
    } else {
      // 通常のテキストは1文字ずつ処理して禁則処理を行う
      const parentText = seg.text;
      for (let n = 0; n < parentText.length; n++) {
        const char = parentText[n];
        const charWidth = ctx.measureText(char).width;
        
        if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
          // 行頭禁則 ( char が句読点なら、直前の1文字を道連れにして改行する )
          if (kinsokuChars.includes(char)) {
             const last = currentLine.pop()!;
             if (last.ruby || last.text.length === 1) {
                // 直前がルビ付き、または1文字だけの場合
                if (currentLine.length > 0) {
                  lines.push(currentLine);
                }
                currentLine = [last, { text: char }];
                currentWidth = ctx.measureText(last.text).width + charWidth;
             } else {
                // 直前が複数文字のテキストセグメントなら、最後の1文字を切り出す
                const textWithoutLast = last.text.slice(0, -1);
                const lastChar = last.text.slice(-1);
                
                lines.push([...currentLine, { text: textWithoutLast }]);
                currentLine = [{ text: lastChar }, { text: char }];
                currentWidth = ctx.measureText(lastChar).width + charWidth;
             }
          } else {
             lines.push(currentLine);
             currentLine = [{ text: char }];
             currentWidth = charWidth;
          }
        } else {
          // 直前もルビなしセグメントなら、まとめる（描画効率のため）
          const last = currentLine[currentLine.length - 1];
          if (last && !last.ruby) {
            last.text += char;
          } else {
            currentLine.push({ text: char });
          }
          currentWidth += charWidth;
        }
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
};

  const handleNext = () => {
    if (isEnding || !isLoaded) return;

    // エンドロール中は THE END 表示後だけクリックで終了する
    if (creditsData) {
        if (showTheEnd) {
            if (theEndAlpha >= 0.8 && !isEnding) {
                setIsEnding(true);
            }
            return;
        }

        return;
    }

    // 自動進行（duration指定）中はクリックによる進行を無効化する
    if (currentEntry?.duration) return;

    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      const fullSegments = parseRubyText(currentEntry.text || '');
      const totalChars = fullSegments.reduce((sum, seg) => sum + seg.text.length, 0);
      setDisplayedCharCount(totalChars);
      setIsTyping(false);
    } else if (currentEntryIndex < script.length - 1) {
      setDisplayedCharCount(0);
      setCurrentEntryIndex((prev) => prev + 1);
    } else {
      setIsEnding(true);
    }
  };

  useEffect(() => {
    const resizeCanvas = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    setTimeout(resizeCanvas, 100);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isLoaded]);

  const isCompactViewport = viewportSize.width < 800;
  const storyContentStyle: React.CSSProperties = isCompactViewport
    ? {
        width: '95%',
        maxWidth: '1200px',
        height: '90%',
        maxHeight: '800px'
      }
    : {
        width: 'min(90vw, 1200px, calc(90dvh * 1.5))',
        height: 'min(90dvh, 800px, calc(90vw / 1.5))',
        aspectRatio: '3 / 2'
      };

  return (
    <div 
      className="story-modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100dvh', 
        zIndex: 999, 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        overflow: 'hidden',
        pointerEvents: isEnding ? 'none' : 'auto',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none'
      }}
    >
      <div 
        ref={containerRef}
        className="story-modal-content"
        onClick={handleNext}
        style={{ 
          ...storyContentStyle,
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          overflow: 'hidden',
          border: '2px solid #444',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'crisp-edges'
          }}
        />
        {isLoaded && !isEnding && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 10 }}>
            {onOpenSettings && !creditsData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"Yu Gothic", "YuGothic", "sans-serif"',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '45px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(50, 50, 50, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'}
                title="設定"
              >
                ⚙️
              </button>
            )}
            {onToggleMute && !creditsData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"Yu Gothic", "YuGothic", "sans-serif"',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '45px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(50, 50, 50, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'}
                title={isBgmEnabled ? 'BGMをミュート' : 'ミュート解除'}
              >
                {isBgmEnabled ? '🔊' : '🔇'}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('ストーリーをスキップしますか？')) {
                  setIsEnding(true);
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                fontFamily: '"Yu Gothic", "YuGothic", "sans-serif"',
                WebkitTapHighlightColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(50, 50, 50, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'}
            >
              SKIP
            </button>
          </div>
        )}
        {!isLoaded && !creditsUrl && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontFamily: '"Yu Gothic", "YuGothic", "sans-serif"',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <img src={loadingImageUrl || "/images/title/sailing_loop_32x32_fixed.gif"} alt="Loading" style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
            <div>Loading Story...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCanvas;
