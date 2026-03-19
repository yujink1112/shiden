import { SkillDetail, getSkillByAbbr, ALL_SKILLS } from './skillsData';

export interface StageConfig {
  no: number;
  chapter?: number;
  stage?: number;
  battle?: number;
  name: string;
  bossName: string;
  bossImage: string;
  bossDescription: string;
  shopSkills: string[]; // スキル名
  bossSkillAbbrs: string; // 略称文字列
  backgroundImage?: string;
  bgm?: string;
}

let STAGE_DATA: StageConfig[] = [];

export const setStageData = (data: StageConfig[]) => {
  STAGE_DATA = data;
};

export { STAGE_DATA };

export interface KenjuConfig {
  name: string;
  title: string;
  description: string;
  background: string,
  image: string;
  skillAbbrs: string;
  medalId?: string; // 称号・メダルのID
}

let KENJU_DATA: KenjuConfig[] = [];

export const setKenjuData = (data: KenjuConfig[]) => {
  KENJU_DATA = data;
};

export { KENJU_DATA };

export const getAvailableSkillsUntilStage = (stageNo: number): SkillDetail[] => {
    const skillNames = new Set<string>();
    // Stage 1のスキルを含めるために、i <= stageNo かつ STAGE_DATAが1-indexedか0-indexedかを確認
    // データの定義は0番目がStage 1, 1番目がStage 2...となっているので
    for (let i = 0; i < stageNo; i++) {
        if (STAGE_DATA[i]) {
            STAGE_DATA[i].shopSkills.forEach(name => skillNames.add(name));
        }
    }
    // 基本スキルも加える
    return ALL_SKILLS.filter(s => skillNames.has(s.name) || s.name === "一閃");
};

export const getSkillByName = (name: string): SkillDetail | undefined => {
    return ALL_SKILLS.find(s => s.name === name);
};

export interface StageContext {
  stageCycle: number;
  kenjuBoss?: {
    name: string;
    title: string;
    description: string;
    background: string;
    image: string;
    skills: SkillDetail[];
    isCustom?: boolean;
    masterUid?: string;
    userName?: string;
  };
  selectedPlayerSkills: string[];
  midEnemyData: { [stage: number]: string[] };
  userName?: string;
  chapter2SubStage?: number;
}

export interface StageProcessor {
  getBattleCount(): number;
  getEnemyName(index: number, context: StageContext): string;
  getEnemySkills(index: number, context: StageContext): SkillDetail[];
  onVictory(context: StageContext): { canGoToNext: boolean; showReward: boolean; pendingClear?: boolean; isVictory?: boolean };
  onFailure(context: StageContext): { canGoToNext: boolean; showReward: boolean; pendingClear?: boolean; isVictory?: boolean };
  getStageTitle(context: StageContext): string;
  getStageDescription(context: StageContext): string;
  getBackgroundImage(context: StageContext): string;
  getBossImage(context: StageContext): string | undefined;
  getBossDescription(context: StageContext): string;
  getBossImageStyle(context: StageContext, isMobile: boolean, type: 'back' | 'battle' | 'sidebar'): React.CSSProperties;
  getEnemyTitle?(context: StageContext): string;
  getWinThreshold?(context: StageContext): number;
  shouldShowWinRate?(context: StageContext): boolean;
  onVictoryEffect?(context: StageContext, triggerConfetti: () => void): void;
}
