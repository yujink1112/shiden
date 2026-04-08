import React, { useState, useEffect } from 'react';
import { StoryEntry, StoryScript } from '../types/story';
import { database, getStorageUrl } from '../firebase';
import { ref, get } from "firebase/database";
import './Kamishibai.css'; // スタイルシートを後で作成

interface KamishibaiProps {
  script: StoryScript | null;
  text?: string;
  onEnd: () => void;
}

const Kamishibai: React.FC<KamishibaiProps> = ({ script, text, onEnd }) => {
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [characterImages, setCharacterImages] = useState<{ [key: string]: string }>({});
  const [backgroundImages, setBackgroundImages] = useState<{ [key: string]: string }>({});
  const [activeCharacters, setActiveCharacters] = useState<{[key in "left" | "center" | "right"]?: { name: string; image: string; focus: boolean; } | null }>({});
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);

  // 第1章などの単純なテキスト表示用のエントリを作成
  const effectiveScript: StoryScript = script || (text ? [{
      type: 'direction',
      text: text
  }] : []);

  useEffect(() => {
    const preloadAssets = async () => {
      if (effectiveScript.length === 0) {
        setIsLoaded(true);
        return;
      }

      setIsLoaded(false);
      const bgImages: { [key: string]: string } = {};
      const charImages: { [key: string]: string } = {};

      const loadTask = effectiveScript.map(async (entry) => {
        if (entry.background && entry.background !== "OFF" && entry.background !== "None") {
          const bgKey = entry.background;
          if (bgKey.startsWith("/")) {
            bgImages[bgKey] = bgKey;
          } else if (!bgImages[bgKey]) {
            try {
              const bgPathRef = ref(database, bgKey);
              const snapshot = await get(bgPathRef);
              const storagePath = snapshot.val();
              if (storagePath) {
                bgImages[bgKey] = getStorageUrl(storagePath);
              }
            } catch (error) {
              console.error(`Error fetching bg path for ${bgKey}:`, error);
            }
          }
        }

        const imageKey = (entry.type === "character" && entry.characterImage) || (entry.type === "dialogue" && entry.icon);
        if (imageKey && typeof imageKey === "string") {
          if (!charImages[imageKey]) {
            try {
              const characterPathRef = ref(database, `images/character/${imageKey.split(".")[0]}`);
              const snapshot = await get(characterPathRef);
              const storagePath = snapshot.val();
              if (storagePath) {
                charImages[imageKey] = getStorageUrl(storagePath);
              }
            } catch (error) {
              console.error(`Error fetching char path for ${imageKey}:`, error);
            }
          }
        }
      });

      await Promise.all(loadTask);

      // 実際の画像ファイルのロードを待機
      const allImageUrls = [...Object.values(bgImages), ...Object.values(charImages)];
      const imageLoadPromises = allImageUrls.map(url => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(url);
          img.onerror = () => resolve(url);
        });
      });

      await Promise.all(imageLoadPromises);
      setBackgroundImages(bgImages);
      setCharacterImages(charImages);
      setIsLoaded(true);
    };

    preloadAssets();
  }, [script, text]);

  const currentEntry = effectiveScript[currentEntryIndex];

  useEffect(() => {
    if (!isLoaded || !currentEntry) {
      if (isLoaded && effectiveScript.length > 0 && !currentEntry) onEnd();
      return;
    }

    if (currentEntry.background) {
      const url = backgroundImages[currentEntry.background];
      if (url) setCurrentBackground(url);
      else if (currentEntry.background.startsWith("/")) setCurrentBackground(currentEntry.background);
    }

    // activeCharacters の更新ロジック
    let newActiveCharacters = { ...activeCharacters };
    // 初期化（前のシーンのキャラクターをクリア）
    for (const pos in newActiveCharacters) {
      newActiveCharacters[pos as "left" | "center" | "right"] = null;
    }

    if (currentEntry.type === "character" && currentEntry.characterImage && currentEntry.position) {
      newActiveCharacters[currentEntry.position] = {
        name: currentEntry.name || "",
        image: currentEntry.characterImage,
        focus: currentEntry.focus === currentEntry.position,
      };
    } else if (currentEntry.type === "dialogue" && currentEntry.icon) {
      // 会話の場合、アイコンを話者として扱う。位置が指定されていればその位置を優先、なければ中央。
      const targetPosition: "left" | "center" | "right" = currentEntry.position || "center";
      newActiveCharacters[targetPosition] = {
        name: currentEntry.name || "",
        image: currentEntry.icon,
        focus: true,
      };

      // 話者以外のキャラクターのフォーカスを外す
      for (const pos in newActiveCharacters) {
        if (pos !== targetPosition && newActiveCharacters[pos as "left" | "center" | "right"]) {
          newActiveCharacters[pos as "left" | "center" | "right"]!.focus = false;
        }
      }
    }
    setActiveCharacters(newActiveCharacters);

    // テキスト表示のアニメーション
    if (currentEntry.text) {
      setIsTyping(true);
      let i = 0;
      setDisplayedText('');
      const typingInterval = setInterval(() => {
        setDisplayedText((prev) => prev + currentEntry.text![i]);
        i++;
        if (i === currentEntry.text!.length) {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 50); // タイピング速度
      return () => clearInterval(typingInterval);
    } else {
      setDisplayedText('');
      setIsTyping(false);
    }
  }, [currentEntryIndex, currentEntry, onEnd, activeCharacters, characterImages]);

  const handleNext = () => {
    if (isTyping) {
      // タイピング中はスキップして全文表示
      setDisplayedText(currentEntry.text || '');
      setIsTyping(false);
    } else if (currentEntryIndex < effectiveScript.length - 1) {
      setCurrentEntryIndex((prev) => prev + 1);
    } else {
      onEnd();
    }
  };

  if (!isLoaded || !currentEntry) {
    return (
      <div className="kamishibai-container loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backgroundColor: '#000' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/images/title/sailing_loop_32x32_fixed.gif" alt="Loading" style={{ width: '32px', height: '32px', marginBottom: '10px' }} />
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  // TODO: キャラクター画像、背景画像、フォーカス演出などの表示ロジックをここに追加

  return (
    <div className="kamishibai-container" onClick={handleNext}>
      {/* 背景画像 */}
      {currentBackground && (
        <img src={currentBackground} alt="background" className="kamishibai-background" />
      )}

      {/* キャラクター画像 */}
      <div className="kamishibai-characters">
        {Object.entries(activeCharacters).map(([position, character]) => {
          if (!character) return null;
          const imageUrl = characterImages[character.image];
          return imageUrl ? (
            <img
              key={position}
              src={imageUrl}
              alt={`character-${position}`}
              className={`kamishibai-character kamishibai-character-${position} ${character.focus ? 'focused' : ''}`}
            />
          ) : null;
        })}
      </div>

      {/* テキストボックス */}
      <div className="kamishibai-textbox">
        {currentEntry.name && <div className="kamishibai-name">{currentEntry.name}</div>}
        <div className="kamishibai-text">{displayedText}</div>
      </div>
    </div>
  );
};

export default Kamishibai;
