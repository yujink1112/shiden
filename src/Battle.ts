import { Player } from './Player';

export class Battle {
    static SHORT: number = 0; // 0=短縮しない 1=短縮する

    dataPc1: string;
    dataPc2: string;
    text: string = "";

    private turn: number;
    public pc1: Player | null = null;
    public pc2: Player | null = null;

    constructor(pc1Data: string, pc2Data: string) {
        this.dataPc1 = pc1Data;
        this.dataPc2 = pc2Data;
        this.turn = 1; // Initialize turn here
    }

    start(): number {
        // setting.txtの読み込みはWeb環境では別の方法で行うか、定数として扱う
        // 今回は直接値を使用
        Battle.SHORT = 0;

        this.pc1 = new Player(this.dataPc1);
        this.pc2 = new Player(this.dataPc2);
        const pc1 = this.pc1;
        const pc2 = this.pc2;

        this.text += "=============================================\n\n";
        this.text += pc1.playerName + "　VS　" + pc2.playerName + "\n\n";

        this.text += "――戦闘開始――\n\n";

        for (this.turn = 1; this.turn >= 0; this.turn++) { // ターンカウント（無限ループ）

            let sta1 = 0; let sta2 = 0;
            let statusPc1 = ""; let statusPc2 = "";

            this.text += `【第${this.turn}ラウンド】\n\n`;

            if (Battle.SHORT === 0) {
                for (let i = 0; i < pc1.getSkillsLength(); i++) this.text += `【${pc1.name[i]}】`;
            } else {
                for (let i = 0; i < pc1.getSkillsLength(); i++) this.text += pc1.skill[i];
            }

            this.text += `／${pc1.playerName}`;

            if (pc1.stan === 1) { sta1 = 1; statusPc1 += "ス"; }
            if (pc1.roubai === 1) { sta1 = 1; statusPc1 += "狼"; }
            if (pc1.suijaku === 1) { sta1 = 1; statusPc1 += "忘"; }
            if (pc1.kakugo === 1) { sta1 = 1; statusPc1 += "覚"; }
            if (pc1.bouheki >= 1) { sta1 = 1; for (let i = 0; i < pc1.bouheki; i++) statusPc1 += "防"; }
            if (pc1.gekirin >= 1) { sta1 = 1; for (let i = 0; i < pc1.gekirin; i++) statusPc1 += "逆"; }
            if (pc1.musou === 1) { sta1 = 1; statusPc1 += "無"; }
            if (pc1.sensei === 1) { sta1 = 1; statusPc1 += "先"; }

            if (sta1 === 1) this.text += `〔${statusPc1}〕`;

            this.text += "\n";

            if (Battle.SHORT === 0) {
                for (let i = 0; i < pc2.getSkillsLength(); i++) this.text += `【${pc2.name[i]}】`;
            } else {
                for (let i = 0; i < pc2.getSkillsLength(); i++) this.text += pc2.skill[i];
            }


            this.text += `／${pc2.playerName}`;

            if (pc2.stan === 1) { sta2 = 1; statusPc2 += "ス"; }
            if (pc2.roubai === 1) { sta2 = 1; statusPc2 += "狼"; }
            if (pc2.suijaku === 1) { sta2 = 1; statusPc2 += "忘"; }
            if (pc2.kakugo === 1) { sta2 = 1; statusPc2 += "覚"; }
            if (pc2.bouheki >= 1) { sta2 = 1; for (let i = 0; i < pc2.bouheki; i++) statusPc2 += "防"; }
            if (pc2.gekirin >= 1) { sta2 = 1; for (let i = 0; i < pc2.gekirin; i++) statusPc2 += "逆"; }
            if (pc2.musou === 1) { sta2 = 1; statusPc2 += "無"; }
            if (pc2.sensei === 1) { sta2 = 1; statusPc2 += "先"; }

            if (sta2 === 1) this.text += `〔${statusPc2}〕`;

            this.text += "\n";

            // 開始フェイズ

            let startFlag = 0; // 出力用

            this.text += "\n";
            this.text += "▼開始フェイズ\n";
            this.text += "\n";

            this.rinko(pc1);
            this.rinko(pc2);

            if (this.turn <= pc1.getSkillsLength()) {

                if (pc1.skill[this.turn - 1] === "無") {
                    this.text += `${pc1.playerName}の【${pc1.name[this.turn - 1]}】${this.turn}が発動！\n`;
                    this.text += `＞${pc1.playerName}に無想が与えられた！\n`;
                    pc1.musou = 1;
                    pc1.limited[this.turn - 1] = 2;
                    startFlag = 1;
                }

                if (pc1.skill[this.turn - 1] === "先") {
                    this.text += `${pc1.playerName}の【${pc1.name[this.turn - 1]}】${this.turn}が発動！\n`;
                    this.text += `＞${pc1.playerName}に先制が与えられた！\n`;
                    pc1.sensei = 1;
                    startFlag = 1;
                }

            }

            if (this.turn <= pc2.getSkillsLength()) {
                if (pc2.skill[this.turn - 1] === "無") {
                    this.text += `${pc2.playerName}の【${pc2.name[this.turn - 1]}】${this.turn}が発動！\n`;
                    this.text += `＞${pc2.playerName}に無想が与えられた！\n`;
                    pc2.musou = 1;
                    pc2.limited[this.turn - 1] = 2;
                    startFlag = 1;
                }

                if (pc2.skill[this.turn - 1] === "先") {
                    this.text += `${pc2.playerName}の【${pc2.name[this.turn - 1]}】${this.turn}が発動！\n`;
                    this.text += `＞${pc2.playerName}に先制が与えられた！\n`;
                    pc2.sensei = 1;
                    startFlag = 1;
                }

            }

            if (startFlag === 1) this.text += "\n";

            // 先攻決定フェイズ

            this.text += "▼先攻決定フェイズ\n";
            this.text += "\n";

            let speedPc1 = 0; let speedPc2 = 0;
            let speedBufPc1 = 0; let speedBufPc2 = 0;

            for (let i = 0; i < pc1.getSkillsLength(); i++) {

                speedBufPc1 = 0; speedBufPc2 = 0;

                if (pc1.stan === 1 && pc2.stan === 0) {
                    this.text += "スタン！ 　速度：－ ";
                    speedPc1 = -999;
                    break;
                }

                if (pc1.sensei === 1 && pc2.sensei === 0) {
                    this.text += "先制！　 　速度：－ ";
                    speedPc1 = 999;
                    break;
                }

                if (pc1.type[i] === Player.ATTACK && !(i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "反") && !(pc1.skill[i] === "隠" && Math.floor(this.turn / 2) * 2 !== this.turn)) {

                    if (pc1.skill[i] === "剣") {
                        pc1.damage[i] = 0;
                        for (let j = 0; j < pc1.getSkillsLength(); j++) {
                            if (pc1.type[j] === Player.ATTACK && !(j < pc1.getSkillsLength() - 1 && pc1.skill[j + 1] === "反")) {
                                pc1.damage[i]++;
                            }
                        }
                        if (pc1.speed[i] < 0) pc1.speed[i] = 0;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "速") speedBufPc1 += 1;
                    if (pc1.kakugo === 1) speedBufPc1 += 2;

                    this.text += `【${pc1.name[i]}】${i + 1}　速度：${pc1.speed[i] + speedBufPc1}　`;
                    speedPc1 = pc1.speed[i] + speedBufPc1;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "速") speedBufPc1 += 1;

                    this.text += `【${pc1.name[i]}】${i + 1}　速度：${pc1.speed[i] + speedBufPc1}　`;
                    speedPc1 = pc1.speed[i] + speedBufPc1;
                    break;
                }

                if (i === pc1.getSkillsLength() - 1) {
                    this.text += "スキルなし 速度：0　";
                    speedPc1 = 0;
                    break;

                }
            }

            this.text += `／${pc1.playerName}\n`;


            for (let i = 0; i < pc2.getSkillsLength(); i++) {

                if (pc2.stan === 1 && pc1.stan === 0) {
                    this.text += "スタン！ 　速度：－ ";
                    speedPc2 = -999;
                    break;
                }


                if (pc2.sensei === 1 && pc1.sensei === 0) {
                    this.text += "先制！ 　　速度：－ ";
                    speedPc2 = 999;
                    break;
                }


                if (pc2.type[i] === Player.ATTACK && !(i < pc2.getSkillsLength() - 1 && pc2.skill[i + 1] === "反") && !(pc2.skill[i] === "隠" && Math.floor(this.turn / 2) * 2 !== this.turn)) {

                    if (pc2.skill[i] === "剣") {
                        pc2.damage[i] = 0;
                        for (let j = 0; j < pc2.getSkillsLength(); j++) {
                            if (pc2.type[j] === Player.ATTACK && !(j < pc1.getSkillsLength() - 1 && pc1.skill[j + 1] === "反")) {
                                pc2.damage[i]++;
                            }
                        }
                        if (pc2.speed[i] < 0) pc2.speed[i] = 0;
                    }

                    if (i < pc2.getSkillsLength() - 1 && pc2.skill[i + 1] === "速") speedBufPc2 += 1;
                    if (pc2.kakugo === 1) speedBufPc2 += 2;

                    this.text += `【${pc2.name[i]}】${i + 1}　速度：${pc2.speed[i] + speedBufPc2}　`;
                    speedPc2 = pc2.speed[i] + speedBufPc2;
                    break;
                }

                if (pc2.type[i] === Player.BUFF) {
                    if (i < pc2.getSkillsLength() - 1 && pc2.skill[i + 1] === "速") speedBufPc2 += 1;

                    this.text += `【${pc2.name[i]}】${i + 1}　速度：${pc2.speed[i] + speedBufPc2}　`;
                    speedPc2 = pc2.speed[i] + speedBufPc2;
                    break;
                }

                if (i === pc2.getSkillsLength() - 1) {
                    this.text += "スキルなし 速度：0　";
                    speedPc2 = 0;
                    break;

                }
            }

            this.text += `／${pc2.playerName}\n`;

            let judgeResult: number;
            this.text += "\n";
            if (speedPc1 > speedPc2) {
                this.text += `${pc1.playerName}の先攻！\n`;
                this.text += "\n";

                this.text += `▼${pc1.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                
                this.attack(pc1, pc2);
                this.text += "\n";
                if (this.effect(pc1, pc2) + this.effect(pc2, pc1) >= 1) this.text += "\n";
                if (this.breakup(pc1) + this.breakup(pc2) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 2);
                if (judgeResult > 0) return judgeResult;

                this.text += `▼${pc2.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc2, pc1);
                this.text += "\n";
                if (this.effect(pc2, pc1) + this.effect(pc1, pc2) >= 1) this.text += "\n";
                if (this.breakup(pc2) + this.breakup(pc1) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 1);
                if (judgeResult > 0) return judgeResult;
            }

            if (speedPc1 < speedPc2) {
                this.text += `${pc2.playerName}の先攻！\n`;
                this.text += "\n";

                this.text += `▼${pc2.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc2, pc1);
                this.text += "\n";
                if (this.effect(pc2, pc1) + this.effect(pc1, pc2) >= 1) this.text += "\n";
                if (this.breakup(pc2) + this.breakup(pc1) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 1);
                if (judgeResult > 0) return judgeResult;

                this.text += `▼${pc1.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc1, pc2);
                this.text += "\n";
                if (this.effect(pc1, pc2) + this.effect(pc2, pc1) >= 1) this.text += "\n";
                if (this.breakup(pc1) + this.breakup(pc2) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 2);
                if (judgeResult > 0) return judgeResult;
            }

            // ルール変更: 速度同値の場合、常にプレイヤーが先攻
            if (speedPc1 === speedPc2) {
                this.text += `${pc1.playerName}の先攻！（速度同値のため）\n`;
                this.text += "\n";

                this.text += `▼${pc1.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc1, pc2);
                this.text += "\n";
                if (this.effect(pc1, pc2) + this.effect(pc2, pc1) >= 1) this.text += "\n";
                if (this.breakup(pc1) + this.breakup(pc2) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 2);
                if (judgeResult > 0) return judgeResult;

                this.text += `▼${pc2.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc2, pc1);
                this.text += "\n";
                if (this.effect(pc2, pc1) + this.effect(pc1, pc2) >= 1) this.text += "\n";
                if (this.breakup(pc2) + this.breakup(pc1) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 1);
                if (judgeResult > 0) return judgeResult;
            }


            // 連撃の発動タイミング (ラウンド制限を撤廃: 所持していれば毎ラウンド発動)

            let rengekiPc1 = 0; let rengekiPc2 = 0;

            for (let i = 0; i < pc1.getSkillsLength(); i++) {
                if (pc1.skill[i] === "連") {
                    this.text += "\n";
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が発動！\n`;
                    rengekiPc1 = 1;
                    break;
                }
            }

            for (let i = 0; i < pc2.getSkillsLength(); i++) {
                if (pc2.skill[i] === "連") {
                    this.text += "\n";
                    this.text += `${pc2.playerName}の【${pc2.name[i]}】${i + 1}が発動！\n`;
                    rengekiPc2 = 1;
                    break;
                }
            }

            if (rengekiPc1 === 1) {
                this.text += "\n";
                this.text += `▼${pc1.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc1, pc2);
                this.text += "\n";
                if (this.effect(pc1, pc2) + this.effect(pc2, pc1) >= 1) this.text += "\n";
                if (this.breakup(pc1) + this.breakup(pc2) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 2);
                if (judgeResult > 0) return judgeResult;
            }

            if (rengekiPc2 === 1) {
                this.text += "\n";
                this.text += `▼${pc2.playerName}の攻撃フェイズ\n`;
                this.text += "\n";
                this.attack(pc2, pc1);
                this.text += "\n";
                if (this.effect(pc2, pc1) + this.effect(pc1, pc2) >= 1) this.text += "\n";
                if (this.breakup(pc2) + this.breakup(pc1) >= 1) this.text += "\n";
                judgeResult = this.judge(pc1, pc2, 1);
                if (judgeResult > 0) return judgeResult;
            }

            //↓終了フェイズ

            let endFlag = 0; // 出力用

            this.text += "▼終了フェイズ\n";
            this.text += "\n";

            const endLogBefore = this.text;

            // 無想の解除

            if (pc1.musou === 1) {
                this.text += `${pc1.playerName}の無想が解除された！\n`;
                pc1.musou = 0;
                endFlag = 1;
            }

            if (pc2.musou === 1) {
                this.text += `${pc2.playerName}の無想が解除された！\n`;
                pc2.musou = 0;
                endFlag = 1;
            }

            // 先制の解除

            if (pc1.sensei === 1) {
                this.text += `${pc1.playerName}の先制が解除された！\n`;
                pc1.sensei = 0;
                endFlag = 1;
            }

            if (pc2.sensei === 1) {
                this.text += `${pc2.playerName}の先制が解除された！\n`;
                pc2.sensei = 0;
                endFlag = 1;
            }

            // 影討の処理

            for (let i = 0; i < pc1.getSkillsLength(); i++) {
                if (pc1.kage[i] === 1) {
                    pc1.kage[i] = 0;
                    pc1.scar[i] = 1;
                }
            }

            for (let i = 0; i < pc2.getSkillsLength(); i++) {
                if (pc2.kage[i] === 1) {
                    pc2.kage[i] = 0;
                    pc2.scar[i] = 1;
                }
            }


            // リミテッドの処理

            for (let i = 0; i < pc1.getSkillsLength(); i++) {
                if (pc1.limited[i] === 2) {
                    pc1.limited[i] = 1;
                    pc1.scar[i] = 1;
                }
            }

            for (let i = 0; i < pc2.getSkillsLength(); i++) {
                if (pc2.limited[i] === 2) {
                    pc2.limited[i] = 1;
                    pc2.scar[i] = 1;
                }
            }

            if (this.breakup(pc1) + this.breakup(pc2) >= 1) endFlag = 1;

            // 忘却の処理
            if (pc1.suijaku === 1) {
                for (let i = 0; i < pc1.getSkillsLength(); i++) {
                    if (pc1.type[i] !== Player.NONE && pc1.skill[i] !== "空") {
                        this.text += `忘却の効果で${pc1.playerName}の【${pc1.name[i]}】${i + 1}が【空白】${i + 1}に変化した！\n`;

                        pc1.skill[i] = "空";
                        pc1.name[i] = "空白";
                        pc1.type[i] = Player.ENCHANT;
                        pc1.speed[i] = 0;
                        pc1.damage[i] = 0;
                        pc1.scar[i] = 0;
                        pc1.limited[i] = 0;

                        endFlag = 1;
                        break;
                    }
                }
            }

            if (pc2.suijaku === 1) {
                for (let i = 0; i < pc2.getSkillsLength(); i++) {
                    if (pc2.type[i] !== Player.NONE && pc2.skill[i] !== "空") {
                        this.text += `忘却の効果で${pc2.playerName}の【${pc2.name[i]}】${i + 1}が【空白】${i + 1}に変化した！\n`;

                        pc2.skill[i] = "空";
                        pc2.name[i] = "空白";
                        pc2.type[i] = Player.ENCHANT;
                        pc2.speed[i] = 0;
                        pc2.damage[i] = 0;
                        pc2.scar[i] = 0;
                        pc2.limited[i] = 0;

                        endFlag = 1;
                        break;
                    }
                }
            }

            if (this.text === endLogBefore) {
                this.text += "なし\n";
            }

            if (endFlag === 1) this.text += "\n";

            judgeResult = this.judge(pc1, pc2, 3);
            if (judgeResult > 0) return judgeResult;

            this.text += "\n";

        }

        return 0;
    }

