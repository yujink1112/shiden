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
  { abbr: "裏", name: "裏霞", kana:"うらがすみ", icon: "/images/skill/d09.gif", type: "付帯", speed: "なし", description: "あなたが使用する攻撃・補助スキルを決定する直前に効果を発揮する。\nあなたが使用する攻撃・補助スキルは、あなたが所持している最後尾のスキルが選択される。\n先攻決定フェイズには影響しない。" },
  { abbr: "先", name: "先制", kana:"せんせい", icon: "/images/skill/d10.gif", type: "付帯", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。あなたに状態「先制」を与える。" },
  { abbr: "連", name: "連撃", kana:"れんげき", icon: "/images/skill/d11.gif", type: "付帯", speed: "なし", description: "各ラウンドの終了フェイズ直前に効果を発揮する。あなたは攻撃フェイズをもう一度行うことができる。" },
  { abbr: "燐", name: "燐光", kana:"りんこう", icon: "/images/skill/d12.gif", type: "付帯", speed: "なし", description: "各ラウンドの開始フェイズに効果を発揮する。あなたが受けている悪い状態を全て解除する。" },
  { abbr: "空", name: "空白", kana:"くうはく", icon: "/images/skill/d13.gif", type: "付帯", speed: "なし", description: "何の効果も持たない。" },
  // 新規追加
  // 攻撃スキル
  { abbr: "瘴", name: "瘴気", kana:"しょうき", icon: "/images/skill/a11.gif", type: "攻撃", speed: "LV-1", description: "相手に1点のダメージを与える。相手に状態「中毒」を与える。" },
  { abbr: "鉄", name: "鉄拳", kana:"てっけん", icon: "/images/skill/a12.gif", type: "攻撃", speed: "3", description: "相手に2点のダメージを与える。" },
  { abbr: "烈", name: "烈風", kana:"れっぷう", icon: "/images/skill/a13.gif", type: "攻撃", speed: "LV-1", description: "相手に1点のダメージを与える。" },
  { abbr: "審", name: "審判", kana:"しんぱん", icon: "/images/skill/a14.gif", type: "攻撃", speed: "LV", description: "相手にLV点のダメージを与える。相手のスキルをランダムで1つ破壊する。" },
  { abbr: "艦", name: "艦砲", kana:"かんぽう", icon: "/images/skill/a15.gif", type: "攻撃（リミテッド）", speed: "1", description: "相手に3点のダメージを与える。" },
  { abbr: "死", name: "死神", kana:"しにがみ", icon: "/images/skill/a16.gif", type: "攻撃", speed: "LV", description: "相手に1点のダメージを与える。相手の生存スキルが1つだけなら、そのスキルを破壊する。" },

  // 補助スキル
  { abbr: "蟲", name: "蟲毒", kana:"こどく", icon: "/images/skill/b05.gif", type: "補助", speed: "LV", description: "相手に状態「中毒」を与える。" },
  { abbr: "医", name: "医術", kana:"いじゅつ", icon: "/images/skill/b06.gif", type: "補助", speed: "LV", description: "あなたが受けている悪い状態を1つ解除する。" },
  { abbr: "魚", name: "魚群", kana:"ぎょぐん", icon: "/images/skill/b07.gif", type: "補助", speed: "LV", description: "相手に1点のダメージを与える。このダメージに対して迎撃スキルは発動しない。" },
  { abbr: "焦", name: "焦熱", kana:"しょうねつ", icon: "/images/skill/b08.gif", type: "補助", speed: "LV", description: "相手に状態「火傷」を与える。" },
  { abbr: "協", name: "協奏", kana:"きょうそう", icon: "/images/skill/b09.gif", type: "補助", speed: "LV", description: "あなたが次に使用するスキルのLVは+1として扱われる。" },
  { abbr: "盗", name: "盗賊", kana:"とうぞく", icon: "/images/skill/b10.gif", type: "補助", speed: "LV", description: "相手の先頭のスキルを1つ奪い、自分の最後尾に追加する（最大5つまで）。奪えない場合は1点ダメージ。" },

  // 迎撃スキル
  { abbr: "幻", name: "幻惑", kana:"げんわく", icon: "/images/skill/c07.gif", type: "迎撃", speed: "LV", description: "相手の攻撃スキルの対象をランダムに変更する。" },
  { abbr: "水", name: "水幕", kana:"すいまく", icon: "/images/skill/c08.gif", type: "迎撃", speed: "LV+1", description: "ダメージを無効化する。" },
  { abbr: "転", name: "転回", kana:"てんかい", icon: "/images/skill/c09.gif", type: "迎撃", speed: "LV", description: "受けたダメージをそのまま相手に与え返す。" },
  { abbr: "罠", name: "罠師", kana:"わなし", icon: "/images/skill/c10.gif", type: "迎撃", speed: "1", description: "相手に状態「スタン」を与える。" },
  { abbr: "受", name: "受難", kana:"じゅなん", icon: "/images/skill/c11.gif", type: "迎撃", speed: "LV", description: "相手にLV点のダメージを与える。" },

  // 付帯スキル
  { abbr: "飛", name: "飛行", kana:"ひこう", icon: "/images/skill/d14.gif", type: "付帯", speed: "なし", description: "このスキルへのダメージを50%の確率で回避する。" },
  { abbr: "円", name: "円環", kana:"えんかん", icon: "/images/skill/d15.gif", type: "付帯", speed: "なし", description: "このスキルが破壊された時、復活する（1回のみ）。" },
  { abbr: "礁", name: "座礁", kana:"ざしょう", icon: "/images/skill/d16.gif", type: "付帯", speed: "なし", description: "相手の速度を-1する。" },
  { abbr: "霊", name: "霊化", kana:"れいか", icon: "/images/skill/d17.gif", type: "付帯", speed: "なし", description: "物理攻撃（剣、鉄など）によるダメージを受けない。" },
  { abbr: "翔", name: "＋翔", kana:"プラスしょう", icon: "/images/skill/d18.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルの速度は常に+2される。" },
  { abbr: "弓", name: "＋弓", kana:"プラスゆみ", icon: "/images/skill/d19.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルは、相手の後列のスキルを優先して狙う。" },

  // 神業スキル
  { abbr: "狼", name: "狼嵐", kana:"ろうらん", icon: "/images/skill/s01.gif", type: "神業", speed: "LV", description: "相手に3点のダメージを与える。相手に状態「狼狽」を与える。" },
  { abbr: "解", name: "▽解", kana:"かい", icon: "/images/skill/s02.gif", type: "神業", speed: "LV", description: "相手の全ての付帯スキルの効果を無効にする。" },
  { abbr: "爆", name: "爆砕", kana:"ばくさい", icon: "/images/skill/s03.gif", type: "神業", speed: "1", description: "敵味方全員に3点のダメージを与える。" },
  { abbr: "魔", name: "魔弾", kana:"まだん", icon: "/images/skill/s04.gif", type: "神業", speed: "LV", description: "相手にX点のダメージを与える。Xはあなたの残りスキル数。" },

  // 敵専用スキル
  { abbr: "傲", name: "傲慢", kana:"ごうまん", icon: "/images/skill/e01.gif", type: "敵専用", speed: "LV", description: "相手の補助スキルを全て破壊する。" },
  { abbr: "欲", name: "強欲", kana:"ごうよく", icon: "/images/skill/e02.gif", type: "敵専用", speed: "LV", description: "相手のスキルを2つ奪う。" },
  { abbr: "嫉", name: "嫉妬", kana:"しっと", icon: "/images/skill/e03.gif", type: "敵専用", speed: "LV", description: "相手と同じスキルを使用する。" },
  { abbr: "憤", name: "憤怒", kana:"ふんぬ", icon: "/images/skill/e04.gif", type: "敵専用", speed: "LV", description: "自身が受けたダメージの合計×1点のダメージを与える。" },
  { abbr: "色", name: "色欲", kana:"しきよく", icon: "/images/skill/e05.gif", type: "敵専用", speed: "LV", description: "相手を魅了し、相手の次の攻撃対象を自分自身に変更させる。" },
  { abbr: "暴", name: "暴食", kana:"ぼうしょく", icon: "/images/skill/e06.gif", type: "敵専用", speed: "LV", description: "相手のスキルを1つ食べ（破壊し）、自身のHP（スキル数）を1回復する。" },
  { abbr: "怠", name: "怠惰", kana:"たいだ", icon: "/images/skill/e07.gif", type: "敵専用", speed: "0", description: "何もしない。ただしダメージを受けると反撃する。" },
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
    { name: "スタン", type: 1, kana: "", icon: "/images/skill/x01.gif", description: "先攻決定フェイズにおいて常に後攻となる。他のあらゆる速度変化効果に対して優先される。スキルの速度には影響しない。" },
    { name: "狼狽", type: 1, kana: "ろうばい", icon: "/images/skill/x02.gif", description: "所持する攻撃スキルの速度は、攻撃フェイズにおいて常に0として扱われる。先攻決定フェイズには影響しない。他のあらゆる速度変化効果に対して優先される。" },
    { name: "忘却", type: 1, kana: "ぼうきゃく", icon: "/images/skill/x03.gif", description: "毎ラウンドの終了フェイズに、自身が所持している【空白】を除く先頭のスキルが【空白】に変化する。" },
    { name: "毒", type: 1, kana: "ちゅうどく", icon: "/images/skill/x04.gif", description: "毎ラウンド終了時に1点のダメージを受ける。" },
    { name: "火傷", type: 1, kana: "やけど", icon: "/images/skill/x05.gif", description: "攻撃スキルのダメージが-1される（最低0）。" },
];
