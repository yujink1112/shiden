export const ALL_SKILLS = [
  { abbr: "一", name: "一閃", icon: "/images/a01.gif", type: "攻撃", speed: "LV", description: "相手に1点のダメージを与える。" },
  { abbr: "刺", name: "刺突", icon: "/images/a02.gif", type: "攻撃", speed: "1", description: "相手に1点のダメージを与える。\nダメージの対象は、「このスキルと同じLVのスキル＞このスキルのLV未満のスキルを除いた先頭のスキル＞先頭のスキル」の優先順位で決定される。" },
  { abbr: "果", name: "果断", icon: "/images/a03.gif", type: "攻撃", speed: "1", description: "相手にLV点のダメージを与える。" },
  { abbr: "剣", name: "剣舞", icon: "/images/a04.gif", type: "攻撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、あなたが所持している攻撃スキルの数である。" },
  { abbr: "紫", name: "紫電", icon: "/images/a05.gif", type: "攻撃", speed: "LV+2", description: "相手に1点のダメージを与える。\nあなたに状態「スタン」を与える。" },
  { abbr: "呪", name: "呪詛", icon: "/images/a06.gif", type: "攻撃", speed: "1", description: "相手に1点のダメージを与える。\nこのスキルが発生させたダメージによって迎撃スキルが発動しなかったならば、相手に状態「衰弱」を与える。" },
  { abbr: "雷", name: "雷火", icon: "/images/a07.gif", type: "攻撃（リミテッド）", speed: "LV", description: "相手に2点のダメージを与える。" },
  { abbr: "隠", name: "隠刃", icon: "/images/a08.gif", type: "攻撃", speed: "LV", description: "相手に2点のダメージを与える。\nこのスキルは奇数ラウンドの時、先攻決定フェイズで速度を比較するスキルの対象にならず、また、攻撃フェイズで使用するスキルにも選択されない。" },
  { abbr: "怒", name: "怒濤", icon: "/images/a09.gif", type: "攻撃", speed: "LV-2（最低0）", description: "相手にX点のダメージを与える。\nXは、現在のラウンド数である。" },
  { abbr: "弱", name: "弱撃", icon: "/images/a10.gif", type: "攻撃", speed: "0", description: "相手に1点のダメージを与える。\nあなたが攻撃・補助スキルを所持していない場合、攻撃フェイズに自動的にこのスキルが使用される。" },
  { abbr: "覚", name: "覚悟", icon: "/images/b01.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「覚悟」を与える。" },
  { abbr: "防", name: "防壁", icon: "/images/b02.gif", type: "補助（リミテッド）", speed: "LV", description: "あなたに状態「防壁」を3つ与える。" },
  { abbr: "封", name: "封印", icon: "/images/b03.gif", type: "補助（リミテッド）", speed: "LV", description: "相手に状態スタン」「狼狽」「衰弱」を与える。" },
  { abbr: "影", name: "影討", icon: "/images/b04.gif", type: "補助", speed: "LV", description: "相手が所持している先頭のスキルを1つ指定する。\nこのスキルを使用したラウンドの終了フェイズに、相手が所持している指定したスキルと同名のスキルを全て破壊する。" },
  { abbr: "交", name: "交錯", icon: "/images/c01.gif", type: "迎撃", speed: "LV-1", description: "相手に1点のダメージを与える。\nダメージの対象は、このスキルにダメージを与えた攻撃スキルである。" },
  { abbr: "搦", name: "搦手", icon: "/images/c02.gif", type: "迎撃", speed: "LV", description: "相手に状態「狼狽」を与える。" },
  { abbr: "待", name: "待伏", icon: "/images/c03.gif", type: "迎撃", speed: "0", description: "相手に2点のダメージを与える。" },
  { abbr: "玉", name: "玉響", icon: "/images/c04.gif", type: "迎撃", speed: "LV-1", description: "相手にX点のダメージを与える。\nXは、このスキルにダメージを与えた攻撃スキルの速度（最低0）である。" },
  { abbr: "崩", name: "崩技", icon: "/images/c05.gif", type: "迎撃", speed: "LV", description: "相手に状態「スタン」を与える。" },
  { abbr: "疫", name: "疫病", icon: "/images/c06.gif", type: "迎撃", speed: "LV", description: "相手の先頭のスキルがリミテッドでないならば、そのスキルを【疫病】に変化させる。" },
  { abbr: "強", name: "＋強", icon: "/images/d01.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルが与えるダメージは常に+1される。" },
  { abbr: "硬", name: "＋硬", icon: "/images/d02.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルが破壊される直前に効果を発揮する。そのスキルの破壊を無効にし、代わりにこのスキルを破壊する。" },
  { abbr: "速", name: "＋速", icon: "/images/d03.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃・補助・迎撃スキルの速度は常に+2される。" },
  { abbr: "反", name: "＋反", icon: "/images/d04.gif", type: "付帯", speed: "なし", description: "このスキルの直前の攻撃スキルは、常に迎撃スキルとして扱われる。" },
  { abbr: "盾", name: "＋盾", icon: "/images/d05.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃・補助スキルを使用する直前に効果を発揮する。\nそのスキルの効果に「あなたに状態「防壁」を2つ与える。」を追加する。\nこの効果は、攻撃・補助スキルによる「ダメージ以外の効果」として扱う。" },
  { abbr: "錬", name: "＋錬", icon: "/images/d06.gif", type: "付帯（リミテッド）", speed: "なし", description: "このスキルの直前の攻撃スキルを使用する直前に効果を発揮する。\nそのスキルが発生させたダメージによる迎撃スキルの発動を1回のみ無効にする。\nダメージを与えた迎撃スキルが発動条件を満たしていなくても、この効果は適用される。" },
  { abbr: "逆", name: "逆鱗", icon: "/images/d07.gif", type: "付帯", speed: "なし", description: "このスキルが破壊された直後に効果を発揮する。\nあなたに状態「逆鱗」を1つ与える。" },
  { abbr: "無", name: "無想", icon: "/images/d08.gif", type: "付帯（リミテッド）", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。\nあなたに状態「無想」を与える。" },
  { abbr: "裏", name: "裏霞", icon: "/images/d09.gif", type: "付帯", speed: "なし", description: "あなたが使用する攻撃・補助スキルを選択する直前に効果を発揮する。\nあなたが使用する攻撃・補助スキルは、あなたが所持している最後尾のスキルが選択される。" },
  { abbr: "先", name: "先制", icon: "/images/d10.gif", type: "付帯", speed: "なし", description: "第LVラウンドの開始フェイズに効果を発揮する。あなたに状態「先制」を与える。" },
  { abbr: "連", name: "連撃", icon: "/images/d11.gif", type: "付帯", speed: "なし", description: "第LVラウンドの終了フェイズ直前に効果を発揮する。あなたは攻撃フェイズをもう一度行うことができる。" },
  { abbr: "燐", name: "燐光", icon: "/images/d12.gif", type: "付帯", speed: "なし", description: "あなたの攻撃フェイズ開始直後に効果を発揮する。あなたと相手が受けている状態を全て解除する。" },
  { abbr: "空", name: "空白", icon: "/images/d13.gif", type: "付帯", speed: "なし", description: "何の効果も持たない。" },
];

export interface SkillDetail {
  abbr: string;
  name: string;
  icon: string;
  type: string;
  speed: string;
  description: string;
}

export const getSkillByAbbr = (abbr: string): SkillDetail | undefined => {
  return ALL_SKILLS.find(skill => skill.abbr === abbr);
};
