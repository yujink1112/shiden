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
  bgm?: string; // BGMファイル名 (effectタイプで使用)
  soundEffect?: string; // 効果音ファイル名 (effectタイプで使用)
  animation?: string; // アニメーション名
  still?: string; // スチル画像ファイル名
}

export type StoryScript = StoryEntry[];
