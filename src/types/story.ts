export interface StoryEntry {
  type: "monologue" | "dialogue" | "direction" | "background" | "character" | "effect" | "clearCharacter";
  text?: string; // モノローグ、会話、演出指示などで使用
  name?: string; // 会話のキャラクター名
  icon?: string; // 会話のキャラクターアイコン (画像ファイル名)
  position?: "left" | "center" | "right"; // キャラクターの表示位置 (dialogue, characterタイプで使用)
  characterImage?: string; // キャラクターの画像ファイル名 (characterタイプで使用)
  expression?: string; // キャラクターの表情 (characterタイプで使用、例えば "normal", "smile", "angry" など)
  focus?: "none" | "left" | "center" | "right"; // どのキャラクターにフォーカスするか (中央アップ演出用)
  background?: string; // 背景画像ファイル名 (backgroundタイプで使用)
  backgroundMobile?: string; // スマホ表示時だけ差し替える背景画像ファイル名
  backgroundMobileOffsetX?: number; // スマホ表示時だけ背景を左右にずらす量(px)
  bgm?: string; // BGMファイル名 (effectタイプで使用)
  soundEffect?: string; // 効果音ファイル名 (effectタイプで使用)
  animation?: string; // アニメーション名
  still?: string; // スチル画像ファイル名
  duration?: number; // 演出の持続時間 (ミリ秒)
  fadeDuration?: number; // BGMなどのフェードアウト時間 (ミリ秒)
  sepia?: boolean; // セピア調にするかどうか
  scale?: number; // キャラクターやスチルの拡大率上書き
  offsetY?: number; // キャラクターのY位置オフセット
  textAlign?: "left" | "center"; // 発言パネル内のテキスト配置
  typingSpeed?: number; // 1文字ごとの表示間隔 (ミリ秒)
  letterSpacing?: number; // 発言パネル内の字間 (px)
}

export type StoryScript = StoryEntry[];

export interface CreditIllustration {
  image: string;
  startTime: number; // スクロール開始からの経過時間(ms) または スクロールの位置
  duration?: number; // 表示時間
}

export interface CreditSpeedProfile {
  scrollSpeedFactor?: number;
  illustrationSpeedFactor?: number;
}

export interface CreditTypographyProfile {
  afterstoryTitleFontSize?: number;
  afterstoryTextFontSize?: number;
}

export interface CreditSection {
  type: "title" | "role" | "afterstory" | "text" | "space";
  title?: string;
  role?: string;
  names?: string[];
  content?: string;
  text?: string;
  icon?: string; // キャラクターアイコン
  height?: number;
}

export interface CreditsData {
  illustrations: CreditIllustration[];
  sections: CreditSection[];
  scrollSpeed?: number;
  bgm?: string;
  speedProfile?: {
    mobile?: CreditSpeedProfile;
    desktop?: CreditSpeedProfile;
  };
  typographyProfile?: {
    mobile?: CreditTypographyProfile;
    desktop?: CreditTypographyProfile;
  };
}
