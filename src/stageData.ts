import { SkillDetail, getSkillByAbbr, ALL_SKILLS } from './skillsData';

export interface StageConfig {
  no: number;
  name: string;
  bossName: string;
  bossImage: string;
  bossDescription: string;
  shopSkills: string[]; // スキル名
  bossSkillAbbrs: string; // 略称文字列
}

export const STAGE_DATA: StageConfig[] = [
  {
    no: 1,
    name: "生き残ろう",
    bossName: "凶暴なサル",
    bossImage: "/images/monster/1.png",
    bossDescription: "歯をカチカチして威嚇している。怖い。",
    shopSkills: ["一閃", "刺突", "待伏"],
    bossSkillAbbrs: "空一刺一刺",
  },
  {
    no: 2,
    name: "食料を探そう",
    bossName: "オオサソリ",
    bossImage: "/images/monster/2.png",
    bossDescription: "食べられない……。",
    shopSkills: ["崩技", "果断"],
    bossSkillAbbrs: "崩崩待刺刺",
  },
  {
    no: 3,
    name: "狩りをしよう",
    bossName: "肉厚な馬",
    bossImage: "/images/monster/3.png",
    bossDescription: "おいしそう！！すごい！！おいしそう！！",
    shopSkills: ["搦手", "＋速"],
    bossSkillAbbrs: "搦待待果速",
  },
  {
    no: 4,
    name: "家を作ろう",
    bossName: "ジュロウシ",
    bossImage: "/images/monster/4.png",
    bossDescription: "見るからに由緒がある。",
    shopSkills: ["防壁", "＋硬", "＋盾", ],
    bossSkillAbbrs: "空空刺硬空空刺硬",
  },
  {
    no: 5,
    name: "家が壊れた",
    bossName: "ゴリラマスター",
    bossImage: "/images/monster/5.png",
    bossDescription: "洞窟の主。仁義なき戦いだ。",
    shopSkills: ["剣舞", "交錯", "＋強"],
    bossSkillAbbrs: "崩待防果速",
  },
  {
    no: 6,
    name: "魚を獲ろう",
    bossName: "肉厚な魚",
    bossImage: "/images/monster/6.png",
    bossDescription: "仲間と食べる魚は絶対においしい。",
    shopSkills: ["怒濤", "裏霞", "＋反"],
    bossSkillAbbrs: "搦搦果反一強",
  },
  {
    no: 7,
    name: "魔獣の襲撃",
    bossName: "リザードロード",
    bossImage: "/images/monster/7.png",
    bossDescription: "悪夢にようこそ。",
    shopSkills: ["呪詛", "疫病", "隠刃"],
    bossSkillAbbrs: "交一裏一裏剣",
  },
  {
    no: 8,
    name: "燃える海岸",
    bossName: "絶望のキマイラ",
    bossImage: "/images/monster/8.png",
    bossDescription: "絶対に負けられない。あなたは剣を取る。",
    shopSkills: ["先制", "逆鱗", "覚悟"],
    bossSkillAbbrs: "疫硬搦硬刺怒速",
  },
  {
    no: 9,
    name: "無人島地下鍾乳洞",
    bossName: "独裁者の庭園",
    bossImage: "/images/monster/9.png",
    bossDescription: "殺戮兵器は邪悪に微笑む。",
    shopSkills: ["雷火", "封印", "連撃"],
    bossSkillAbbrs: "先封待待連雷雷",
  },
  {
    no: 10,
    name: "島の秘密",
    bossName: "レンダリングダスト",
    bossImage: "/images/monster/10.png",
    bossDescription: "弱点なんて分からないよ。",
    shopSkills: ["紫電", "影討","玉響"],
    bossSkillAbbrs: "逆逆逆", // ＋自分の構成
  },
  {
    no: 11,
    name: "宇多",
    bossName: "剣獣",
    bossImage: "/images/monster/11.png",
    bossDescription: "かつて剣に全てを捧げた者達がいた。",
    shopSkills: ["＋錬", "無想","燐光"],
    bossSkillAbbrs: "無覚交果反燐玉紫強",
  },
  {
    no: 12,
    name: "生き残ろう",
    bossName: "アノマ",
    bossImage: "/images/monster/12.png",
    bossDescription: "ハハハハハハハハハハハハハ！！！",
    shopSkills: [],
    bossSkillAbbrs: "影影硬待硬雷硬交硬一",
  },
];

// 補助的な追加データ（テキストの下の方にあったもの）
export const SPECIAL_BOSSES = [
    { name: "ステュムパリデス", skills: "先交燐果錬" },
    { name: "オピーオーン", skills: "隠隠隠隠剣" },
    { name: "エディンム", skills: "逆崩連紫盾" },
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
