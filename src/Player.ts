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

    constructor(player_data: string) {
        const splitData = player_data.split("／");
        this.skillsRaw = splitData[0];
        if (splitData.length === 2) {
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

        for (let i = 0; i < rawSkills.length; i++) {
            this.skill[i] = rawSkills.substring(i, i + 1);

            this.name[i] = "　　";
            this.type[i] = Player.NONE;
            this.speed[i] = 0;
            this.damage[i] = 0;
            this.limited[i] = 0; // 0:リミテッドでない　1:リミテッド未使用　2:リミテッド使用済

            switch (this.skill[i]) {
                case "一":
                    this.name[i] = "一閃";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = i + 1;
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
                    this.damage[i] = i + 1;
                    break;
                case "剣":
                    this.name[i] = "剣舞";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = (i + 1) - 1;
                    this.damage[i] = 0; // 変数であるため0
                    if (this.speed[i] < 0) this.speed[i] = 0;
                    break;
                case "紫":
                    this.name[i] = "紫電";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = (i + 1) + 2;
                    this.damage[i] = 1;
                    break;
                case "呪":
                    this.name[i] = "呪詛";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = 1;
                    this.damage[i] = 1;
                    break;
                case "雷":
                    this.name[i] = "雷火";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = i + 1;
                    this.damage[i] = 2;
                    this.limited[i] = 1;
                    break;
                case "隠":
                    this.name[i] = "隠刃";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = i + 1;
                    this.damage[i] = 2;
                    break;
                case "怒":
                    this.name[i] = "怒濤";
                    this.type[i] = Player.ATTACK;
                    this.speed[i] = (i + 1) - 2;
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
                    this.speed[i] = i + 1;
                    this.limited[i] = 1;
                    break;
                case "防":
                    this.name[i] = "防壁";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = i + 1;
                    this.limited[i] = 1;
                    break;
                case "封":
                    this.name[i] = "封印";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = i + 1;
                    this.limited[i] = 1;
                    break;
                case "影":
                    this.name[i] = "影討";
                    this.type[i] = Player.BUFF;
                    this.speed[i] = 0;
                    break;
                case "交":
                    this.name[i] = "交錯";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = i;
                    this.damage[i] = 1;
                    break;
                case "搦":
                    this.name[i] = "搦手";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = i + 1;
                    this.damage[i] = 0;
                    break;
                case "待":
                    this.name[i] = "待伏";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = 0;
                    this.damage[i] = 2;
                    break;
                case "玉":
                    this.name[i] = "玉響";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = i;
                    this.damage[i] = 0; // 変数であるため0
                    break;
                case "崩":
                    this.name[i] = "崩技";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = i + 1;
                    this.damage[i] = 0;
                    break;
                case "疫":
                    this.name[i] = "疫病";
                    this.type[i] = Player.COUNTER;
                    this.speed[i] = i + 1;
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
        const skillsArray = this.skillsRaw.split("");
        this.skillsRaw = skillsArray.join("");
        this.initializeSkills(this.skillsRaw); // Re-initialize all skill properties based on new skillsRaw
    }

    getSkillsLength(): number {
        return this.skillsRaw.length;
    }

    // JavaのSkills.length()に対応するgetter
    getSkillsCount(): number {
        return this.skillsRaw.length;
    }
}
