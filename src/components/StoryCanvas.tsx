import React, { useState, useEffect, useRef } from 'react';
import { StoryScript } from '../types/story';
import { getStorageUrl } from '../firebase';
import { parseStoryText, StoryAssets } from '../types/storyParser';
import AudioManager from '../utils/audioManager';

interface StoryCanvasProps {
  script?: StoryScript; // 以前の互換性のために残す
  scriptUrl?: string; // 新しいURL指定
  onEnd: () => void;
  onOpenSettings?: () => void;
  loadingImageUrl?: string;
}

const StoryCanvas: React.FC<StoryCanvasProps> = ({ script: initialScript, scriptUrl, onEnd, onOpenSettings, loadingImageUrl }) => {
  const [script, setScript] = useState<StoryScript>(initialScript || []);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const activeCharactersRef = useRef<{ [key: string]: { img: HTMLImageElement; focus: boolean; position: string; opacity: number } }>({});
  const currentBackgroundRef = useRef<HTMLImageElement | null>(null);
  const currentStillRef = useRef<HTMLImageElement | null>(null); // スチル画像用
  const bgOpacityRef = useRef(0);
  
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

  const currentEntry = script[currentEntryIndex];

  const CONFIG = {
    PC: {
      boxHeight: 180,
      fontSize: 22,
      nameFontSize: 24,
      margin: 40,
      paddingX: 30,
      paddingY: 25,
      charScale: 0.85,
      lineSpacing: 1.6
    },
    MOBILE: {
      boxHeight: 180, // 4行分確保するために高さを調整
      fontSize: 18,
      nameFontSize: 19,
      margin: 10,
      paddingX: 15,
      paddingY: 15,
      charScale: 0.75,
      lineSpacing: 1.4 // 行間を少し詰めて4行入りやすくする
    }
  };

  // スクリプトとアセットの読み込み
  useEffect(() => {
    const loadScriptAndAssets = async () => {
      try {
        let finalScript = initialScript;

        if (scriptUrl) {
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

        if (!finalScript) return;
        setScript(finalScript);
        
        // 画像のプリロード
        const imageUrls = new Set<string>();
        for (const entry of finalScript) {
          if (entry.background) imageUrls.add(entry.background);
          if (entry.characterImage) imageUrls.add(entry.characterImage);
          if (entry.icon) imageUrls.add(entry.icon);
          if (entry.still) imageUrls.add(entry.still); // スチルのプリロード追加
        }

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
  }, [scriptUrl, initialScript]);

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

    setDisplayedText('');
    lastProcessedIndexRef.current = currentEntryIndex;

    if (currentEntry.background && imagesRef.current[currentEntry.background]) {
      const newBg = imagesRef.current[currentEntry.background];
      if (currentBackgroundRef.current !== newBg) {
        currentBackgroundRef.current = newBg;
        bgOpacityRef.current = 0;
        activeCharactersRef.current = {};
        currentStillRef.current = null; // 背景が変わったらスチル解除
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

    // 画面揺れ演出
    if (currentEntry.type === "effect" && currentEntry.animation === "shake") {
        setShakeAmount(15);
        setTimeout(() => setShakeAmount(0), 500);
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
      let i = 0;
      typingIntervalRef.current = setInterval(() => {
        setDisplayedText(currentEntry.text!.substring(0, i + 1));
        i++;
        if (i >= currentEntry.text!.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          setIsTyping(false);
        }
      }, 40);
    } else {
      setIsTyping(false);
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
      const delay = currentEntry.duration || (currentEntry.animation === "shake" ? 600 : 50);
      autoNextTimerRef.current = setTimeout(() => {
        setCurrentEntryIndex(prev => {
          if (prev === lastProcessedIndexRef.current && prev < script.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, delay);

      // BGMフェードアウトの予約処理
      if (currentEntry.duration && currentEntry.fadeDuration) {
        const fadeDelay = Math.max(0, currentEntry.duration - currentEntry.fadeDuration);
        fadeTimerRef.current = setTimeout(() => {
          AudioManager.getInstance().fadeOutAndStop(currentEntry.fadeDuration!);
        }, fadeDelay);
      }

      if (!currentEntry.text) {
        setDisplayedText("");
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
        const bgImg = currentBackgroundRef.current;
        const scale = Math.max(width / bgImg.width, height / bgImg.height);
        const drawW = bgImg.width * scale;
        const drawH = bgImg.height * scale;
        const x = (width - drawW) / 2;
        const y = (height - drawH) / 2;
        
        ctx.save();
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
        const charScale = (height * conf.charScale) / charImg.height;
        const charW = charImg.width * charScale;
        const charH = charImg.height * charScale;
        
        let charX = (width - charW) / 2;
        if (char.position === "left") charX = width * 0.22 - charW / 2;
        if (char.position === "right") charX = width * 0.78 - charW / 2;

        const baseAlpha = char.opacity;
        
        ctx.save();
        if (!char.focus) {
          ctx.globalAlpha = baseAlpha * 0.5;
          if (ctx.filter) ctx.filter = "brightness(60%)";
        } else {
          ctx.globalAlpha = baseAlpha;
        }

        const slideY = (1 - char.opacity) * 20 * dpr;
        ctx.drawImage(charImg, charX, height - charH + slideY, charW, charH);
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

      // 名前欄の表示 (dialogueタイプのみ、またはnameがありdirectionでない場合)
      const shouldDisplayName = currentEntry?.name && currentEntry.type !== "direction";
      if (shouldDisplayName) {
        const nameFontSize = conf.nameFontSize * dpr;
        ctx.fillStyle = '#81d4fa';
        ctx.font = `bold ${nameFontSize}px "Yu Gothic", "YuGothic", "sans-serif"`;
        ctx.fillText(currentEntry.name!, margin + paddingX, boxY + paddingY);
      }

      const textFontSize = conf.fontSize * dpr;
      ctx.fillStyle = '#fff';
      ctx.font = `${textFontSize}px "Yu Gothic", "YuGothic", "sans-serif"`;
      const textX = margin + paddingX;
      const nameOffset = shouldDisplayName ? (isMobileMode ? 30 : 48) * dpr : 0;
      const textY = boxY + paddingY + nameOffset;
      const maxWidth = boxW - paddingX * 2;
      
      if (lastProcessedIndexRef.current === currentEntryIndex && displayedText) {
          const lines = wrapText(ctx, displayedText, maxWidth);
          
          ctx.save();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4 * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          lines.forEach((line, index) => {
            const ly = textY + index * textFontSize * conf.lineSpacing;
            ctx.strokeText(line, textX, ly);
            ctx.fillText(line, textX, ly);
          });
          ctx.restore();
      }

      ctx.restore(); // 画面揺れ ctx.save() の対

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
  }, [isLoaded, currentEntryIndex, displayedText, isEnding, shakeAmount, CONFIG.PC, CONFIG.MOBILE]);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (!text) return [];
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    paragraphs.forEach(p => {
        let currentLine = '';
        for (let n = 0; n < p.length; n++) {
            const char = p[n];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
    });
    return lines;
  };

  const handleNext = () => {
    if (isEnding || !isLoaded) return;

    // 自動進行（duration指定）中はクリックによる進行を無効化する
    if (currentEntry?.duration) return;

    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(currentEntry.text || '');
      setIsTyping(false);
    } else if (currentEntryIndex < script.length - 1) {
      setDisplayedText('');
      setCurrentEntryIndex((prev) => prev + 1);
    } else {
      setIsEnding(true);
    }
  };

  useEffect(() => {
    const resizeCanvas = () => {
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

  return (
    <div 
      className="story-modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100dvh', 
        zIndex: 9999, 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        overflow: 'hidden',
        pointerEvents: isEnding ? 'none' : 'auto'
      }}
    >
      <div 
        ref={containerRef}
        className="story-modal-content"
        onClick={handleNext}
        style={{ 
          position: 'relative',
          width: '95%', 
          maxWidth: '1200px',
          height: '90%', 
          maxHeight: '800px',
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
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 10000 }}>
            {onOpenSettings && (
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
        {!isLoaded && (
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
