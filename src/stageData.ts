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
    bossName: "二刀のオーク",
    bossImage: "/images/monster/1.png",
    bossDescription: "二本の刃を操るオーク。荒々しい連撃で獲物を追い詰める。",
    shopSkills: ["一閃", "果断", "待伏"],
    bossSkillAbbrs: "空一果一果",
  },
  {
    no: 2,
    name: "食料を探そう",
    bossName: "オオサソリ",
    bossImage: "/images/monster/2.png",
    bossDescription: "硬い甲殻と猛毒の尾を持つ巨大なサソリ。",
    shopSkills: ["崩技", "刺突"],
    bossSkillAbbrs: "崩崩待刺刺",
  },
  {
    no: 3,
    name: "狩りをしよう",
    bossName: "肉厚な馬",
    bossImage: "/images/monster/3.png",
    bossDescription: "人肉の味を覚えた狂暴な馬。その蹄は岩をも砕く。",
    shopSkills: ["搦手", "＋速"],
    bossSkillAbbrs: "搦待待果速",
  },
  {
    no: 4,
    name: "家を作ろう",
    bossName: "大木",
    bossImage: "/images/monster/4.png",
    bossDescription: "古くから島を見守る巨木。動かないが、その根は強固である。",
    shopSkills: ["防壁", "＋硬", "＋盾", ],
    bossSkillAbbrs: "空空刺硬空空刺硬",
  },
  {
    no: 5,
    name: "家が壊れた",
    bossName: "オークマスター",
    bossImage: "/images/monster/5.png",
    bossDescription: "オークたちの頂点に立つ熟練の戦士。隙のない攻防を見せる。",
    shopSkills: ["剣舞", "交錯", "＋強"],
    bossSkillAbbrs: "崩待防果速",
  },
  {
    no: 6,
    name: "魚を獲ろう",
    bossName: "肉厚な魚",
    bossImage: "/images/monster/6.png",
    bossDescription: "巨大な牙を持つ深海の捕食者。水陸両方で活動可能。",
    shopSkills: ["怒濤", "裏霞", "＋反"],
    bossSkillAbbrs: "搦搦果反一強",
  },
  {
    no: 7,
    name: "魔獣の襲撃",
    bossName: "リザードロード",
    bossImage: "/images/monster/7.png",
    bossDescription: "洞窟の深部に住むトカゲたちの王。冷酷な一撃を放つ。",
    shopSkills: ["呪詛", "疫病", "隠刃"],
    bossSkillAbbrs: "交一裏一裏剣",
  },
  {
    no: 8,
    name: "燃える海岸",
    bossName: "絶望のキマイラ",
    bossImage: "/images/monster/8.png",
    bossDescription: "炎を纏う異形の怪物。複数の頭から繰り出される攻撃は苛烈。",
    shopSkills: ["先制", "逆鱗", "覚悟"],
    bossSkillAbbrs: "疫硬搦硬刺怒硬",
  },
  {
    no: 9,
    name: "無人島地下鍾乳洞",
    bossName: "独裁者の庭園",
    bossImage: "/images/monster/9.png",
    bossDescription: "朽ち果てた洞窟で侵入者を待ち続ける、感情なき殺戮兵器。",
    shopSkills: ["雷火", "封印", "連撃"],
    bossSkillAbbrs: "先封待待連雷雷",
  },
  {
    no: 10,
    name: "島の秘密",
    bossName: "デス・スキャン",
    bossImage: "/images/monster/10.png",
    bossDescription: "実体を持たないエネルギーの集合体。対峙する者の能力を写し取る。",
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
    bossName: "無貌竜アノマ",
    bossImage: "/images/monster/12.png",
    bossDescription: "古の伝承に刻まれた翼なき竜。すべてを無に帰す力を持つ。",
    shopSkills: [],
    bossSkillAbbrs: "影影硬待硬雷硬交硬果",
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
