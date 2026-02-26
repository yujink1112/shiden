import React, { useState, useEffect, useRef } from 'react';
import { StoryScript } from '../types/story';
import { getStorageUrl } from '../firebase';

interface StoryCanvasProps {
  script: StoryScript;
  onEnd: () => void;
}

const StoryCanvas: React.FC<StoryCanvasProps> = ({ script, onEnd }) => {
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const activeCharactersRef = useRef<{ [key: string]: { img: HTMLImageElement; focus: boolean; position: string; opacity: number } }>({});
  const currentBackgroundRef = useRef<HTMLImageElement | null>(null);
  const bgOpacityRef = useRef(0);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const endingAlphaRef = useRef(1);
  const waitAfterEndingTimerRef = useRef<number | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1); // インデックス変更検知用

  const currentEntry = script[currentEntryIndex];

  // 設定定数 (PC/スマホ別)
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
      boxHeight: 150,
      fontSize: 18,
      nameFontSize: 19,
      margin: 10,
      paddingX: 15,
      paddingY: 15,
      charScale: 0.75,
      lineSpacing: 1.5
    }
  };

  // 画像のプリロード
  useEffect(() => {
    const loadAllImages = async () => {
      const imageUrls = new Set<string>();
      for (const entry of script) {
        if (entry.background) imageUrls.add(entry.background);
        if (entry.characterImage) imageUrls.add(entry.characterImage);
        if (entry.icon) imageUrls.add(entry.icon);
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
    };

    loadAllImages();
  }, [script]);

  // シーン管理
  useEffect(() => {
    if (!currentEntry || !isLoaded) return;

    if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
    }

    // エントリが変わった瞬間にテキストをリセット (State)
    setDisplayedText('');
    lastProcessedIndexRef.current = currentEntryIndex;

    if (currentEntry.background && imagesRef.current[currentEntry.background]) {
      const newBg = imagesRef.current[currentEntry.background];
      if (currentBackgroundRef.current !== newBg) {
        currentBackgroundRef.current = newBg;
        bgOpacityRef.current = 0;
        activeCharactersRef.current = {};
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
    } else if (currentEntry.type === "dialogue") {
        if (currentEntry.icon) {
            const img = imagesRef.current[currentEntry.icon];
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
    }

    // テキストタイピング
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

    return () => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
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

      // 終了フェードアウト
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

      // 1. 背景描画 (クリア)
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

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

      // 2. キャラクター描画
      Object.values(activeCharactersRef.current).forEach(char => {
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

      // 3. テキストボックス
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

      // 4. 名前
      const paddingX = conf.paddingX * dpr;
      const paddingY = conf.paddingY * dpr;
      ctx.textBaseline = 'top';

      if (currentEntry?.name) {
        const nameFontSize = conf.nameFontSize * dpr;
        ctx.fillStyle = '#81d4fa';
        ctx.font = `bold ${nameFontSize}px "Yu Gothic", "YuGothic", "sans-serif"`;
        ctx.fillText(currentEntry.name, margin + paddingX, boxY + paddingY);
      }

      // 5. テキスト
      const textFontSize = conf.fontSize * dpr;
      ctx.fillStyle = '#fff';
      ctx.font = `${textFontSize}px "Yu Gothic", "YuGothic", "sans-serif"`;
      const textX = margin + paddingX;
      const nameOffset = currentEntry?.name ? (isMobileMode ? 35 : 48) * dpr : 0;
      const textY = boxY + paddingY + nameOffset;
      const maxWidth = boxW - paddingX * 2;
      
      // バグ対策: 現在処理中のインデックスと描画ループが一致している場合のみテキストを描画
      // かつ、displayedText が空文字でなければ描画
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

      // 6. 終了フェードアウト用の黒ベタ被せ
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
  }, [isLoaded, currentEntryIndex, displayedText, isEnding, CONFIG.PC, CONFIG.MOBILE]);

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

    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(currentEntry.text || '');
      setIsTyping(false);
    } else if (currentEntryIndex < script.length - 1) {
      // 次へ行く前にテキストをリセット (同期性を高めるため)
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
          border: '2px solid #444'
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
        {!isLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontFamily: '"Yu Gothic", "YuGothic", "sans-serif"'
          }}>
            Loading Story...
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCanvas;
