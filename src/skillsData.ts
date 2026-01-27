export const ALL_SKILLS = [
  { abbr: "一", name: "一閃", kana:"いっせん", icon: "/images/skill/a01.gif", type: "攻撃", speed: "LV", description: "相手に1点のダメージを与える。" },
  { abbr: "刺", name: "刺突", kana:"しとつ", icon: "/images/skill/a02.gif", type: "攻撃", speed: "1", description: "相手に1点のダメージを与える。\nダメージの対象は、このスキルと最もLVが近いスキル（より高いLVを優先）に変更される。" },
  { abbr: "果", name: "果断", kana:"かだん", icon: "/images/skill/a03.gif", type: "攻撃", speed: "1", description: "相手にLV点のダメージを与える。" },
  { abbr: "剣", name: "剣舞", kana:"けんばい", icon: "/images/skill/a04.gif", type: "攻撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、あなたが所持している攻撃スキルの数である。" },
  { abbr: "紫", name: "紫電", kana:"しでん", icon: "/images/skill/a05.gif", type: "攻撃", speed: "LV+2", description: "相手に1点のダメージを与える。\nあなたに状態「スタン」を与える。" },
  { abbr: "呪", name: "呪詛", kana:"じゅそ", icon: "/images/skill/a06.gif", type: "攻撃", speed: "1", description: "相手に1点のダメージを与える。相手に状態「忘却」を与える。" },
  { abbr: "雷", name: "雷火", kana:"らいか", icon: "/images/skill/a07.gif", type: "攻撃（リミテッド）", speed: "LV", description: "相手に2点のダメージを与える。" },
  { abbr: "隠", name: "隠刃", kana:"かくしやいば", icon: "/images/skill/a08.gif", type: "攻撃", speed: "LV", description: "相手に2点のダメージを与える。\nこのスキルは奇数ラウンドの時、先攻決定フェイズで速度を比較するスキルの対象にならず、また、攻撃フェイズで使用するスキルにも選択されない。" },
  { abbr: "怒", name: "怒濤", kana:"どとう", icon: "/images/skill/a09.gif", type: "攻撃", speed: "LV-2（最低0）", description: "相手にX点のダメージを与える。\nXは、現在のラウンド数である。" },
  { abbr: "弱", name: "弱撃", kana:"じゃくげき", icon: "/images/skill/a10.gif", type: "攻撃", speed: "0", description: "相手に1点のダメージを与える。\nあなたが攻撃・補助スキルを所持していない場合、攻撃フェイズに自動的にこのスキルが使用される。" },
  { abbr: "覚", name: "覚悟", kana:"かくご", icon: "/images/skill/b01.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「覚悟」を与える。" },
  { abbr: "防", name: "防壁", kana:"ぼうへき", icon: "/images/skill/b02.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「防壁」を3つ与える。" },
  { abbr: "封", name: "封印", kana:"ふういん", icon: "/images/skill/b03.gif", type: "補助（リミテッド）", speed: "LV", description: "相手に状態「スタン」「狼狽」「忘却」を与える。" },
  { abbr: "影", name: "影討", kana:"かげうち", icon: "/images/skill/b04.gif", type: "補助", speed: "LV", description: "相手が所持している先頭のスキルを1つ指定する。\nこのスキルを使用したラウンドの終了フェイズに、相手が所持している指定したスキルと同名のスキルを全て破壊する。" },
  { abbr: "交", name: "交錯", kana:"こうさく", icon: "/images/skill/c01.gif", type: "迎撃", speed: "LV-1", description: "相手に1点のダメージを与える。\nダメージの対象は、このスキルにダメージを与えた攻撃スキルである。" },
  { abbr: "搦", name: "搦手", kana:"からめて", icon: "/images/skill/c02.gif", type: "迎撃", speed: "LV", description: "相手に状態「狼狽」を与える。" },
  { abbr: "待", name: "待伏", kana:"まちぶせ", icon: "/images/skill/c03.gif", type: "迎撃", speed: "1", description: "相手に2点のダメージを与える。" },
  { abbr: "玉", name: "玉響", kana:"たまゆら", icon: "/images/skill/c04.gif", type: "迎撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、このスキルにダメージを与えた攻撃スキルの速度（最低0）である。" },
  { abbr: "崩", name: "崩技", kana:"くずしわざ", icon: "/images/skill/c05.gif", type: "迎撃", speed: "LV", description: "相手に状態「スタン」を与える。" },
  { abbr: "疫", name: "疫病", kana:"えきびょう", icon: "/images/skill/c06.gif", type: "迎撃", speed: "LV", description: "相手の先頭のスキルがリミテッドでないならば、そのスキルを【疫病】に変化させる。" },
  { abbr: "強", name: "＋強", kana:"プラスきょう", icon: "/images/skill/d01.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルが与えるダメージは常に+1される。" },
  { abbr: "硬", name: "＋硬", kana:"プラスこう", icon: "/images/skill/d02.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルが破壊される直前に効果を発揮する。そのスキルの破壊を無効にし、代わりにこのスキルを破壊する。" },
  { abbr: "速", name: "＋速", kana:"プラスそく", icon: "/images/skill/d03.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルの速度は常に+1される。" },
  { abbr: "反", name: "＋反", kana:"プラスはん", icon: "/images/skill/d04.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルは、常に迎撃スキルとして扱われる。" },
  { abbr: "盾", name: "＋盾", kana:"プラスたて", icon: "/images/skill/d05.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃・補助スキルを使用する直前に効果を発揮する。\nそのスキルの効果に「あなたに状態「防壁」を2つ与える。」を追加する。\nこの効果は、攻撃・補助スキルによる「ダメージ以外の効果」として扱う。" },
  { abbr: "錬", name: "＋錬", kana:"プラスれん", icon: "/images/skill/d06.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃スキルを使用する直前に効果を発揮する。\nそのスキルが発生させたダメージによる迎撃スキルの発動を1回のみ無効にする。\nダメージを与えた迎撃スキルが発動条件を満たしていなくても、この効果は適用される。" },
  { abbr: "逆", name: "逆鱗", kana:"げきりん", icon: "/images/skill/d07.gif", type: "付帯", speed: "なし", description: "このスキルが破壊された直後に効果を発揮する。\nあなたに状態「逆鱗」を1つ与える。" },
  { abbr: "無", name: "無想", kana:"むそう", icon: "/images/skill/d08.gif", type: "付帯（リミテッド）", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。\nあなたに状態「無想」を与える。このスキルは1つしか選択できない。" },
  { abbr: "裏", name: "裏霞", kana:"うらがすみ", icon: "/images/skill/d09.gif", type: "付帯", speed: "なし", description: "あなたが使用する攻撃・補助スキルを選択する直前に効果を発揮する。\nあなたが使用する攻撃・補助スキルは、あなたが所持している最後尾のスキルが選択される。" },
  { abbr: "先", name: "先制", kana:"せんせい", icon: "/images/skill/d10.gif", type: "付帯", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。あなたに状態「先制」を与える。" },
  { abbr: "連", name: "連撃", kana:"れんげき", icon: "/images/skill/d11.gif", type: "付帯（リミテッド）", speed: "なし", description: "各ラウンドの終了フェイズ直前に効果を発揮する。あなたは攻撃フェイズをもう一度行うことができる。" },
  { abbr: "燐", name: "燐光", kana:"りんこう", icon: "/images/skill/d12.gif", type: "付帯", speed: "なし", description: "各ラウンドの開始フェイズに効果を発揮する。あなたが受けている悪い状態を全て解除する。" },
  { abbr: "空", name: "空白", kana:"くうはく", icon: "/images/skill/d13.gif", type: "付帯", speed: "なし", description: "何の効果も持たない。" },
];

export interface SkillDetail {
  abbr: string;
  name: string;
  kana: string;
  icon: string;
  type: string;
  speed: string;
  description: string;
}

export const getSkillByAbbr = (abbr: string): SkillDetail | undefined => {
  return ALL_SKILLS.find(skill => skill.abbr === abbr);
};

export interface StatusDetail {
    name: string;
    type: number;
    kana: string;
    icon: string;
    description: string;
}

export const STATUS_DATA: StatusDetail[] = [
    { name: "覚悟", type: 0, kana: "かくご", icon: "/images/skill/b01.gif", description: "「覚悟」を受けているキャラクターの所持する攻撃・迎撃スキルは常に与えるダメージに+1、速度に+2される。" },
    { name: "防壁", type: 0, kana: "ぼうへき", icon: "/images/skill/b02.gif", description: "攻撃スキルによるダメージを受ける時、付与された半分(端数切り上げ)を解除してそのダメージを全て無効にする。ダメージ以外の効果は通常通り受ける。" },
    { name: "逆鱗", type: 0, kana: "げきりん", icon: "/images/skill/d07.gif", description: "所持する攻撃スキルが与えるダメージに+1される。複数受けている場合、効果は重複する。【弱撃】以外の攻撃スキルを使用した直後に解除される。" },
    { name: "無想", type: 0, kana: "むそう", icon: "/images/skill/d08.gif", description: "攻撃スキルによるダメージを受ける時、そのダメージを全て無効にする。ダメージ以外の効果は通常通り受ける。毎ラウンドの終了フェイズに解除される。" },
    { name: "先制", type: 0, kana: "せんせい", icon: "/images/skill/d10.gif", description: "先攻決定フェイズにおいて常に先攻となる。両者が受けている場合は速度比較となる。毎ラウンドの終了フェイズに解除される。" },
    { name: "スタン", type: 1, kana: "", icon: "/images/skill/x01.gif", description: "先攻決定フェイズにおいて常に後攻となる。他のあらゆる速度変化効果に対して優先される。" },
    { name: "狼狽", type: 1, kana: "ろうばい", icon: "/images/skill/x02.gif", description: "所持する攻撃スキルの速度は、攻撃フェイズにおいて常に0として扱われる。他のあらゆる速度変化効果に対して優先される。" },
    { name: "忘却", type: 1, kana: "ぼうきゃく", icon: "/images/skill/x03.gif", description: "毎ラウンドの終了フェイズに、自身が所持している【空白】を除く先頭のスキルが【空白】に変化する。" },
];
