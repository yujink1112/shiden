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
  const [characterImages, setCharacterImages] = useState<{ [key: string]: string }>({});
  const [backgroundImages, setBackgroundImages] = useState<{ [key: string]: string }>({});
  const [activeCharacters, setActiveCharacters] = useState<{[key in "left" | "center" | "right"]?: { name: string; image: string; focus: boolean; } | null }>({});
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);

  // 第1章などの単純なテキスト表示用のエントリを作成
  const effectiveScript: StoryScript = script || (text ? [{
      type: 'direction',
      text: text
  }] : []);

  const currentEntry = effectiveScript[currentEntryIndex];

  useEffect(() => {
    if (!currentEntry) {
      if (effectiveScript.length > 0) onEnd();
      return;
    }

    // 背景画像のロード
    const loadBackgroundImage = async (bgKey: string) => {
      if (bgKey.startsWith("/")) {
        setCurrentBackground(bgKey);
        return;
      }
      if (!backgroundImages[bgKey]) {
        try {
          const bgPathRef = ref(database, bgKey);
          const snapshot = await get(bgPathRef);
          const storagePath = snapshot.val();
          if (storagePath) {
            const url = getStorageUrl(storagePath);
            setBackgroundImages((prev) => ({ ...prev, [bgKey]: url }));
            setCurrentBackground(url);
          } else {
            console.warn(`Background image path not found for key: ${bgKey}`);
          }
        } catch (error) {
          console.error(`Error loading background image ${bgKey}:`, error);
        }
      } else {
        setCurrentBackground(backgroundImages[bgKey]);
      }
    };

    if (currentEntry.background) {
      loadBackgroundImage(currentEntry.background);
    }
    const loadCharacterImage = async (imageKey: string) => {
      if (!characterImages[imageKey]) {
        try {
          // Realtime Databaseのパスは拡張子なしのファイル名とする
          const characterPathRef = ref(database, `images/character/${imageKey.split(".")[0]}`); 
          const snapshot = await get(characterPathRef);
          const storagePath = snapshot.val();
          if (storagePath) {
            const url = getStorageUrl(storagePath);
            setCharacterImages((prev) => ({ ...prev, [imageKey]: url }));
          } else {
            console.warn(`Character image path not found in Realtime Database for key: ${imageKey}`);
          }
        } catch (error) {
          console.error(`Error loading character image ${imageKey}:`, error);
        }
      }
    };

    // activeCharacters の更新ロジック
    let newActiveCharacters = { ...activeCharacters };
    // 初期化（前のシーンのキャラクターをクリア）
    for (const pos in newActiveCharacters) {
      newActiveCharacters[pos as "left" | "center" | "right"] = null;
    }

    if (currentEntry.type === "character" && currentEntry.characterImage && currentEntry.position) {
      loadCharacterImage(currentEntry.characterImage);
      newActiveCharacters[currentEntry.position] = {
        name: currentEntry.name || "",
        image: currentEntry.characterImage,
        focus: currentEntry.focus === currentEntry.position,
      };
    } else if (currentEntry.type === "dialogue" && currentEntry.icon) {
      loadCharacterImage(currentEntry.icon);
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

  if (!currentEntry) {
    return null; // またはローディングスピナーなど
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
