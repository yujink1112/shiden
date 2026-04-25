import { StoryScript, StoryEntry } from './story';

export interface StoryAssets {
  characters: {
    [name: string]: {
      image: string;
      position?: "left" | "center" | "right";
    };
  };
  backgrounds: {
    [name: string]: string;
  };
  animations: {
    [name: string]: string;
  };
  stills: {
    [name: string]: string;
  };
  bgm: {
    [name: string]: string;
  };
}

export const parseStoryText = (text: string, assets: StoryAssets): StoryScript => {
  const lines = text.split('\n');
  const script: StoryScript = [];
  let currentBackground = "";
  let currentBackgroundMobile: string | undefined = undefined;
  let currentBackgroundMobileOffsetX: number | undefined = undefined;
  let currentSepia = false;
  let pendingTextStyle: Pick<StoryEntry, "textAlign" | "typingSpeed" | "letterSpacing"> | null = null;

  const parseNumericOption = (value: string | undefined): number => {
    if (!value) return NaN;
    const normalized = value.replace(/[０-９．]/g, char => {
      if (char === '．') return '.';
      return String(char.charCodeAt(0) - '０'.charCodeAt(0));
    });
    return parseFloat(normalized);
  };

  const applyPendingTextStyle = (entry: StoryEntry): StoryEntry => {
    if (!pendingTextStyle || !entry.text) return entry;
    const styledEntry = {
      ...entry,
      ...pendingTextStyle
    };
    pendingTextStyle = null;
    return styledEntry;
  };

  const withCurrentBackgroundOptions = (entry: StoryEntry): StoryEntry => ({
    ...entry,
    backgroundMobile: currentBackgroundMobile,
    backgroundMobileOffsetX: currentBackgroundMobileOffsetX
  });

  const resolveBackground = (nameOrPath: string): string | undefined => {
    if (assets.backgrounds[nameOrPath]) {
      return assets.backgrounds[nameOrPath];
    }

    for (const [bgName, bgFile] of Object.entries(assets.backgrounds)) {
      if (nameOrPath === bgName) {
        return bgFile;
      }
    }

    if (
      nameOrPath.startsWith("/") ||
      nameOrPath.startsWith("http") ||
      nameOrPath.startsWith("images/") ||
      /\.(png|jpg|jpeg|gif|webp)$/i.test(nameOrPath)
    ) {
      return nameOrPath;
    }

    return undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // セピア設定: @SEPIA ON/OFF
    if (line.toUpperCase() === '@SEPIA ON') {
      currentSepia = true;
      continue;
    }
    if (line.toUpperCase() === '@SEPIA OFF') {
      currentSepia = false;
      continue;
    }

    // 発言パネル内テキスト演出: @PANEL CENTER_SLOW [typingSpeedMs] [letterSpacingPx]
    // 日本語指定: @中央セリフ [typingSpeedMs] [letterSpacingPx]
    if (line.toUpperCase().startsWith('@PANEL ') || line.startsWith('@中央セリフ')) {
      const parts = line.split(/\s+/);
      const mode = line.startsWith('@中央セリフ') ? 'CENTER_SLOW' : (parts[1] || '').toUpperCase();
      if (mode === 'RESET') {
        pendingTextStyle = null;
        continue;
      }
      if (mode === 'CENTER_SLOW') {
        const speedPart = line.startsWith('@中央セリフ') ? parts[1] : parts[2];
        const spacingPart = line.startsWith('@中央セリフ') ? parts[2] : parts[3];
        const typingSpeed = Number.parseFloat(speedPart || '');
        const letterSpacing = Number.parseFloat(spacingPart || '');
        pendingTextStyle = {
          textAlign: "center",
          typingSpeed: Number.isFinite(typingSpeed) ? typingSpeed : 120,
          letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 10
        };
      }
      continue;
    }

    // キャラクター消去: /消去/@position
    if (line.startsWith('/消去')) {
      let position: "left" | "center" | "right" = "center";
      if (line.includes('@')) {
        const parts = line.split('@');
        const posStr = parts[1].toLowerCase().trim();
        if (posStr === 'left' || posStr === 'center' || posStr === 'right') {
          position = posStr as "left" | "center" | "right";
        }
      }
      script.push({
        type: "clearCharacter",
        position: position,
        background: currentBackground,
        backgroundMobile: currentBackgroundMobile,
        backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
        sepia: currentSepia
      });
      continue;
    }

    // スチル指定: <スチル名>
    if (line.startsWith('<') && line.endsWith('>')) {
      const stillName = line.substring(1, line.length - 1);
      if (stillName === "消去") {
        script.push({
          type: "effect",
          still: "none",
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia
        });
        continue;
      }
      if (assets.stills && assets.stills[stillName]) {
        script.push({
          type: "effect",
          still: assets.stills[stillName],
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia
        });
        continue;
      }
    }

    // BGM停止: #OFF
    if (line === '#OFF') {
      script.push({
        type: "effect",
        bgm: "OFF",
        background: currentBackground,
        backgroundMobile: currentBackgroundMobile,
        backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
        sepia: currentSepia
      });
      continue;
    }

    // BGMフェードアウト: #FADEOUT N
    if (line.startsWith('#FADEOUT')) {
      const parts = line.split(' ');
      const seconds = parts.length > 1 ? parseFloat(parts[1]) : 2;
      script.push({
        type: "effect",
        bgm: "OFF",
        duration: seconds * 1000,
        background: currentBackground,
        backgroundMobile: currentBackgroundMobile,
        backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
        sepia: currentSepia
      });
      continue;
    }

    // スリープ: $SLEEP N
    if (line.startsWith('$SLEEP')) {
      const parts = line.split(' ');
      const seconds = parts.length > 1 ? parseFloat(parts[1]) : 1;
      script.push({
        type: "effect",
        duration: seconds * 1000,
        background: currentBackground,
        backgroundMobile: currentBackgroundMobile,
        backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
        sepia: currentSepia
      });
      continue;
    }

    // BGM指定: #<BGM名>
    if (line.startsWith('#<') && line.endsWith('>')) {
      const bgmName = line.substring(2, line.length - 1);
      script.push({
        type: "effect",
        bgm: bgmName,
        background: currentBackground,
        backgroundMobile: currentBackgroundMobile,
        backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
        sepia: currentSepia
      });
      continue;
    }

    // 背景変更: 《...》
    if (line.startsWith('《') && line.endsWith('》')) {
      const rawContent = line.substring(1, line.length - 1).trim();
      let content = rawContent;
      let nextBackgroundMobile: string | undefined = undefined;
      let nextBackgroundMobileOffsetX: number | undefined = undefined;
      const mobileBgOptionPattern = /\s*@(mobileBg|spBg|スマホ背景)\s*=\s*("[^"]+"|「[^」]+」|[^\s@]+)/gi;
      content = content.replace(mobileBgOptionPattern, (_match, _name, value) => {
        const mobileBgName = value.replace(/^["「]|["」]$/g, '').trim();
        if (mobileBgName) {
          nextBackgroundMobile = resolveBackground(mobileBgName);
        }
        return "";
      }).trim();
      const optionPattern = /\s*@(mobileX|spX|スマホX)\s*=\s*([+-]?(?:\d*\.\d+|\d+|[０-９]*．[０-９]+|[０-９]+))/gi;
      content = content.replace(optionPattern, (_match, _name, value) => {
        const offset = parseNumericOption(value);
        if (Number.isFinite(offset)) {
          nextBackgroundMobileOffsetX = offset;
        }
        return "";
      }).trim();
      
      if (content === "OFF" || content === "None" || content === "消去") {
        currentBackground = "";
        currentBackgroundMobile = undefined;
        currentBackgroundMobileOffsetX = undefined;
        script.push({
          type: "background",
          background: "OFF",
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia
        });
        continue;
      }

      let targetBg: string | undefined = "";
      targetBg = resolveBackground(content);

      if (targetBg) {
        currentBackground = targetBg;
        currentBackgroundMobile = nextBackgroundMobile;
        currentBackgroundMobileOffsetX = nextBackgroundMobileOffsetX;
        script.push({
          type: "background",
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia
        });
      }
      continue;
    }

    // アニメーション・演出指示: [アニメ名] または 【...】
    if (line.startsWith('[') && line.endsWith(']')) {
      const animText = line.substring(1, line.length - 1).trim();
      const animParts = animText.split(/\s+/);
      const maybeDuration = animParts.length > 1 ? parseNumericOption(animParts[animParts.length - 1]) : NaN;
      const hasDuration = Number.isFinite(maybeDuration);
      const animName = hasDuration ? animParts.slice(0, -1).join(' ') : animText;

      if (assets.animations[animName]) {
        script.push({
          type: "effect",
          animation: assets.animations[animName],
          duration: hasDuration ? maybeDuration * 1000 : undefined,
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia
        });
        continue;
      }
    }

    // ト書き演出指示: 【...】 または 【...】$duration,fadeDuration
    if (line.startsWith('【') && line.includes('】')) {
      const closingBracketIndex = line.indexOf('】');
      const content = line.substring(1, closingBracketIndex);
      const remaining = line.substring(closingBracketIndex + 1).trim();
      
      let duration: number | undefined = undefined;
      let fadeDuration: number | undefined = undefined;
      
      if (remaining.startsWith('$')) {
        const parts = remaining.substring(1).split(',');
        if (parts.length >= 1) duration = parseFloat(parts[0]);
        if (parts.length >= 2) fadeDuration = parseFloat(parts[1]);
      }

      script.push(applyPendingTextStyle(withCurrentBackgroundOptions({
        type: "direction",
        text: content,
        duration: duration,
        fadeDuration: fadeDuration,
        background: currentBackground,
        sepia: currentSepia
      })));
      continue;
    }

    // 会話: 名前(表情)@位置 \n 「セリフ」
    // または キャラクター登場を伴うト書き: 名前(表情)@位置 \n 【ト書き】
    const nextLine = i + 1 < lines.length ? lines[i+1].trim() : "";
    const isPotentialName = line.includes('@') || !!assets.characters[line.split('@')[0].split('(')[0]];
    
    if (isPotentialName && (nextLine.startsWith('「') || nextLine.startsWith('【'))) {
      let rawName = line;
      let position: "left" | "center" | "right" | undefined = undefined;
      let expression: string | undefined = undefined;
      let scale: number | undefined = undefined;
      let offsetY: number | undefined = undefined;

      // 倍率とYオフセットの抽出 (*1.2,50 など)
      if (rawName.includes('*')) {
        const parts = rawName.split('*');
        rawName = parts[0];
        const scaleAndOffset = parts[1].split(',');
        scale = parseFloat(scaleAndOffset[0]);
        if (scaleAndOffset.length > 1) {
          offsetY = parseFloat(scaleAndOffset[1]);
        }
      }

      // 位置の抽出 (@left など)
      if (rawName.includes('@')) {
        const parts = rawName.split('@');
        rawName = parts[0];
        const posStr = parts[1].toLowerCase();
        if (posStr === 'left' || posStr === 'center' || posStr === 'right') {
          position = posStr as any;
        }
      }

      // 表情の抽出 (名前(笑) など)
      const expressionMatch = rawName.match(/(.+)\((.+)\)$/);
      let displayName = rawName;
      let searchName = rawName;

      if (expressionMatch) {
        searchName = expressionMatch[1]; // assets検索用の名前
        displayName = expressionMatch[1]; // 表示用の名前（括弧を除去）
        expression = expressionMatch[2]; // 表情
      }

      const charDef = assets.characters[searchName];
      let entry: StoryEntry;

      if (nextLine.startsWith('「')) {
        const dialogue = nextLine.substring(1, nextLine.length - 1);
        entry = {
          type: "dialogue",
          name: displayName,
          text: dialogue,
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia,
          scale: scale,
          offsetY: offsetY
        };
      } else {
        // 【ト書き】のケース
        const closingBracketIndex = nextLine.indexOf('】');
        const content = nextLine.substring(1, closingBracketIndex);
        const remaining = nextLine.substring(closingBracketIndex + 1).trim();
        
        let duration: number | undefined = undefined;
        let fadeDuration: number | undefined = undefined;
        
        if (remaining.startsWith('$')) {
          const parts = remaining.substring(1).split(',');
          if (parts.length >= 1) duration = parseFloat(parts[0]);
          if (parts.length >= 2) fadeDuration = parseFloat(parts[1]);
        }

        entry = {
          type: "direction",
          name: displayName,
          text: content,
          duration: duration,
          fadeDuration: fadeDuration,
          background: currentBackground,
          backgroundMobile: currentBackgroundMobile,
          backgroundMobileOffsetX: currentBackgroundMobileOffsetX,
          sepia: currentSepia,
          scale: scale,
          offsetY: offsetY
        };
      }

      if (charDef) {
        let imageName = charDef.image;
        if (expression) {
          const dotIndex = imageName.lastIndexOf('.');
          if (dotIndex !== -1) {
            imageName = imageName.substring(0, dotIndex) + "_" + expression + imageName.substring(dotIndex);
          } else {
            imageName = imageName + "_" + expression;
          }
        }
        
        entry.icon = imageName;
        entry.characterImage = imageName;
        entry.position = position || charDef.position || "center";
      } else if (position) {
        entry.position = position;
      }

      script.push(applyPendingTextStyle(entry));
      i++;
      continue;
    }

    // モノローグまたは地の文
    script.push(applyPendingTextStyle(withCurrentBackgroundOptions({
      type: "monologue",
      text: line,
      background: currentBackground,
      sepia: currentSepia
    })));
  }

  return script;
};
