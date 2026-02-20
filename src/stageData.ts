import { SkillDetail, getSkillByAbbr, ALL_SKILLS } from './skillsData';

export interface StageConfig {
  no: number;
  name: string;
  bossName: string;
  bossImage: string;
  bossDescription: string;
  shopSkills: string[]; // スキル名
  bossSkillAbbrs: string; // 略称文字列
  chapter?: number;
  stageInChapter?: number;
}

export const STAGE_DATA: StageConfig[] = [
  {
    no: 1,
    name: "生き残ろう",
    bossName: "凶暴なサル",
    bossImage: "/images/monster/1.png",
    bossDescription: "歯をカチカチして威嚇している。怖い。",
    shopSkills: ["一閃", "刺突", "崩技"],
    bossSkillAbbrs: "空一刺一刺",
  },
  {
    no: 2,
    name: "食料を探そう",
    bossName: "オオサソリ",
    bossImage: "/images/monster/2.png",
    bossDescription: "食べられない……。",
    shopSkills: ["搦手", "果断"],
    bossSkillAbbrs: "搦崩搦刺刺",
  },
  {
    no: 3,
    name: "狩りをしよう",
    bossName: "肉厚な馬",
    bossImage: "/images/monster/3.png",
    bossDescription: "おいしそう！！すごい！！おいしそう！！",
    shopSkills: ["待伏", "＋速"],
    bossSkillAbbrs: "崩待待果速",
  },
  {
    no: 4,
    name: "家を作ろう",
    bossName: "古々考古硬木",
    bossImage: "/images/monster/4.png",
    bossDescription: "見たこともないが由緒がありそうだ。",
    shopSkills: ["防壁", "＋硬", "＋盾"],
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
    bossSkillAbbrs: "一交裏一裏剣",
  },
  {
    no: 8,
    name: "燃える海岸",
    bossName: "絶望のキマイラ",
    bossImage: "/images/monster/8.png",
    bossDescription: "絶対に負けられない。あなたは剣を取る。",
    shopSkills: ["先制", "逆鱗", "覚悟"],
    bossSkillAbbrs: "疫硬搦硬刺怒硬",
  },
  {
    no: 9,
    name: "無人島地下鍾乳洞",
    bossName: "独裁者の庭園",
    bossImage: "/images/monster/9.png",
    bossDescription: "殺戮兵器は邪悪に微笑む。",
    shopSkills: ["雷火", "封印", "連撃"],
    bossSkillAbbrs: "先待待封連雷雷",
  },
  {
    no: 10,
    name: "精霊の森",
    bossName: "レンダリングダスト",
    bossImage: "/images/monster/10.png",
    bossDescription: "自分自身に打ち勝つのよ！",
    shopSkills: ["紫電", "影討","玉響"],
    bossSkillAbbrs: "逆逆逆", // ＋自分の構成
  },
  {
    no: 11,
    name: "＜串＞",
    bossName: "剣獣",
    bossImage: "/images/monster/11.png",
    bossDescription: "かつて剣に全てを捧げた者達がいた。",
    shopSkills: ["＋錬", "無想","燐光"],
    bossSkillAbbrs: "無覚交果反玉連紫盾",
  },
  {
    no: 12,
    name: "生き残ろう",
    bossName: "アノマ",
    bossImage: "/images/monster/12.png",
    bossDescription: "「ハハハハハ！！ハハハハハハハハハ！！！」 ",
    shopSkills: [],
    bossSkillAbbrs: "影影硬逆燐一雷反交怒",
  },
  { no: 13, chapter: 1, stageInChapter: 1, name: "1-1", bossName: "凶暴なサル", bossImage: "/images/monster/1.png", bossDescription: "再会の時。", shopSkills: [], bossSkillAbbrs: "空一刺一刺" },
  { no: 14, chapter: 1, stageInChapter: 2, name: "1-2", bossName: "凶暴なサル", bossImage: "/images/monster/1.png", bossDescription: "再会の時。", shopSkills: [], bossSkillAbbrs: "空一刺一刺" },
  { no: 15, chapter: 2, stageInChapter: 1, name: "2-1", bossName: "オオサソリ", bossImage: "/images/monster/2.png", bossDescription: "砂漠の脅威。", shopSkills: [], bossSkillAbbrs: "搦崩搦刺刺" },
  { no: 16, chapter: 2, stageInChapter: 2, name: "2-2", bossName: "オオサソリ", bossImage: "/images/monster/2.png", bossDescription: "砂漠の脅威。", shopSkills: [], bossSkillAbbrs: "搦崩搦刺刺" },
  { no: 17, chapter: 3, stageInChapter: 1, name: "3-1", bossName: "肉厚な馬", bossImage: "/images/monster/3.png", bossDescription: "草原の疾風。", shopSkills: [], bossSkillAbbrs: "崩待待果速" },
  { no: 18, chapter: 3, stageInChapter: 2, name: "3-2", bossName: "肉厚な馬", bossImage: "/images/monster/3.png", bossDescription: "草原の疾風。", shopSkills: [], bossSkillAbbrs: "崩待待果速" },
  { no: 19, chapter: 4, stageInChapter: 1, name: "4-1", bossName: "古々考古硬木", bossImage: "/images/monster/4.png", bossDescription: "森の守護者。", shopSkills: [], bossSkillAbbrs: "空空刺硬空空刺硬" },
  { no: 20, chapter: 4, stageInChapter: 2, name: "4-2", bossName: "古々考古硬木", bossImage: "/images/monster/4.png", bossDescription: "森の守護者。", shopSkills: [], bossSkillAbbrs: "空空刺硬空空刺硬" },
  { no: 21, chapter: 5, stageInChapter: 1, name: "5-1", bossName: "ゴリラマスター", bossImage: "/images/monster/5.png", bossDescription: "ジャングルの王。", shopSkills: [], bossSkillAbbrs: "崩待防果速" },
  { no: 22, chapter: 5, stageInChapter: 2, name: "5-2", bossName: "ゴリラマスター", bossImage: "/images/monster/5.png", bossDescription: "ジャングルの王。", shopSkills: [], bossSkillAbbrs: "崩待防果速" },
  { no: 23, chapter: 6, stageInChapter: 1, name: "6-1", bossName: "肉厚な魚", bossImage: "/images/monster/6.png", bossDescription: "水域の王。", shopSkills: [], bossSkillAbbrs: "搦搦果反一強" },
  { no: 24, chapter: 6, stageInChapter: 2, name: "6-2", bossName: "肉厚な魚", bossImage: "/images/monster/6.png", bossDescription: "水域の王。", shopSkills: [], bossSkillAbbrs: "搦搦果反一強" },
  { no: 25, chapter: 7, stageInChapter: 1, name: "7-1", bossName: "リザードロード", bossImage: "/images/monster/7.png", bossDescription: "支配者の帰還。", shopSkills: [], bossSkillAbbrs: "一交裏一裏剣" },
  { no: 26, chapter: 7, stageInChapter: 2, name: "7-2", bossName: "リザードロード", bossImage: "/images/monster/7.png", bossDescription: "支配者の帰還。", shopSkills: [], bossSkillAbbrs: "一交裏一裏剣" },
  { no: 27, chapter: 8, stageInChapter: 1, name: "8-1", bossName: "絶望のキマイラ", bossImage: "/images/monster/8.png", bossDescription: "混血の魔獣。", shopSkills: [], bossSkillAbbrs: "疫硬搦硬刺怒硬" },
  { no: 28, chapter: 8, stageInChapter: 2, name: "8-2", bossName: "絶望のキマイラ", bossImage: "/images/monster/8.png", bossDescription: "混血の魔獣。", shopSkills: [], bossSkillAbbrs: "疫硬搦硬刺怒硬" },
  { no: 29, chapter: 9, stageInChapter: 1, name: "9-1", bossName: "独裁者の庭園", bossImage: "/images/monster/9.png", bossDescription: "鉄の牙。", shopSkills: [], bossSkillAbbrs: "先待待封連雷雷" },
  { no: 30, chapter: 9, stageInChapter: 2, name: "9-2", bossName: "独裁者の庭園", bossImage: "/images/monster/9.png", bossDescription: "鉄の牙。", shopSkills: [], bossSkillAbbrs: "先待待封連雷雷" },
  { no: 31, chapter: 10, stageInChapter: 1, name: "10-1", bossName: "レンダリングダスト", bossImage: "/images/monster/10.png", bossDescription: "鏡合わせの魂。", shopSkills: [], bossSkillAbbrs: "逆逆逆" },
  { no: 32, chapter: 10, stageInChapter: 2, name: "10-2", bossName: "レンダリングダスト", bossImage: "/images/monster/10.png", bossDescription: "鏡合わせの魂。", shopSkills: [], bossSkillAbbrs: "逆逆逆" },
  { no: 33, chapter: 11, stageInChapter: 1, name: "11-1", bossName: "剣獣", bossImage: "/images/monster/11.png", bossDescription: "剣の極致。", shopSkills: [], bossSkillAbbrs: "無覚交果反玉連紫盾" },
  { no: 34, chapter: 11, stageInChapter: 2, name: "11-2", bossName: "剣獣", bossImage: "/images/monster/11.png", bossDescription: "剣の極致。", shopSkills: [], bossSkillAbbrs: "無覚交果反玉連紫盾" },
  { no: 35, chapter: 12, stageInChapter: 1, name: "12-1", bossName: "アノマ", bossImage: "/images/monster/12.png", bossDescription: "最後の笑い。", shopSkills: [], bossSkillAbbrs: "影影硬逆燐一雷反交怒" },
  { no: 36, chapter: 12, stageInChapter: 2, name: "12-2", bossName: "アノマ", bossImage: "/images/monster/12.png", bossDescription: "最後の笑い。", shopSkills: [], bossSkillAbbrs: "影影硬逆燐一雷反交怒" }
];

