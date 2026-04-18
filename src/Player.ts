export class Player {
    // プレイヤーデータ例：果硬交一強／ロングソード
    // Nick：略称　Name：スキル名　Type：種別　Speed：速度　Damage：ダメージ　Scar：ダメージカウンタ　Limited：リミテッド

    static NONE = 0;
    static ATTACK = 1;
    static COUNTER = 2;
    static ENCHANT = 3;
    static BUFF = 4;

    skillsRaw: string;
    playerName: string = "名もなき闘士"; // プレイヤー名
    skill: string[] = [];
    name: string[] = [];
    type: number[] = [];
    speed: number[] = [];
    damage: number[] = [];
    scar: number[] = []; // 0:なし 1:あり 2:適用前
    limited: number[] = [];
    kage: number[] = [];
    gekirin: number = 0; // 0:なし 1:あり 2:適用前
    musou: number = 0;
    stan: number = 0;
    kakuran: number = 0;
    suijaku: number = 0;
    roubai: number = 0;
    ekibyo: number = 0;
    kakugo: number = 0;
    sensei: number = 0;
    bouheki: number = 0;
    bouheki_: number = 0; // 防壁のフラグ用
    tate: number = 0;
    tyudoku: number = 0; // 中毒
    yakedo: number = 0; // 火傷
    kaifuku: number = 0;
    kyousou: number = 0;
    reika: number = 0;
    gouyoku: number = 0;
    gouman: number = 0;
    funnu: number = 0;
    boushoku: number = 0;
    taida: number = 0;
    shimon: number = 0;
    shitto: number = 0;
    shikiyoku: number = 0;
    nextLvUp: number = 0; // 協奏用
    gyogun: number = 0; // 魚群フラグ
    tozoku: number = 0; // 盗賊フラグ
    extremeHpRemaining: number[] = []; // 極限の残りHP
    
    constructor(player_data: string) {
        // 全角のスラッシュ「／」で分割
        const splitData = player_data.split("／");
        this.skillsRaw = splitData[0];
        if (splitData.length >= 2) {
            this.playerName = splitData[1];
        }
        this.initializeSkills(this.skillsRaw);
    }

    private initializeSkills(rawSkills: string): void {
        this.skill = [];
        this.name = [];
        this.type = [];
        this.speed = [];
        this.damage = [];
        this.limited = [];
        this.scar = []; // Reset scar as well on re-initialization
        this.kage = []; // Reset kage as well
        this.extremeHpRemaining = [];
        // Reset other status effects if necessary for a fresh start
        this.gekirin = 0;
        this.musou = 0;
        this.stan = 0;
        this.kakuran = 0;
        this.suijaku = 0;
        this.roubai = 0;
        this.ekibyo = 0;
        this.kakugo = 0;
        this.sensei = 0;
        this.bouheki = 0;
        this.bouheki_ = 0;
        this.tate = 0;
        this.tyudoku = 0;
        this.yakedo = 0;
        this.kaifuku = 0;
        this.kyousou = 0;
        this.reika = 0;
        this.gouyoku = 0;
        this.gouman = 0;
        this.funnu = 0;
        this.boushoku = 0;
        this.taida = 0;
        this.shimon = 0;
        this.shitto = 0;
        this.shikiyoku = 0;
        this.nextLvUp = 0;
        this.gyogun = 0;
        this.tozoku = 0;
        
        for (let i = 0; i < rawSkills.length; i++) {
            this.skill[i] = rawSkills.substring(i, i + 1);
            const level = this.getSkillLevel(i);

            this.name[i] = "　　";
            this.type[i] = Player.NONE;
            this.speed[i] = 0;
            this.damage[i] = 0;
            this.limited[i] = 0; // 0:リミテッドでない　1:リミテッド未使用　2:リミテッド使用済
            this.extremeHpRemaining[i] = 0;

            switch (this.skill[i]) {
                case "一":
                    this.name[i] = "一閃";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = 1;
                    break;
                case "刺":
                    this.name[i] = "刺突";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = 1;
                    break;
                case "果":
                    this.name[i] = "果断";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = level;
                    break;
                case "剣":
                    this.name[i] = "剣舞";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 1;
                    this.damage[i] = 0; // 変数であるため0
                    if (this.speed[i] < 0) this.speed[i] = 0;
                    break;
                case "紫":
                    this.name[i] = "紫電";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level + 2;
                    this.damage[i] = 1;
                    break;
                case "呪":
                    this.name[i] = "呪詛";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 2;
                    this.damage[i] = 1;
                    if (this.speed[i] < 0) this.speed[i] = 0;
                    break;
                case "雷":
                    this.name[i] = "雷火";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = 2;
                    this.limited[i] = 1;
                    break;
                case "隠":
                    this.name[i] = "隠刃";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = 2;
                    break;
                case "怒":
                    this.name[i] = "怒濤";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 2;
                    this.damage[i] = 0; // 変数であるため0
                    if (this.speed[i] < 0) this.speed[i] = 0;
                    break;
                case "弱":
                    this.name[i] = "弱撃";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 0;
                    this.damage[i] = 1;
                    break;
                case "覚":
                    this.name[i] = "覚悟";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    this.limited[i] = 1;
                    break;
                case "防":
                    this.name[i] = "防壁";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    this.limited[i] = 1;
                    break;
                case "封":
                    this.name[i] = "封印";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    this.limited[i] = 1;
                    break;
                case "影":
                    this.name[i] = "影討";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    break;
                case "交":
                    this.name[i] = "交錯";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level - 1;
                    this.damage[i] = 1;
                    break;
                case "搦":
                    this.name[i] = "搦手";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    this.damage[i] = 0;
                    break;
                case "待":
                    this.name[i] = "待伏";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = 1;
                    this.damage[i] = 2;
                    break;
                case "玉":
                    this.name[i] = "玉響";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level - 1;
                    this.damage[i] = 0; // 変数であるため0
                    break;
                case "崩":
                    this.name[i] = "崩技";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    this.damage[i] = 0;
                    break;
                case "疫":
                    this.name[i] = "疫病";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    this.damage[i] = 0;
                    break;
                case "強":
                    this.name[i] = "＋強";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "硬":
                    this.name[i] = "＋硬";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "速":
                    this.name[i] = "＋速";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "反":
                    this.name[i] = "＋反";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "盾":
                    this.name[i] = "＋盾";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    this.limited[i] = 1;
                    break;
                case "錬":
                    this.name[i] = "＋錬";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    this.limited[i] = 1;
                    break;
                case "逆":
                    this.name[i] = "逆鱗";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "無":
                    this.name[i] = "無想";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    this.limited[i] = 1;
                    break;
                case "裏":
                    this.name[i] = "裏霞";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "先":
                    this.name[i] = "先制";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "連":
                    this.name[i] = "連撃";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "燐":
                    this.name[i] = "燐光";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "空":
                    this.name[i] = "空白";
                    this.type[i] = Player.ENCHANT;
                    this.speed[i] = 0;
                    break;
                case "瘴":
                    this.name[i] = "瘴気";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 1;
                    this.damage[i] = 0; // 変数
                    break;
                case "拳":
                    this.name[i] = "鉄拳";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 3;
                    this.damage[i] = 1; // 変数
                    break;
                case "烈":
                    this.name[i] = "烈風";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 1;
                    this.damage[i] = 1;
                    break;
                case "滅":
                    this.name[i] = "撃滅";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = 1;
                    break;
                case "砲":
                    this.name[i] = "艦砲";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 0;
                    this.damage[i] = 3;
                    break;
                case "死":
                    this.name[i] = "死神";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level - 1;
                    this.damage[i] = 0; // 変数
                    break;
                case "焦":
                    this.name[i] = "焦熱";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = 1;
                    break;
                case "毒":
                    this.name[i] = "蟲毒";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = 0;
                    break;
                case "医":
                    this.name[i] = "医術";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    break;
                case "凍":
                    this.name[i] = "凍結";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    break;
                case "奏":
                    this.name[i] = "協奏";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = level;
                    break;
                case "盗":
                    this.name[i] = "盗賊";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = 0;
                    this.limited[i] = 1;
                    break;
                case "幻":
                    this.name[i] = "幻惑";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "水":
                    this.name[i] = "水幕";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level - 1;
                    break;
                case "転":
                    this.name[i] = "転回";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level + 2;
                    break;
                case "罠":
                    this.name[i] = "罠師";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = 0;
                    this.damage[i] = 3;
                    break;
                case "受":
                    this.name[i] = "受難";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "飛":
                    this.name[i] = "飛行";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "円":
                    this.name[i] = "円環";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "礁":
                    this.name[i] = "座礁";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "霊":
                    this.name[i] = "霊化";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "光":
                    this.name[i] = "＋光";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "翔":
                    this.name[i] = "＋翔";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "弓":
                    this.name[i] = "＋弓";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "狼":
                    this.name[i] = "狼嵐";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = level;
                    this.limited[i] = 1;
                    break;
                case "▽":
                    this.name[i] = "▽解";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = 1;
                    this.limited[i] = 1;
                    break;
                case "爆":
                    this.name[i] = "爆砕";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = level;
                    this.limited[i] = 1;
                    break;
                case "魔":
                    this.name[i] = "魔弾";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = level;
                    this.damage[i] = 1;
                    this.limited[i] = 1;
                    break;
                case "傲":
                    this.name[i] = "傲慢";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "欲":
                    this.name[i] = "強欲";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "嫉":
                    this.name[i] = "嫉妬";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "憤":
                    this.name[i] = "憤怒";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "色":
                    this.name[i] = "色欲";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "暴":
                    this.name[i] = "暴食";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = level;
                    break;
                case "怠":
                    this.name[i] = "怠惰";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = 0;
                    break;
                case "極":
                    this.name[i] = "極限";
                    this.type[i] = Player.ENCHANT;
                    this.extremeHpRemaining[i] = 1000;
                    break;
                case "掌":
                    this.name[i] = "掌握";
                    this.type[i] = Player.ENCHANT;
                    break;
                case "Ｈ":
                    this.name[i] = "ＨＰ";
                    this.type[i] = Player.ENCHANT;
                    break;
                default:
                    break;
            }
            this.scar[i] = 0;
        }
    }

    // Fisher-Yates shuffle algorithm
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    shuffleSkills(): void {
        // スキル文字列部分のみを取り出す
        const skillsArray = this.skillsRaw.split("");
        // シャッフルロジック（現在は順番維持のためコメントアウト、または必要に応じて実装）
        // this.shuffleArray(skillsArray);
        this.skillsRaw = skillsArray.join("");
        this.initializeSkills(this.skillsRaw); // Re-initialize all skill properties based on new skillsRaw
    }

    getSkillsLength(): number {
        return this.skillsRaw.length;
    }

    getSkillLevel(idx: number): number {
        let level = idx + 1;
        for (let i = 0; i < idx; i++) {
            if (this.skill[i] === "極") level += 999;
        }
        return level;
    }

    // JavaのSkills.length()に対応するgetter
    getSkillsCount(): number {
        return this.skillsRaw.length;
    }
}
