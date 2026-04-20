export const ALL_SKILLS: SkillDetail[] = [
  { abbr: "一", name: "一閃", kana:"いっせん", icon: "/images/skill/a01.gif", type: "攻撃", speed: "LV", description: "相手に1点のダメージを与える。", exclude: 0 },
  { abbr: "刺", name: "刺突", kana:"しとつ", icon: "/images/skill/a02.gif", type: "攻撃", speed: "1", description: "相手に1点のダメージを与える。\nダメージの対象は、このスキルと最もLVが近いスキル（より高いLVを優先）に変更される。", exclude: 0 },
  { abbr: "果", name: "果断", kana:"かだん", icon: "/images/skill/a03.gif", type: "攻撃", speed: "1", description: "相手にLV点のダメージを与える。", exclude: 0 },
  { abbr: "剣", name: "剣舞", kana:"けんばい", icon: "/images/skill/a04.gif", type: "攻撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、あなたが所持している攻撃スキルの数である。", exclude: 0 },
  { abbr: "紫", name: "紫電", kana:"しでん", icon: "/images/skill/a05.gif", type: "攻撃", speed: "LV+2", description: "相手に1点のダメージを与える。\nあなたに状態「スタン」を与える。", exclude: 0 },
  { abbr: "呪", name: "呪詛", kana:"じゅそ", icon: "/images/skill/a06.gif", type: "攻撃（リミテッド）", speed: "LV-2（最低0）", description: "相手に1点のダメージを与える。相手に状態「忘却」を与える。", exclude: 0 },
  { abbr: "雷", name: "雷火", kana:"らいか", icon: "/images/skill/a07.gif", type: "攻撃（リミテッド）", speed: "LV", description: "相手に2点のダメージを与える。", exclude: 0 },
  { abbr: "隠", name: "隠刃", kana:"かくしやいば", icon: "/images/skill/a08.gif", type: "攻撃", speed: "LV", description: "相手に2点のダメージを与える。\nこのスキルは奇数ラウンドの時、先攻決定フェイズで速度を比較するスキルの対象にならず、また、攻撃フェイズで使用するスキルにも選択されない。", exclude: 0 },
  { abbr: "怒", name: "怒濤", kana:"どとう", icon: "/images/skill/a09.gif", type: "攻撃", speed: "LV-2（最低0）", description: "相手にX点のダメージを与える。\nXは、現在のラウンド数である。", exclude: 0 },
  // 攻撃スキル
  { abbr: "瘴", name: "瘴気", kana:"しょうき", icon: "/images/skill/v2/2011-12-23_3-189.gif", type: "攻撃", speed: "LV-1", description: "相手にX点のダメージを与える。Xは、互いが所持している【疫病】の数である。", exclude: 0 },
  { abbr: "拳", name: "鉄拳", kana:"てっけん", icon: "/images/skill/v2/2011-12-23_3-040.gif", type: "攻撃", speed: "3", description: "相手に1点のダメージを与える。このラウンドであなたが先攻ならば、代わりに2点のダメージを与える。", exclude: 1 },
  { abbr: "烈", name: "烈風", kana:"れっぷう", icon: "/images/skill/v2/2011-12-23_3-067.gif", type: "攻撃", speed: "LV-1", description: "相手に1点のダメージを与える。迎撃スキルが発動しなければ、さらに上からスキルを1つ破壊する。", exclude: 0 },
  { abbr: "滅", name: "撃滅", kana:"げきめつ", icon: "/images/skill/v2/2011-12-23_3-033.gif", type: "攻撃", speed: "1", description: "相手が受けている良い状態を全て解除する。相手に1点のダメージを与える。", exclude: 1 },
  { abbr: "砲", name: "艦砲", kana:"かんぽう", icon: "/images/skill/v2/2011-12-23_3-048.gif", type: "攻撃", speed: "0", description: "相手に3点のダメージを与える。ダメージの対象は、このスキルと最もLVが近いスキルに変更される。", exclude: 1 },
  { abbr: "死", name: "死神", kana:"しにがみ", icon: "/images/skill/v2/2011-12-23_1-019.gif", type: "攻撃", speed: "LV-1", description: "相手にX点のダメージを与える。Xは、相手が持っている悪い状態の数+1である。", exclude: 1  },
  { abbr: "焦", name: "焦熱", kana:"しょうねつ", icon: "/images/skill/v2/2011-12-23_3-049.gif", type: "攻撃（リミテッド）", speed: "LV-2（最低0）", description: "相手に1点のダメージを与える。相手に状態「火傷」を与える。", exclude: 1 },
  { abbr: "弱", name: "弱撃", kana:"じゃくげき", icon: "/images/skill/a10.gif", type: "攻撃", speed: "0", description: "相手に1点のダメージを与える。\nあなたが攻撃・補助スキルを所持していない場合、攻撃フェイズに自動的にこのスキルが使用される。", exclude: 1 },

  // 補助スキル
  { abbr: "覚", name: "覚悟", kana:"かくご", icon: "/images/skill/b01.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「覚悟」を与える。", exclude: 0 },
  { abbr: "防", name: "防壁", kana:"ぼうへき", icon: "/images/skill/b02.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「防壁」を3つ与える。", exclude: 0 },
  { abbr: "封", name: "封印", kana:"ふういん", icon: "/images/skill/b03.gif", type: "補助（リミテッド）", speed: "LV", description: "相手に状態「スタン」「狼狽」「忘却」を与える。", exclude: 0 },
  { abbr: "影", name: "影討", kana:"かげうち", icon: "/images/skill/b04.gif", type: "補助", speed: "LV", description: "相手が所持している先頭のスキルを1つ指定する。\nこのスキルを使用したラウンドの終了フェイズに、相手が所持している指定したスキルと同名のスキルを全て破壊する。", exclude: 0 },
  { abbr: "毒", name: "蟲毒", kana:"こどく", icon: "/images/skill/v2/2011-12-23_2-009.gif", type: "補助", speed: "0", description: "相手に状態「毒」を与える。", exclude: 0 },
  { abbr: "癒", name: "治癒", kana:"ちゆ", icon: "/images/skill/v2/2014-8-31_021.gif", type: "補助(リミテッド)", speed: "0", description: "あなたに状態「治癒(LV-1)」を与える。", exclude: 0 },
  { abbr: "凍", name: "凍結", kana:"とうけつ", icon: "/images/skill/v2/2011-12-23_3-052.gif", type: "補助", speed: "LV", description: "相手に状態「狼狽」を与える。このスキルを使用したラウンドの終了フェイズに、相手が所持している先頭のスキルを1つ破壊する。", exclude: 0 },
  { abbr: "奏", name: "協奏", kana:"きょうそう", icon: "/images/skill/v2/2011-12-23_3-199.gif", type: "補助", speed: "LV", description: "あなたに状態「協奏」1つと「忘却」を与える。", exclude: 1 },
  { abbr: "盗", name: "盗賊", kana:"とうぞく", icon: "/images/skill/v2/2011-12-23_1-115.gif", type: "補助(リミテッド)", speed: "0", description: "相手が持っている良い状態を全て解除し、あなたに同じ状態を全て与える。", exclude: 0 },

  // 迎撃スキル
  { abbr: "交", name: "交錯", kana:"こうさく", icon: "/images/skill/c01.gif", type: "迎撃", speed: "LV-1", description: "相手に1点のダメージを与える。\nダメージの対象は、このスキルにダメージを与えた攻撃スキルである。", exclude: 0 },
  { abbr: "搦", name: "搦手", kana:"からめて", icon: "/images/skill/c02.gif", type: "迎撃", speed: "LV", description: "相手に状態「狼狽」を与える。", exclude: 0 },
  { abbr: "待", name: "待伏", kana:"まちぶせ", icon: "/images/skill/c03.gif", type: "迎撃", speed: "1", description: "相手に2点のダメージを与える。", exclude: 0 },
  { abbr: "玉", name: "玉響", kana:"たまゆら", icon: "/images/skill/c04.gif", type: "迎撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、このスキルにダメージを与えた攻撃スキルの速度（最低0）である。", exclude: 0 },
  { abbr: "崩", name: "崩技", kana:"くずしわざ", icon: "/images/skill/c05.gif", type: "迎撃", speed: "LV", description: "相手に状態「スタン」を与える。", exclude: 0 },
  { abbr: "疫", name: "疫病", kana:"えきびょう", icon: "/images/skill/c06.gif", type: "迎撃", speed: "LV", description: "相手の先頭のスキルを【疫病】に変化させる。", exclude: 0 },
  { abbr: "幻", name: "幻惑", kana:"げんわく", icon: "/images/skill/v2/2011-12-23_3-058.gif", type: "迎撃", speed: "LV", description: "このスキルが発動した場合、攻撃フェイズではなく終了フェイズに破壊される。", exclude: 0 },
  { abbr: "水", name: "水幕", kana:"すいまく", icon: "/images/skill/v2/2011-12-23_3-055.gif", type: "迎撃", speed: "LV-1", description: "あなたに状態「防壁」を1つ与える。", exclude: 0 },
  { abbr: "転", name: "転回", kana:"てんかい", icon: "/images/skill/v2/2011-12-23_3-065.gif", type: "迎撃", speed: "LV+2", description: "あなたに状態「狼狽」を与える。", exclude: 0 },
  { abbr: "罠", name: "罠師", kana:"わなし", icon: "/images/skill/v2/2011-12-23_3-182.gif", type: "迎撃", speed: "0", description: "相手に3点のダメージを与える。", exclude: 0 },
  { abbr: "受", name: "受難", kana:"じゅなん", icon: "/images/skill/v2/2021-7-17_100.gif", type: "迎撃", speed: "LV", description: "あなたが受けている悪い状態を全て解除し、相手に同じ状態を全て与える。", exclude: 0 },

  // 付帯スキル
  { abbr: "強", name: "＋強", kana:"プラスきょう", icon: "/images/skill/d01.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルが与えるダメージは常に+1される。", exclude: 0 },
  { abbr: "硬", name: "＋硬", kana:"プラスこう", icon: "/images/skill/d02.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルが破壊される直前に効果を発揮する。そのスキルの破壊を無効にし、代わりにこのスキルを破壊する。", exclude: 0 },
  { abbr: "速", name: "＋速", kana:"プラスそく", icon: "/images/skill/d03.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルの速度は常に+1される。", exclude: 0 },
  { abbr: "反", name: "＋反", kana:"プラスはん", icon: "/images/skill/d04.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルは、常に迎撃スキルとして扱われる。\n迎撃スキルとして扱われている間は、攻撃スキルにのみ適用されるダメージ補正は適用されない。", exclude: 0 },
  { abbr: "光", name: "＋光", kana:"プラスひかり", icon: "/images/skill/v2/2011-12-23_3-130.gif", type: "付帯", speed: "なし", description: "このスキルの直前の【一閃】が与えるダメージは常に+2される。", exclude: 0 },
  { abbr: "弓", name: "＋弓", kana:"プラスゆみ", icon: "/images/skill/v2/2011-12-23_1-043.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルにリミテッドを与え、速度に+3する。", exclude: 1 },

  { abbr: "盾", name: "＋盾", kana:"プラスたて", icon: "/images/skill/d05.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃・補助スキルを使用する直前に効果を発揮する。\nそのスキルの効果に「あなたに状態「防壁」を2つ与える。」を追加する。\nこの効果は、攻撃・補助スキルによる「ダメージ以外の効果」として扱う。", exclude: 0 },
  { abbr: "錬", name: "＋錬", kana:"プラスれん", icon: "/images/skill/d06.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃スキルを使用する直前に効果を発揮する。\nそのスキルが発生させたダメージによる迎撃スキルの発動を1回のみ無効にする。\nダメージを与えた迎撃スキルが発動条件を満たしていなくても、この効果は適用される。", exclude: 0 },
  { abbr: "逆", name: "逆鱗", kana:"げきりん", icon: "/images/skill/d07.gif", type: "付帯", speed: "なし", description: "このスキルが破壊された直後に効果を発揮する。\nあなたに状態「逆鱗」を1つ与える。", exclude: 0 },
  { abbr: "無", name: "無想", kana:"むそう", icon: "/images/skill/d08.gif", type: "付帯（リミテッド）", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。\nあなたに状態「無想」を与える。このスキルは1つしか選択できない。", exclude: 0 },
  { abbr: "裏", name: "裏霞", kana:"うらがすみ", icon: "/images/skill/d09.gif", type: "付帯", speed: "なし", description: "あなたが使用する攻撃・補助スキルを決定する直前に効果を発揮する。\nあなたが使用する攻撃・補助スキルは、あなたが所持している最後尾のスキルが選択される。\n先攻決定フェイズには影響しない。", exclude: 0 },
  { abbr: "先", name: "先制", kana:"せんせい", icon: "/images/skill/d10.gif", type: "付帯", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。あなたに状態「先制」を与える。", exclude: 0 },
  { abbr: "連", name: "連撃", kana:"れんげき", icon: "/images/skill/d11.gif", type: "付帯", speed: "なし", description: "各ラウンドの終了フェイズ直前に効果を発揮する。あなたは攻撃フェイズをもう一度行うことができる。", exclude: 0 },
  { abbr: "燐", name: "燐光", kana:"りんこう", icon: "/images/skill/d12.gif", type: "付帯", speed: "なし", description: "各ラウンドの開始フェイズに効果を発揮する。あなたが受けている悪い状態を全て解除する。", exclude: 0 },

  { abbr: "飛", name: "飛行", kana:"ひこう", icon: "/images/skill/v2/2011-12-23_1-294.gif", type: "付帯", speed: "なし", description: "【弱撃】以外の速度0の攻撃スキルによるダメージと効果を受けない。", exclude: 1 },
  { abbr: "円", name: "円環", kana:"えんかん", icon: "/images/skill/v2/2013-4-20_038.gif", type: "付帯", speed: "なし", description: "各ラウンドの終了フェイズ直後に効果を発揮する。終了フェイズをもう一度行う。", exclude: 1 },
  { abbr: "礁", name: "座礁", kana:"ざしょう", icon: "/images/skill/v2/2011-12-23_3-094.gif", type: "付帯", speed: "なし", description: "互いの攻撃スキルの速度に-1する(最低0)。複数存在する場合、効果は重複する。", exclude: 1 },
  { abbr: "霊", name: "霊化", kana:"れいか", icon: "/images/skill/v2/2011-12-23_3-060.gif", type: "付帯", speed: "なし", description: "開始フェイズに発動する。あなたに状態「防壁」を1つと状態「霊化」を与える。", exclude: 1  },

  { abbr: "空", name: "空白", kana:"くうはく", icon: "/images/skill/d13.gif", type: "付帯", speed: "なし", description: "何の効果も持たない。", exclude: 1  },
  { abbr: "Ｈ", name: "ＨＰ", kana:"ヒットポイント", icon: "/images/skill/v2/heart_24x24.png", type: "付帯", speed: "なし", description: "このスキルは【影討】の効果を受けない。", exclude: 1  },

  // 神業スキル
  { abbr: "狼", name: "狼嵐", kana:"ウルフストーム", icon: "/images/skill/v2/2011-12-23_1-031.gif", type: "攻撃(リミテッド)・神業", kamiwaza: 1, speed: "1", description: "相手にLV点のダメージを与える。このスキルが発生させたダメージによる迎撃スキルの発動を1回のみ無効にする。神業スキルは1つしか選択できない。", ruleDisplay:false, exclude: 1 },
  { abbr: "▽", name: "▽解", kana:"デルタブレイク", icon: "/images/skill/v2/2011-12-23_3-036.gif", type: "攻撃(リミテッド)・神業", kamiwaza: 1,speed: "LV", description: "相手に1点のダメージを与える。それを3回行う。神業スキルは1つしか選択できない。", ruleDisplay:false, exclude: 1  },
  { abbr: "爆", name: "爆砕", kana:"イクスプロージョン", icon: "/images/skill/v2/2013-4-20_034.gif", type: "攻撃(リミテッド)・神業", kamiwaza: 1, speed: "LV", description: "相手にLV点のダメージを与える。自分に状態「狼狽」「スタン」「火傷」を与える。神業スキルは1つしか選択できない。", ruleDisplay:false, exclude: 1  },
  { abbr: "魔", name: "魔弾", kana:"ザミエル", icon: "/images/skill/v2/2011-12-23_1-044.gif", type: "攻撃(リミテッド)・神業", kamiwaza: 1, speed: "LV", description: "相手に1点のダメージを与える。相手に状態「死紋」を1つ与える。神業スキルは1つしか選択できない。", ruleDisplay:false, exclude: 1  },

  // 敵専用スキル
  { abbr: "極", name: "極限", kana:"グランツヴァルト", icon: "/images/skill/v2/infinity.png", type: "付帯・敵専用", speed: "なし", description: "【ＨＰ】1000個分として扱う。以降のスキルのLVは1001から数える。あなたは状態「忘却」の効果を受けない。", ruleDisplay: false, exclude: 1  },
  { abbr: "掌", name: "掌握", kana:"エアグライフェン", icon: "/images/skill/v2/hand.png", type: "付帯・敵専用", speed: "なし", description: "あなたは第9ラウンドの終了フェイズに勝利する。", ruleDisplay: false, exclude: 1  },


  // { abbr: "傲", name: "傲慢", kana:"スペルビア", icon: "/images/skill/v2/superbia.png", type: "敵専用", speed: "LV", description: "相手の補助スキルを全て破壊する。", ruleDisplay: false, exclude: 1  },
  // { abbr: "欲", name: "強欲", kana:"アヴァタリア", icon: "/images/skill/v2/avaritia.png", type: "敵専用", speed: "LV", description: "相手のスキルを2つ奪う。", ruleDisplay: false, exclude: 1  },
  // { abbr: "嫉", name: "嫉妬", kana:"インヴィディア", icon: "/images/skill/v2/invidia.png", type: "敵専用", speed: "LV", description: "相手と同じスキルを使用する。", ruleDisplay: false, exclude: 1  },
  // { abbr: "憤", name: "憤怒", kana:"イーラ", icon: "/images/skill/v2/ira.png", type: "敵専用", speed: "LV", description: "自身が受けたダメージの合計×1点のダメージを与える。", ruleDisplay: false, exclude: 1  },
  // { abbr: "色", name: "色欲", kana:"ルクスリア", icon: "/images/skill/v2/luxuria.png", type: "敵専用", speed: "LV", description: "相手を魅了し、相手の次の攻撃対象を自分自身に変更させる。", ruleDisplay: false, exclude: 1  },
  // { abbr: "暴", name: "暴食", kana:"グーラ", icon: "/images/skill/v2/gula.png", type: "敵専用", speed: "LV", description: "相手のスキルを1つ食べ（破壊し）、自身のHP（スキル数）を1回復する。", ruleDisplay: false, exclude: 1  },
  // { abbr: "怠", name: "怠惰", kana:"アケディア", icon: "/images/skill/v2/acedia.png", type: "敵専用", speed: "0", description: "何もしない。ただしダメージを受けると反撃する。", ruleDisplay: false, exclude: 1  },
];

export interface SkillDetail {
  exclude: number;
  abbr: string;
  name: string;
  kana: string;
  icon: string;
  type: string;
  speed: string;
  description: string;
  kamiwaza?: number;
  ruleDisplay?: boolean;
}

export const getSkillByAbbr = (abbr: string): SkillDetail | undefined => {
  return ALL_SKILLS.find(skill => skill.abbr === abbr);
};

export interface StatusDetail {
    name: string;
    type: number;
    kana: string;
    icon: string;
    stackable: boolean;
    description: string;
}

export const STATUS_DATA: StatusDetail[] = [
    { name: "覚悟", type: 0, kana: "かくご", icon: "/images/skill/b01.gif", stackable: false, description: "所持する攻撃・迎撃スキルは常に与えるダメージに+1、速度に+2される。先攻決定フェイズには影響しない。" },
    { name: "防壁", type: 0, kana: "ぼうへき", icon: "/images/skill/b02.gif", stackable: true, description: "攻撃スキルによるダメージを受ける時、付与された半分(端数切り上げ)を解除してそのダメージを全て無効にする。ダメージ以外の効果は通常通り受ける。" },
    { name: "逆鱗", type: 0, kana: "げきりん", icon: "/images/skill/d07.gif", stackable: true, description: "所持する攻撃スキルが与えるダメージに+1される。複数受けている場合、効果は重複する。【弱撃】以外の攻撃スキルを使用した直後に解除される。" },
    { name: "無想", type: 0, kana: "むそう", icon: "/images/skill/d08.gif", stackable: false, description: "攻撃スキルによるダメージを受ける時、そのダメージを全て無効にする。ダメージ以外の効果は通常通り受ける。毎ラウンドの終了フェイズに解除される。" },
    { name: "先制", type: 0, kana: "せんせい", icon: "/images/skill/d10.gif", stackable: false, description: "先攻決定フェイズにおいて常に先攻となる。両者が受けている場合は速度比較となる。毎ラウンドの終了フェイズに解除される。" },

    // 新規追加
    { name: "回復", type: 0, kana: "かいふく", icon: "/images/skill/v2/2011-12-23_3-140.gif", stackable: false, description: "終了フェイズに、あなたの破壊されたスキルを全て【ＨＰ】に変化させる。" },
    { name: "治癒(X)", type: 0, kana: "ちゆ", icon: "/images/skill/v2/2014-8-31_021.gif", stackable: false, description: "終了フェイズに、破壊された先頭のスキル1個を【ＨＰ】に変化させる。第Xラウンドの効果発生後に消滅する。Xが異なる場合でも、後から付与された治癒に上書きされない。" },
    { name: "協奏", type: 0, kana: "きょうそう", icon: "/images/skill/v2/2011-12-23_3-195.gif", stackable: true, description: "所持する攻撃スキルのダメージと速度に、受けている協奏の数を加える。先攻決定フェイズには影響しない。" },
    { name: "霊化", type: 0, kana: "れいか", icon: "/images/skill/v2/2011-12-23_3-060.gif", stackable: false, description: "攻撃スキルを所持していない時、【弱撃】ではなく【影討】を使用する。LVは0とする。" },
    // { name: "強欲", type: 0, kana: "ごうよく", icon: "/images/skill/avaritia.png", description: "終了フェイズの直前に攻撃フェイズをもう一度行う。" },
    // { name: "傲慢", type: 0, kana: "ごうまん", icon: "/images/skill/superbia.png", description: "あなたの攻撃・迎撃スキルの速度に+1する。" },
    // { name: "憤怒", type: 0, kana: "ふんぬ", icon: "/images/skill/ira.png", description: "あなたの攻撃・迎撃スキルのダメージに+1する。" },
    // { name: "暴食", type: 0, kana: "ぼうしょく", icon: "/images/skill/gula.png", description: "あなたの攻撃スキルの効果に「自分のスキルの末尾に【ＨＰ】を追加する。」を追加する。" },
    // { name: "怠惰", type: 0, kana: "たいだ", icon: "/images/skill/luxuria.png", description: "終了フェイズに、あなたの所持している迎撃スキルの数だけ状態「防壁」を与える。" },


    { name: "スタン", type: 1, kana: "", icon: "/images/skill/x01.gif", stackable: false, description: "先攻決定フェイズにおいて常に後攻となる。他のあらゆる速度変化効果に対して優先される。スキルの速度には影響しない。" },
    { name: "狼狽", type: 1, kana: "ろうばい", icon: "/images/skill/x02.gif", stackable: false, description: "所持する攻撃スキルの速度は、攻撃フェイズにおいて常に0として扱われる。先攻決定フェイズには影響しない。他のあらゆる速度変化効果に対して優先される。" },
    { name: "忘却", type: 1, kana: "ぼうきゃく", icon: "/images/skill/x03.gif", stackable: false, description: "毎ラウンドの終了フェイズに、自身が所持している【空白】を除く先頭のスキルが【空白】に変化する。" },

    { name: "毒", type: 1, kana: "どく", icon: "/images/skill/v2/2011-12-23_3-136.gif", stackable: false, description: "終了フェイズにあなたの先頭のスキルを1つ破壊する。" },
    { name: "火傷", type: 1, kana: "やけど", icon: "/images/skill/v2/2011-12-23_3-142.gif", stackable: false, description: "あなたが与える攻撃スキルのダメージに-1する。(最低1)" },
    { name: "死紋", type: 1, kana: "しもん", icon: "/images/skill/v2/2011-12-24_007.gif", stackable: true, description: "あなたが攻撃スキルによって受けるダメージに、あなたが受けている死紋の数を加える。終了フェイズに、あなたが受けている死紋の数だけ状態「死紋」を与える。" },
    // { name: "嫉妬", type: 1, kana: "しっと", icon: "/images/skill/invidia.png", description: "あなたは良い状態を受けることができない。" },
    // { name: "色欲", type: 1, kana: "しきよく", icon: "/images/skill/luxuria.png", description: "あなたが与える攻撃・迎撃スキルのダメージに-1する。(最低1)" },

];
