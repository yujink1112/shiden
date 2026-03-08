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

    // ト書き演出指示: 【...】
    if (line.startsWith('【') && line.endsWith('】')) {
      const content = line.substring(1, line.length - 1);
      script.push({
        type: "direction",
        text: content,
        background: currentBackground
      });
      continue;
    }

    // 会話: 名前(表情)@位置 \n 「セリフ」
    if (i + 1 < lines.length && lines[i+1].trim().startsWith('「')) {
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

      const dialogue = lines[i+1].trim().substring(1, lines[i+1].trim().length - 1);
      const charDef = assets.characters[searchName];

      const entry: StoryEntry = {
        type: "dialogue",
        name: displayName,
        text: dialogue,
        background: currentBackground
      };

      if (charDef) {
        let imageName = charDef.image;
        if (expression) {
          // 画像名が "remiel.png" の場合、"remiel_smile.png" のように変換を試みる
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
