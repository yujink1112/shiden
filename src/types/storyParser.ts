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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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
        background: currentBackground
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
          background: currentBackground
        });
        continue;
      }
      if (assets.stills && assets.stills[stillName]) {
        script.push({
          type: "effect",
          still: assets.stills[stillName],
          background: currentBackground
        });
        continue;
      }
    }

    // BGM停止: #OFF
    if (line === '#OFF') {
      script.push({
        type: "effect",
        bgm: "OFF",
        background: currentBackground
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
        background: currentBackground
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
        background: currentBackground
      });
      continue;
    }

    // BGM指定: #<BGM名>
    if (line.startsWith('#<') && line.endsWith('>')) {
      const bgmName = line.substring(2, line.length - 1);
      script.push({
        type: "effect",
        bgm: bgmName,
        background: currentBackground
      });
      continue;
    }

    // 背景変更: 《...》
    if (line.startsWith('《') && line.endsWith('》')) {
      const content = line.substring(1, line.length - 1);
      
      let targetBg = "";
      if (assets.backgrounds[content]) {
        targetBg = assets.backgrounds[content];
      } else {
        for (const [bgName, bgFile] of Object.entries(assets.backgrounds)) {
          if (content === bgName) {
            targetBg = bgFile;
            break;
          }
        }
      }

      if (targetBg) {
        currentBackground = targetBg;
        script.push({
          type: "background",
          background: currentBackground
        });
      }
      continue;
    }

    // アニメーション・演出指示: [アニメ名] または 【...】
    if (line.startsWith('[') && line.endsWith(']')) {
      const animName = line.substring(1, line.length - 1);
      if (assets.animations[animName]) {
        script.push({
          type: "effect",
          animation: assets.animations[animName],
          background: currentBackground
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

      script.push({
        type: "direction",
        text: content,
        duration: duration,
        fadeDuration: fadeDuration,
        background: currentBackground
      });
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
          background: currentBackground
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
          background: currentBackground
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

      script.push(entry);
      i++;
      continue;
    }

    // モノローグまたは地の文
    script.push({
      type: "monologue",
      text: line,
      background: currentBackground
    });
  }

  return script;
};