    rinko(pc1: Player): void {

        for (let i = 0; i < pc1.getSkillsLength(); i++) {
            if (pc1.skill[i] === "燐") {
                this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が発動！\n`;

                if (pc1.stan === 1) {
                    this.text += `＞${pc1.playerName}のスタンが解除された！\n`;
                    pc1.stan = 0;
                }
                if (pc1.suijaku === 1) {
                    this.text += `＞${pc1.playerName}の忘却が解除された！\n`;
                    pc1.suijaku = 0;
                }
                // if (pc1.roubai === 1) {
                //     this.text += `＞${pc1.playerName}の狼狽が解除された！\n`;
                //     pc1.roubai = 0;
                // }
                // if (pc1.kakugo === 1) {
                //     this.text += `＞${pc1.playerName}の覚悟が解除された！\n`;
                //     pc1.kakugo = 0;
                // }
                // if (pc1.bouheki >= 1) {
                //     this.text += `＞${pc1.playerName}の防壁が解除された！\n`;
                //     pc1.bouheki = 0;
                // }
                // if (pc1.gekirin >= 1) {
                //     this.text += `＞${pc1.playerName}の逆鱗が解除された！\n`;
                //     pc1.gekirin = 0;
                // }
                // if (pc1.musou === 1) {
                //     this.text += `＞${pc1.playerName}の無想が解除された！\n`;
                //     pc1.musou = 0;
                // }
                // if (pc1.sensei === 1) {
                //     this.text += `＞${pc1.playerName}の先制が解除された！\n`;
                //     pc1.sensei = 0;
                // }


                // if (pc2.stan === 1) {
                //     this.text += `＞${pc2.playerName}のスタンが解除された！\n`;
                //     pc2.stan = 0;
                // }
                // if (pc2.suijaku === 1) {
                //     this.text += `＞${pc2.playerName}の忘却が解除された！\n`;
                //     pc2.suijaku = 0;
                // }
                // if (pc2.roubai === 1) {
                //     this.text += `＞${pc2.playerName}の狼狽が解除された！\n`;
                //     pc2.roubai = 0;
                // }
                // if (pc2.kakugo === 1) {
                //     this.text += `＞${pc2.playerName}の覚悟が解除された！\n`;
                //     pc2.kakugo = 0;
                // }
                // if (pc2.bouheki >= 1) {
                //     this.text += `＞${pc2.playerName}の防壁が解除された！\n`;
                //     pc2.bouheki = 0;
                // }
                // if (pc2.gekirin >= 1) {
                //     this.text += `＞${pc2.playerName}の逆鱗が解除された！\n`;
                //     pc2.gekirin = 0;
                // }
                // if (pc2.musou === 1) {
                //     this.text += `＞${pc2.playerName}の無想が解除された！\n`;
                //     pc2.musou = 0;
                // }
                // if (pc2.sensei === 1) {
                //     this.text += `＞${pc2.playerName}の先制が解除された！\n`;
                //     pc2.sensei = 0;
                // }

                this.text += "\n";
                break;
            }
        }

    }

    attack(pc1: Player, pc2: Player): void {

        let i: number; // For initial skill determination loops
        let j: number; // For nested loops

        let use = 0;
        let damage = 0; let damageBuf = 0;
        let bonda = 0;
        let uragasumi = 0;
        let speedPc1 = 0; // let speedPc2 = 0; (未使用)
        let speedBufPc1 = 0; // let speedBufPc2 = 0; (未使用)

        // 攻撃スキル指定

        for (i = 0; i < pc1.getSkillsLength(); i++) {
            if (pc1.skill[i] === "裏") {
                this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が発動！\n`;
                this.text += "\n";
                uragasumi = 1;
                break;
            }
        }

        if (uragasumi === 0) {

            for (i = 0; i < pc1.getSkillsLength(); i++) {

                if (pc1.type[i] === Player.ATTACK && !(i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "反") && !(pc1.skill[i] === "隠" && Math.floor(this.turn / 2) * 2 !== this.turn)) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;


                    // リミテッド処理
                    if (pc1.limited[i] === 1) pc1.limited[i] = 2;

                    if (pc1.skill[i] === "剣") {
                        pc1.damage[i] = 0;
                        for (j = 0; j < pc1.getSkillsLength(); j++) {
                            if (pc1.type[j] === Player.ATTACK && !(j < pc1.getSkillsLength() - 1 && pc1.skill[j + 1] === "反")) {
                                pc1.damage[i]++;
                            }
                        }
                        if (pc1.speed[i] < 0) pc1.speed[i] = 0;
                    }

                    if (pc1.skill[i] === "怒") {
                        pc1.damage[i] = this.turn;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "強") {
                        this.text += `＞【＋強】${i + 2}の効果でダメージが1点上昇！\n`;
                        damageBuf++;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "速") {
                        this.text += `＞【＋速】${i + 2}の効果で速度に+1！\n`;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "錬") {
                        this.text += `＞【＋錬】${i + 2}の効果で迎撃スキルの発動を1回のみ無効に！\n`;
                        pc1.limited[i + 1] = 2;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "盾") {
                        this.text += `＞【＋盾】${i + 2}の効果で防壁が2つ与えられる！\n`;
                        pc1.limited[i + 1] = 2;
                    }

                    if (pc1.kakugo === 1) {
                        this.text += `＞覚悟の効果でダメージが1点上昇！速度に+2！\n`;
                        damageBuf++;
                    }

                    if (pc1.gekirin > 0) {
                        this.text += `＞逆鱗の効果でダメージが${pc1.gekirin}点上昇！\n`;
                        damageBuf += pc1.gekirin;
                        pc1.gekirin = 0;
                    }

                    // 狼狽時メッセージ
                    if (pc1.roubai === 1) this.text += "＞狼狽の効果で速度が0になっている！\n";

                    damage = pc1.damage[i] + damageBuf;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "盾") {
                        this.text += `＞【＋盾】${i + 2}の効果で防壁が2つ与えられる！\n`;
                        pc1.limited[i + 1] = 2;
                    }

                    // リミテッド処理
                    if (pc1.limited[i] === 1) pc1.limited[i] = 2;
                    break;
                }


                if (i === pc1.getSkillsLength() - 1) {
                    this.text += `${pc1.playerName}の【弱撃】0！\n`;
                    bonda = 1;
                    damage = 1;
                    break;
                }
            }