export interface KenjuConfig {
  name: string;
  title: string;
  description: string;
  background: string,
  image: string;
  skillAbbrs: string;
  medalId?: string; // 称号・メダルのID
}

export const KENJU_DATA: KenjuConfig[] = [
  {
    name: "王家の冠月 クリムヒルト",
    title: "LES MISÉRABLES",
    description: "「私の目に見えてるのは、あなたとの永遠だけ」 ",
    background: "/images/background/Celtic-Sun-Altar1.jpg",
    image: "/images/kenju/kriemhild_2.png",
    skillAbbrs: "先先搦剣反隠果錬",
    medalId: "kriemhild",
  },
  {
    name: "紅蓮の境界 ワダチ",
    title: "BLAZE OF GLORY",
    description: "「俺が先に剣を抜くことはなかった。けど勝つのはいつも俺だったのさ」 ",
    background: "/images/background/8.jpg",
    image: "/images/kenju/human55.png",
    skillAbbrs: "無逆逆逆逆交雷硬",
    medalId: "wadachi",
  },
  {
    name: "氷彗の狂咲 シーラン",
    title: "Лебединое озеро",
    description: "「誰かの声がした、薄氷を伝うように」 ",
    background: "/images/background/9.jpg",
    image: "/images/kenju/sword_f_2.png",
    skillAbbrs: "搦隠反崩連封隠盾",
    medalId: "shiran",
  },
  {
    name: "樹上の銀猫 アティヤー",
    title: "NESSUN DORMA",
    description: "「誰も寝てはニャらぬ」 ",
    background: "/images/background/10.jpg",
    image: "/images/kenju/cat_white.png",
    skillAbbrs: "先呪逆疫待待刺硬",
    medalId: "atiyah",
  },

  {
    name: "神秘の白金 ヴォマクト",
    title: "A WHOLE NEW WORLD",
    description: "「見せてあげよう、華やかな世界を」 ",
    background: "/images/background/Dream-City1.jpg",
    image: "/images/kenju/tall_middleeast.png",
    skillAbbrs: "逆紫反封燐連雷紫",
    medalId: "vomakt",
  },
  {
    name: "冥土の徘徊 スティーブ",
    title: "ANOTHER ONE BITES THE DUST",
    description: "「このひりつきに、いつまで耐えられる？」 ",
    background: "/images/background/Red-Light-Ceremony-Room1.jpg",
    image: "/images/kenju/witch.png",
    skillAbbrs: "疫待崩搦玉影怒反",
    medalId: "steve",
  },
  {
    name: "果てに視えるもの",
    title: "FIAT LUX",
    description: "「…………。」 ",
    background: "/images/background/fantasy-universe1.jpg",
    image: "/images/kenju/thor_2.png",
    skillAbbrs: "燐雷反雷反雷反影",
    medalId: "fiat_lux",
  }

];

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
