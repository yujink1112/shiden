import { SkillDetail, getSkillByAbbr, ALL_SKILLS } from './skillsData';

export interface StageConfig {
  no: number;
  name: string;
  bossName: string;
  shopSkills: string[]; // スキル名
  bossSkillAbbrs: string; // 略称文字列
}

export const STAGE_DATA: StageConfig[] = [
  {
    no: 1,
    name: "生き残ろう",
    bossName: "ゴブリンリーダー",
    shopSkills: ["一閃", "果断", "待伏"],
    bossSkillAbbrs: "空空一空果", // 空白　空白　一閃　空白　果断
  },
  {
    no: 2,
    name: "食料を探そう",
    bossName: "大鹿",
    shopSkills: ["崩技", "刺突", "＋速"],
    bossSkillAbbrs: "待待待刺速", // 待伏　待伏　待伏　刺突　+速
  },
  {
    no: 3,
    name: "家を作ろう",
    bossName: "大木",
    shopSkills: ["防壁", "＋盾", "＋硬"],
    bossSkillAbbrs: "空空空空刺硬空空空空", // 空20個
  },
  {
    no: 4,
    name: "家が壊れた",
    bossName: "ボスゴブリン",
    shopSkills: ["剣舞", "交錯", "裏霞", "＋強"],
    bossSkillAbbrs: "崩待防果強", // 崩技　待伏　防壁　果断　+強
  },
  {
    no: 5,
    name: "ゴブリンの洞窟",
    bossName: "リザードロード",
    shopSkills: ["呪詛", "疫病", "連撃", "搦手"],
    bossSkillAbbrs: "交一裏一裏剣", // 交錯　一閃　裏霞　一閃　裏霞　剣舞 (6つ)
  },
  {
    no: 6,
    name: "燃える海岸",
    bossName: "絶望のキマイラ",
    shopSkills: ["怒濤", "逆鱗", "覚悟", "＋反"],
    bossSkillAbbrs: "疫硬搦硬刺怒", // 疫病　+硬　搦手　+硬　刺突　怒涛 (6つ)
  },
  {
    no: 7,
    name: "無人島地下鍾乳洞",
    bossName: "レンダリングプラズマ",
    shopSkills: ["影討", "隠刃", "雷火", "玉響", "封印"],
    bossSkillAbbrs: "逆逆逆弱", // 逆鱗　逆鱗　逆鱗　弱撃(コピー?) -> コピーはないので弱
  },
  {
    no: 8,
    name: "宇多",
    bossName: "剣獣",
    shopSkills: ["先制", "紫電", "＋錬", "燐光", "無想"],
    bossSkillAbbrs: "無覚交果反燐玉紫強", // 9つ
  },
  {
    no: 9,
    name: "生き残ろう",
    bossName: "無貌竜アノマ",
    shopSkills: [],
    bossSkillAbbrs: "一閃果断待伏崩技刺突", // 適当な詰め
  },
];

// 補助的な追加データ（テキストの下の方にあったもの）
export const SPECIAL_BOSSES = [
    { name: "ステュムパリデス", skills: "先交燐果錬" },
    { name: "オピーオーン", skills: "隠隠隠隠剣" },
    { name: "エディンム", skills: "連逆崩紫盾" },
];

export const getAvailableSkillsUntilStage = (stageNo: number): SkillDetail[] => {
    const skillNames = new Set<string>();
    for (let i = 0; i < stageNo; i++) {
        STAGE_DATA[i].shopSkills.forEach(name => skillNames.add(name));
    }
    // 基本スキルも加える? (弱撃など)
    return ALL_SKILLS.filter(s => skillNames.has(s.name));
};

export const getSkillByName = (name: string): SkillDetail | undefined => {
    return ALL_SKILLS.find(s => s.name === name);
};