            use = i;
        }

        // 裏霞発動時の処理

        if (uragasumi === 1) {

            for (i = pc1.getSkillsLength() - 1; i >= 0; i--) {

                if (pc1.type[i] === Player.ATTACK && !(i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "反") && !(pc1.skill[i] === "隠" && Math.floor(this.turn / 2) * 2 !== this.turn)) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;


                    // リミテッド処理
                    if (pc1.limited[i] === 1) pc1.limited[i] = 2;

                    if (pc1.skill[i] === "剣") {
                        pc1.damage[i] = 0;
                        for (j = 0; j < pc1.getSkillsLength(); j++) {
                            if (pc1.type[j] === Player.ATTACK && !(j < pc1.getSkillsLength() - 1 && pc1.skill[j + 1] === "反")) {
                                pc1.damage[i]++;
                            }
                        }
                        if (pc1.speed[i] < 0) pc1.speed[i] = 0;
                    }

                    if (pc1.skill[i] === "怒") {
                        pc1.damage[i] = this.turn;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "強") {
                        this.text += `＞【＋強】${i + 2}の効果でダメージが1点上昇！\n`;
                        damageBuf++;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "速") {
                        this.text += `＞【＋速】${i + 2}の効果で速度に+1！\n`;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "錬") {
                        this.text += `＞【＋錬】${i + 2}の効果で迎撃スキルの発動を1回のみ無効に！\n`;
                        pc1.limited[i + 1] = 2;
                    }

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "盾") {
                        this.text += `＞【＋盾】${i + 2}の効果で防壁が2つ与えられる！\n`;
                    }


                    if (pc1.kakugo === 1) {
                        this.text += `＞覚悟の効果でダメージが1点上昇！速度に+2！\n`;
                        damageBuf++;
                    }

                    if (pc1.gekirin > 0) {
                        this.text += `＞逆鱗の効果でダメージが${pc1.gekirin}点上昇！\n`;
                        damageBuf += pc1.gekirin;
                        pc1.gekirin = 0;
                    }

                    // 狼狽時メッセージ
                    if (pc1.roubai === 1) this.text += "＞狼狽の効果で速度が0になっている！\n";

                    damage = pc1.damage[i] + damageBuf;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;

                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "盾") {
                        this.text += `＞【＋盾】${i + 2}の効果で防壁が2つ与えられる！\n`;
                    }

                    // リミテッド処理
                    if (pc1.limited[i] === 1) pc1.limited[i] = 2;
                    break;
                }

                if (i === 0) {
                    this.text += `${pc1.playerName}の【弱撃】0！\n`;
                    bonda = 1;
                    damage = 1;
                    break;
                }
            }

            use = i;
        }

        // 攻撃側の速度決定

        if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "速") speedBufPc1 += 1;
        if (pc1.kakugo === 1) speedBufPc1 += 2;
        speedPc1 = pc1.speed[use] + speedBufPc1;
        if (pc1.roubai === 1) speedPc1 = 0;
        if (bonda === 1) speedPc1 = 0;

        if (damage > 0) this.text += `＞${pc2.playerName}に${damage}点のダメージ！（速度：${speedPc1}）\n\n`;

        // ダメージの処理

        let target = 0; // 攻撃スキルの対象
        let suspend = 0; // 攻撃側への攻撃中断フラグ
        let counterOn = 0; // 迎撃スキルが発動したか否か
        let penetrate = 0; // ＋錬用フラグ

        for (let i_damage_loop = 0; i_damage_loop < damage; i_damage_loop++) {

            if (pc2.musou === 1) {
                this.text += `＞${pc2.playerName}は無想の効果でダメージを受けない！\n`;
                break;
            }

            if (pc2.bouheki >= 1) {
                this.text += `＞${pc2.playerName}は防壁の効果でダメージを受けない！\n`;
                const removeCount = Math.ceil(pc2.bouheki / 2);
                this.text += `＞${pc2.playerName}の防壁が${removeCount}個解除された！\n`;
                pc2.bouheki -= removeCount;
                break;
            }

            // 目標指定
            target = 0;
            suspend = 0;
            for (let j = 0; j < pc2.getSkillsLength(); j++) {
                if (pc2.type[j] !== Player.NONE && pc2.scar[j] !== 2) {
                    target = j;
                    break;
                }
                if (j === pc2.getSkillsLength() - 1) {
                    suspend = 1;
                    break;
                }
            }

            // 目標指定（刺）
            if (pc1.skill[use] === "刺") {
                let bestDiff = 999;
                let bestTarget = -1;
                let useLV = use + 1;

                // 全ての有効なスキルをチェック
                for (let j = 0; j < pc2.getSkillsLength(); j++) {
                    if (pc2.type[j] !== Player.NONE && pc2.scar[j] !== 2) {
                        let targetLV = j + 1;
                        let diff = Math.abs(useLV - targetLV);

                        if (diff < bestDiff) {
                            bestDiff = diff;
                            bestTarget = j;
                        } else if (diff === bestDiff) {
                            // 同じ差なら、より高いLV（インデックスが大きい方）を優先
                            if (targetLV > (bestTarget + 1)) {
                                bestTarget = j;
                            }
                        }
                    }
                }

                if (bestTarget !== -1) {
                    target = bestTarget;
                } else {
                    suspend = 1;
                }
            }

            if (suspend === 1) {
                suspend = 0;
                break;
            }

            // 目標にダメージカウンタを置く

            this.text += `＞${pc2.playerName}の【${pc2.name[target]}】${target + 1}にダメージを与えた！\n`;
            pc2.scar[target] = 2;

            let target2 = 0; // 迎撃スキルの対象
            let suspend2 = 0; // 受動側の攻撃中断フラグ

            // 迎撃スキルの確認
            if (pc2.type[target] === Player.COUNTER || (pc2.type[target] === Player.ATTACK && (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "反"))) {

                if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "錬" && penetrate === 0) {
                    this.text += `＞【${pc1.name[use + 1]}】${use + 2}の効果で${pc2.playerName}の【${pc2.name[target]}】${target + 1}は発動しない！\n`;
                    penetrate = 1;

                } else {

                    let speedPc2Counter = 0;
                    let speedBufPc2Counter = 0;

                    // 速度とダメージ決定

                    if (pc2.skill[target] === "剣") {
                        pc2.damage[target] = 0;
                        for (let i2 = 0; i2 < pc2.getSkillsLength(); i2++) {
                            if (pc2.type[i2] === Player.ATTACK && !(i2 < pc2.getSkillsLength() - 1 && pc2.skill[i2 + 1] === "反")) {
                                pc2.damage[target]++;
                            }
                        }
                        if (pc2.speed[target] < 0) pc2.speed[target] = 0;
                    }

                    if (pc2.skill[target] === "怒") {
                        pc2.damage[target] = this.turn;
                    }


                    if (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "速") speedBufPc2Counter += 1;
                    if (pc2.kakugo === 1) speedBufPc2Counter += 2;
                    speedPc2Counter = pc2.speed[target] + speedBufPc2Counter;


                    // 迎撃スキル発動判定

                    if (speedPc2Counter >= speedPc1 || bonda === 1) {

                        counterOn = 1;

                        if (pc2.kakugo === 1) {
                            this.text += `＞覚悟の効果でダメージが1点上昇！速度に+2！\n`;
                        }

                        this.text += `＞${pc2.playerName}の【${pc2.name[target]}】${target + 1}が発動！（速度：${speedPc2Counter}）\n`;

                        // リミテッド処理
                        if (pc2.limited[target] === 1) pc2.limited[target] = 2;

                        if (pc2.skill[target] === "交" || pc2.skill[target] === "待" || pc2.skill[target] === "玉" ||
                            pc2.skill[target] === "一" || pc2.skill[target] === "刺" || pc2.skill[target] === "果" || pc2.skill[target] === "剣" ||
                            pc2.skill[target] === "紫" || pc2.skill[target] === "呪" || pc2.skill[target] === "雷" ||
                            pc2.skill[target] === "隠" || pc2.skill[target] === "怒" || pc2.skill[target] === "弱") { // 通常ダメージ

                            if (pc2.skill[target] === "玉") {
                                pc2.damage[target] = speedPc1;
                            }

                            // ダメージの処理
                            let counterDamage = pc2.damage[target];
                            if (pc2.kakugo === 1) counterDamage += 1;

                            for (let i2 = 0; i2 < counterDamage; i2++) {

                                if (pc1.musou === 1) {
                                    this.text += `＞＞${pc1.playerName}は無想の効果でダメージを受けない！\n`;
                                    break;
                                }

                                if (pc1.bouheki >= 1) {
                                    this.text += `＞＞${pc1.playerName}は防壁の効果でダメージを受けない！\n`;
                                    const removeCount = Math.ceil(pc1.bouheki / 2);
                                    this.text += `＞＞${pc1.playerName}の防壁が${removeCount}個解除された！\n`;
                                    pc1.bouheki -= removeCount;
                                    break;
                                }

                                // 目標指定
                                target2 = 0;
                                suspend2 = 0;
                                for (let j2 = 0; j2 < pc1.getSkillsLength(); j2++) {
                                    if (pc1.type[j2] !== Player.NONE && pc1.scar[j2] !== 2) {
                                        target2 = j2;
                                        break;
                                    }
                                    if (j2 === pc1.getSkillsLength() - 1) {
                                        suspend2 = 1;
                                        break;
                                    }
                                }

                                // 目標指定（交）

                                if (pc2.skill[target] === "交") {

                                    if (bonda === 1) {
                                        this.text += `＞＞${pc1.playerName}の【弱撃】0はダメージの対象にならない！\n`;
                                        break;
                                    } else {
                                        target2 = use;
                                    }
                                }


                                // 目標指定（刺）
                                if (pc2.skill[target] === "刺") {
                                    let bestDiff2 = 999;
                                    let bestTarget2 = -1;
                                    let useLV2 = target + 1;

                                    for (let j2 = 0; j2 < pc1.getSkillsLength(); j2++) {
                                        if (pc1.type[j2] !== Player.NONE && pc1.scar[j2] !== 2) {
                                            let targetLV2 = j2 + 1;
                                            let diff2 = Math.abs(useLV2 - targetLV2);

                                            if (diff2 < bestDiff2) {
                                                bestDiff2 = diff2;
                                                bestTarget2 = j2;
                                            } else if (diff2 === bestDiff2) {
                                                if (targetLV2 > (bestTarget2 + 1)) {
                                                    bestTarget2 = j2;
                                                }
                                            }
                                        }
                                    }

                                    if (bestTarget2 !== -1) {
                                        target2 = bestTarget2;
                                    } else {
                                        suspend2 = 1;
                                    }
                                }


                                if (suspend2 === 1) {
                                    suspend2 = 0;
                                    break;
                                }


                                this.text +=
                                    `＞＞${pc1.playerName}の【${pc1.name[target2]}】${target2 + 1}にダメージを与えた！\n`;
                                pc1.scar[target2] = 2;
                            }

                        }

                        // ダメージ以外の効果予約

                        if (pc2.skill[target] === "搦") {
                            pc1.roubai = 2;
                        }

                        if (pc2.skill[target] === "崩") {
                            pc1.stan = 2;
                        }

                        if (pc2.skill[target] === "疫") {
                            pc1.ekibyo = 2;
                        }

                        if (pc2.skill[target] === "紫") {
                            pc2.stan = 2;
                        }

                        if (pc2.skill[target] === "呪") {
                            pc1.suijaku = 2;
                        }

                        if (i_damage_loop < damage - 1) {
                            this.text += `＞${pc1.playerName}の【${pc1.name[use]}】${use + 1}が強制中断された！\n`;
                        }
                        suspend = 1;

                    } else {

                        this.text += `＞${pc2.playerName}の【${pc2.name[target]}】${target + 1}は発動しない！\n`;

                    }
                }
            }

            if (suspend === 1) {
                suspend = 0;
                break;
            }

        }


        // 一時ダメージを改めてダメージにする（一時ダメージは2回以上同じスキルに与えられない）
        for (let i = 0; i < pc1.getSkillsLength(); i++) {
            if (pc1.scar[i] === 2) pc1.scar[i] = 1;
        }

        for (let i = 0; i < pc2.getSkillsLength(); i++) {
            if (pc2.scar[i] === 2) pc2.scar[i] = 1;
        }


        // ダメージ以外の効果予約

        if (pc1.skill[use] === "紫") {
            pc1.stan = 2;
        }

        if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "盾") {
            pc1.tate = 2;
            pc1.limited[use + 1] = 2;

        }

        if (counterOn === 0) { // 迎撃スキルが発動しなかった


            if (pc1.skill[use] === "呪") {

                pc2.suijaku = 2;

            }

        }

        // ここから補助スキル


        if (pc1.skill[use] === "覚") {
            pc1.kakugo = 2;
        }

        if (pc1.skill[use] === "防") {
            pc1.bouheki_ = 2;
        }

        if (pc1.skill[use] === "封") {
            pc2.stan = 2;
            pc2.roubai = 2;
            pc2.suijaku = 2;
        }

        if (pc1.skill[use] === "影") {
            for (let i = 0; i < pc2.getSkillsLength(); i++) {
                if (pc2.type[i] !== Player.NONE) {

                    for (let j = 0; j < pc2.getSkillsLength(); j++) {
                        if (pc2.skill[j] === pc2.skill[i]) pc2.kage[j] = 2;
                    }

                    break;
                }
            }
        }

        counterOn = 0;


    }

    effect(pc1: Player, pc2: Player): number {


        let flag = 0;

        if (pc1.kakugo === 2) {
            this.text += `${pc1.playerName}に覚悟が与えられた！\n`;
            pc1.kakugo = 1;
            flag = 1;
        }

        if (pc1.bouheki_ === 2) {
            this.text += `${pc1.playerName}に防壁が与えられた！\n`;
            this.text += `${pc1.playerName}に防壁が与えられた！\n`;
            this.text += `${pc1.playerName}に防壁が与えられた！\n`;
            pc1.bouheki += 3;
            pc1.bouheki_ = 0;
            flag = 1;
        }

        if (pc1.tate === 2) {
            this.text += `${pc1.playerName}に防壁が与えられた！\n`;
            this.text += `${pc1.playerName}に防壁が与えられた！\n`;
            pc1.bouheki += 2;
            pc1.tate = 0;
            flag = 1;
        }

        if (pc1.stan === 2) {
            this.text += `${pc1.playerName}はスタンを受けた！\n`;
            pc1.stan = 1;
            flag = 1;
        }

        if (pc1.roubai === 2) {
            this.text += `${pc1.playerName}は狼狽を受けた！\n`;
            pc1.roubai = 1;
            flag = 1;
        }

        if (pc1.suijaku === 2) {
            this.text += `${pc1.playerName}は忘却を受けた！\n`;
            pc1.suijaku = 1;
            flag = 1;
        }

        for (let i = 0; i < pc2.getSkillsLength(); i++) {
            if (pc2.kage[i] === 2) {
                this.text += `${pc2.playerName}の【${pc2.name[i]}】${i + 1}は終了フェイズに破壊される！\n`;
                pc2.kage[i] = 1;
                flag = 1;
            }
        }

        if (pc1.ekibyo === 2) {
            for (let i = 0; i < pc1.getSkillsLength(); i++) {
                if (pc1.type[i] !== Player.NONE) {
                    if (pc1.limited[i] >= 1) break;
                    this.text +=
                        `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が【疫病】${i + 1}に変化した！\n`;
                    pc1.skill[i] = "疫";
                    pc1.name[i] = "疫病";
                    pc1.type[i] = Player.COUNTER;
                    pc1.speed[i] = i + 1;
                    pc1.damage[i] = 0;
                    pc1.limited[i] = 0;
                    break;
                }
            }
            pc1.ekibyo = 0;
            flag = 1;
        }


        return flag;
    }

    breakup(pc1: Player): number {

        let flag = 0;

        for (let i = 0; i < pc1.getSkillsLength(); i++) {

            if (pc1.scar[i] === 1) {

                if (pc1.type[i] !== Player.ENCHANT && i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "硬") {
                    this.text +=
                        `${pc1.playerName}の【＋硬】${i + 2}によって【${pc1.name[i]}】${i + 1}の破壊が無効化された！\n`;
                    this.text += `${pc1.playerName}の【＋硬】${i + 2}が破壊された！\n`;

                    pc1.skill[i + 1] = "＿";
                    pc1.name[i + 1] = "　　";
                    pc1.type[i + 1] = Player.NONE;
                    pc1.speed[i + 1] = 0;
                    pc1.damage[i + 1] = 0;
                    pc1.scar[i + 1] = 0;
                    pc1.limited[i + 1] = 0;
                    pc1.scar[i] = 0;


                } else {

                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が破壊された！\n`;

                    if (pc1.skill[i] === "逆") {
                        this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}が発動！\n`;
                        this.text += `＞${pc1.playerName}に逆鱗が与えられた！\n`;
                        pc1.gekirin++;
                    }

                    pc1.skill[i] = "＿";
                    pc1.name[i] = "　　";
                    pc1.type[i] = Player.NONE;
                    pc1.speed[i] = 0;
                    pc1.damage[i] = 0;
                    pc1.scar[i] = 0;
                    pc1.limited[i] = 0;
                    pc1.kage[i] = 0;
                }

                flag = 1;
            }

        }

        return flag;
    }

    judge(pc1: Player, pc2: Player, prior: number): number {

        // File operations are removed for web environment

        let flag = 0;
        let result = 0;
        for (let i = 0; i < pc2.getSkillsLength(); i++) {
            if (pc2.type[i] !== Player.NONE) flag = 1;
        }
        if (flag === 0) result += 1; // PC2のスキルが全て破壊されたらPC1の勝利

        flag = 0;
        for (let i = 0; i < pc1.getSkillsLength(); i++) {
            if (pc1.type[i] !== Player.NONE) flag = 1;
        }
        if (flag === 0) result += 2; // PC1のスキルが全て破壊されたらPC2の勝利

        if (result > 0) {

            this.text += "\n【勝敗判定】\n\n";


            if (Battle.SHORT === 0) {
                for (let i = 0; i < pc1.getSkillsLength(); i++) this.text += `【${pc1.name[i]}】`;
            } else {
                for (let i = 0; i < pc1.getSkillsLength(); i++) this.text += pc1.skill[i];
            }

            this.text += `／${pc1.playerName}`;

            this.text += "\n";

            if (Battle.SHORT === 0) {
                for (let i = 0; i < pc2.getSkillsLength(); i++) this.text += `【${pc2.name[i]}】`;
            } else {
                for (let i = 0; i < pc2.getSkillsLength(); i++) this.text += pc2.skill[i];
            }

            this.text += `／${pc2.playerName}`;

            this.text += "\n\n";

        }

        if (result === 3) {
            if (prior === 1) result = 2; // あなたの攻撃フェイズ中に両者全滅ならあなたの敗北（相手1の勝利）
            else if (prior === 2) result = 1; // 相手の攻撃フェイズ中に両者全滅なら相手の敗北（あなた1の勝利）
            else result = 3; // フェイズ情報がない（同時・終了フェイズ）なら引き分け
        }

        if (result === 1) {
            this.text += `${pc1.playerName}の勝利！\n\n`;
            this.text += "=============================================\n";
            return 1;
        } else if (result === 2) {
            this.text += `${pc2.playerName}の勝利！\n\n`;
            this.text += "=============================================\n";
            return 2;
        } else if (result === 3) {
            this.text += "引き分け\n\n";
            this.text += "=============================================\n";
            return 3;
        }

        return 0; // ゲーム継続
    }
}
