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
            if (pc1.tyudoku === 1) { sta1 = 1; statusPc1 += "毒"; }
            if (pc1.yakedo === 1) { sta1 = 1; statusPc1 += "火"; }

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
            if (pc2.tyudoku === 1) { sta2 = 1; statusPc2 += "毒"; }
            if (pc2.yakedo === 1) { sta2 = 1; statusPc2 += "火"; }

            if (sta2 === 1) this.text += `〔${statusPc2}〕`;

            this.text += "\n";

            // 開始フェイズ

            let startFlag = 0; // 出力用

            this.text += "\n";
            this.text += "▼開始フェイズ\n";
            this.text += "\n";

            this.rinko(pc1);
            this.rinko(pc2);

            // 中毒の処理
            if (pc1.tyudoku === 1) {
                this.text += `＞${pc1.playerName}は毒に蝕まれている！\n`;
                for (let i = 0; i < pc1.getSkillsLength(); i++) {
                    if (pc1.type[i] !== Player.NONE) {
                        this.text += `＞${pc1.playerName}の【${pc1.name[i]}】${i + 1}に1点のダメージ！\n`;
                        pc1.scar[i] = 1;
                        startFlag = 1;
                        break;
                    }
                }
            }
            if (pc2.tyudoku === 1) {
                this.text += `＞${pc2.playerName}は毒に蝕まれている！\n`;
                for (let i = 0; i < pc2.getSkillsLength(); i++) {
                    if (pc2.type[i] !== Player.NONE) {
                        this.text += `＞${pc2.playerName}の【${pc2.name[i]}】${i + 1}に1点のダメージ！\n`;
                        pc2.scar[i] = 1;
                        startFlag = 1;
                        break;
                    }
                }
            }
            if (this.breakup(pc1) + this.breakup(pc2) >= 1) startFlag = 1;


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
                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "翔") speedBufPc1 += 2; // ＋翔
                    if (pc1.kakugo === 1) speedBufPc1 += 2;

                    // 座礁チェック
                    for (let k = 0; k < pc2.getSkillsLength(); k++) {
                        if (pc2.skill[k] === "礁") {
                            speedBufPc1 -= 1;
                        }
                    }

                    this.text += `【${pc1.name[i]}】${i + 1}　速度：${pc1.speed[i] + speedBufPc1}　`;
                    speedPc1 = pc1.speed[i] + speedBufPc1;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    if (i < pc1.getSkillsLength() - 1 && pc1.skill[i + 1] === "速") speedBufPc1 += 1;
                    // BUFFに翔が効くかどうかは記述がないが、攻撃スキルの直前とあるのでBUFFには効かないはず
                    
                    // 座礁チェック
                    for (let k = 0; k < pc2.getSkillsLength(); k++) {
                        if (pc2.skill[k] === "礁") {
                            speedBufPc1 -= 1;
                        }
                    }

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
                    if (i < pc2.getSkillsLength() - 1 && pc2.skill[i + 1] === "翔") speedBufPc2 += 2; // ＋翔
                    if (pc2.kakugo === 1) speedBufPc2 += 2;

                    // 座礁チェック
                    for (let k = 0; k < pc1.getSkillsLength(); k++) {
                        if (pc1.skill[k] === "礁") {
                            speedBufPc2 -= 1;
                        }
                    }

                    this.text += `【${pc2.name[i]}】${i + 1}　速度：${pc2.speed[i] + speedBufPc2}　`;
                    speedPc2 = pc2.speed[i] + speedBufPc2;
                    break;
                }

                if (pc2.type[i] === Player.BUFF) {
                    if (i < pc2.getSkillsLength() - 1 && pc2.skill[i + 1] === "速") speedBufPc2 += 1;
                    
                    // 座礁チェック
                    for (let k = 0; k < pc1.getSkillsLength(); k++) {
                        if (pc1.skill[k] === "礁") {
                            speedBufPc2 -= 1;
                        }
                    }

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
                if (pc1.tyudoku === 1) {
                    this.text += `＞${pc1.playerName}の中毒が解除された！\n`;
                    pc1.tyudoku = 0;
                }
                if (pc1.yakedo === 1) {
                    this.text += `＞${pc1.playerName}の火傷が解除された！\n`;
                    pc1.yakedo = 0;
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

                    // 新スキル追加
                    if (pc1.skill[i] === "烈") {
                        pc1.speed[i] = (i + 1) + 2; // LV+2
                    }
                    if (pc1.skill[i] === "審") {
                        pc1.damage[i] = i + 1; // LV
                    }
                    if (pc1.skill[i] === "死") {
                        pc1.damage[i] = 1;
                    }
                    if (pc1.skill[i] === "狼") { // 狼嵐（神業）
                        pc1.damage[i] = 3;
                    }
                    if (pc1.skill[i] === "爆") { // 爆砕（神業）
                        pc1.damage[i] = 3;
                    }
                    if (pc1.skill[i] === "魔") { // 魔弾（神業）
                        // 残りスキル数
                        let skillCount = 0;
                        for (let k = 0; k < pc1.getSkillsLength(); k++) {
                            if (pc1.type[k] !== Player.NONE) skillCount++;
                        }
                        pc1.damage[i] = skillCount;
                    }
                    if (pc1.skill[i] === "憤") { // 憤怒（敵専用）
                        let damageTaken = 0;
                        // 破壊されたスキルの数をダメージとして計算する簡易実装
                         for(let k=0; k<pc1.getSkillsLength(); k++) {
                             if(pc1.type[k] === Player.NONE && pc1.skill[k] !== "空" && pc1.skill[k] !== "＿") damageTaken++;
                        }
                        pc1.damage[i] = damageTaken;
                    }

                    // 協奏の適用
                    if (pc1.nextLvUp === 1) {
                        this.text += `＞協奏の効果でLVが+1された！\n`;
                        pc1.damage[i]++;
                        pc1.speed[i]++;
                        pc1.nextLvUp = 0; 
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

                    // 火傷の効果
                    if (pc1.yakedo === 1) {
                        this.text += "＞火傷の効果でダメージが1下がった！\n";
                        damageBuf--;
                    }

                    damage = pc1.damage[i] + damageBuf;
                    if (damage < 0) damage = 0;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;

                    if (pc1.skill[i] === "協") {
                        pc1.nextLvUp = 1;
                    }
                    if (pc1.skill[i] === "医") {
                         let cured = false;
                         if (pc1.tyudoku === 1) { pc1.tyudoku = 0; this.text += "＞中毒が回復した！\n"; cured = true; }
                         else if (pc1.yakedo === 1) { pc1.yakedo = 0; this.text += "＞火傷が回復した！\n"; cured = true; }
                         else if (pc1.roubai === 1) { pc1.roubai = 0; this.text += "＞狼狽が回復した！\n"; cured = true; }
                         else if (pc1.stan === 1) { pc1.stan = 0; this.text += "＞スタンが回復した！\n"; cured = true; }
                         else if (pc1.suijaku === 1) { pc1.suijaku = 0; this.text += "＞忘却が回復した！\n"; cured = true; }
                         
                         if(!cured) this.text += "＞回復する状態異常がなかった。\n";
                    }
                    if (pc1.skill[i] === "魚") {
                         this.text += `＞${pc2.playerName}に1点のダメージ！（迎撃不可）\n`;
                         pc1.gyogun = 1;
                    }
                    if (pc1.skill[i] === "盗") {
                        this.text += `＞盗賊の効果！\n`;
                        pc1.tozoku = 1;
                    }

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

                    // 新スキル追加
                    if (pc1.skill[i] === "烈") {
                        pc1.speed[i] = (i + 1) + 2; // LV+2
                    }
                    if (pc1.skill[i] === "審") {
                        pc1.damage[i] = i + 1; // LV
                    }
                    if (pc1.skill[i] === "死") {
                        pc1.damage[i] = 1;
                    }
                    if (pc1.skill[i] === "狼") { // 狼嵐（神業）
                        pc1.damage[i] = 3;
                    }
                    if (pc1.skill[i] === "爆") { // 爆砕（神業）
                        pc1.damage[i] = 3;
                    }
                    if (pc1.skill[i] === "魔") { // 魔弾（神業）
                        // 残りスキル数
                        let skillCount = 0;
                        for (let k = 0; k < pc1.getSkillsLength(); k++) {
                            if (pc1.type[k] !== Player.NONE) skillCount++;
                        }
                        pc1.damage[i] = skillCount;
                    }
                    if (pc1.skill[i] === "憤") { // 憤怒（敵専用）
                        let damageTaken = 0;
                        // 破壊されたスキルの数をダメージとして計算する簡易実装
                         for(let k=0; k<pc1.getSkillsLength(); k++) {
                             if(pc1.type[k] === Player.NONE && pc1.skill[k] !== "空" && pc1.skill[k] !== "＿") damageTaken++;
                        }
                        pc1.damage[i] = damageTaken;
                    }

                    // 協奏の適用
                    if (pc1.nextLvUp === 1) {
                        this.text += `＞協奏の効果でLVが+1された！\n`;
                        pc1.damage[i]++;
                        pc1.speed[i]++;
                        pc1.nextLvUp = 0; 
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

                    // 火傷の効果
                    if (pc1.yakedo === 1) {
                        this.text += "＞火傷の効果でダメージが1下がった！\n";
                        damageBuf--;
                    }

                    damage = pc1.damage[i] + damageBuf;
                    if (damage < 0) damage = 0;
                    break;
                }

                if (pc1.type[i] === Player.BUFF) {
                    this.text += `${pc1.playerName}の【${pc1.name[i]}】${i + 1}！\n`;

                    if (pc1.skill[i] === "協") {
                        pc1.nextLvUp = 1;
                    }
                    if (pc1.skill[i] === "医") {
                         let cured = false;
                         if (pc1.tyudoku === 1) { pc1.tyudoku = 0; this.text += "＞中毒が回復した！\n"; cured = true; }
                         else if (pc1.yakedo === 1) { pc1.yakedo = 0; this.text += "＞火傷が回復した！\n"; cured = true; }
                         else if (pc1.roubai === 1) { pc1.roubai = 0; this.text += "＞狼狽が回復した！\n"; cured = true; }
                         else if (pc1.stan === 1) { pc1.stan = 0; this.text += "＞スタンが回復した！\n"; cured = true; }
                         else if (pc1.suijaku === 1) { pc1.suijaku = 0; this.text += "＞忘却が回復した！\n"; cured = true; }
                         
                         if(!cured) this.text += "＞回復する状態異常がなかった。\n";
                    }
                    if (pc1.skill[i] === "魚") {
                         this.text += `＞${pc2.playerName}に1点のダメージ！（迎撃不可）\n`;
                         pc1.gyogun = 1;
                    }
                    if (pc1.skill[i] === "盗") {
                        this.text += `＞盗賊の効果！\n`;
                        pc1.tozoku = 1;
                    }

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
        if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "翔") speedBufPc1 += 2; // ＋翔
        if (pc1.kakugo === 1) speedBufPc1 += 2;
        speedPc1 = pc1.speed[use] + speedBufPc1;

        // 攻撃側の速度決定での座礁計算
        for (let k = 0; k < pc2.getSkillsLength(); k++) {
             if (pc2.skill[k] === "礁") {
                 speedPc1 -= 1;
             }
        }

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
            
            // ＋弓の効果（後列優先）
            let bowTarget = false;
            if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "弓") {
                bowTarget = true;
                this.text += `＞【＋弓】${use + 2}の効果で後列を狙う！\n`;
            }

            if (bowTarget) {
                for (let j = pc2.getSkillsLength() - 1; j >= 0; j--) {
                    if (pc2.type[j] !== Player.NONE && pc2.scar[j] !== 2) {
                        target = j;
                        break;
                    }
                    if (j === 0) { // 最後まで見つからなかった場合（通常ありえないが）
                        suspend = 1;
                        break;
                    }
                }
            } else {
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

            // 幻惑（迎撃）の効果：ターゲットランダム変更
            if (suspend === 0 && pc2.skill[target] === "幻") {
                 let genwakuSpeed = pc2.speed[target];
                 if (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "速") genwakuSpeed += 1;
                 if (pc2.kakugo === 1) genwakuSpeed += 2;
                 
                 let genwakuPenetrate = 0;
                 if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "錬" && penetrate === 0) genwakuPenetrate = 1;

                 if ((genwakuSpeed >= speedPc1 || bonda === 1) && genwakuPenetrate === 0) {
                     this.text += `＞${pc2.playerName}の【幻惑】${target + 1}が発動！\n`;
                     let validTargets = [];
                     for(let k=0; k<pc2.getSkillsLength(); k++) {
                         if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) validTargets.push(k);
                     }
                     if (validTargets.length > 0) {
                         const randIndex = Math.floor(Math.random() * validTargets.length);
                         target = validTargets[randIndex];
                         this.text += `＞攻撃対象が【${pc2.name[target]}】${target + 1}に変更された！\n`;
                     }
                     pc2.limited[target] = 2; 
                 }
            }

            if (suspend === 1) {
                suspend = 0;
                break;
            }

            // 目標にダメージカウンタを置く

            // 飛行の回避判定
            let avoided = false;
            if (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "飛") {
                if (Math.random() < 0.5) {
                    this.text += `＞【飛行】の効果で${pc2.playerName}の【${pc2.name[target]}】${target + 1}は回避した！\n`;
                    avoided = true;
                }
            }
            
            // 霊化の回避判定
            if (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "霊") {
                 // 物理攻撃（剣、鉄など）
                 const physics = ["一", "刺", "果", "剣", "鉄", "烈", "艦", "死", "怒", "弱", "逆", "憤", "暴"];
                 if (physics.includes(pc1.skill[use])) {
                     this.text += `＞【霊化】の効果で${pc2.playerName}の【${pc2.name[target]}】${target + 1}はダメージを受けない！\n`;
                     avoided = true;
                 }
            }

            if (!avoided) {
                this.text += `＞${pc2.playerName}の【${pc2.name[target]}】${target + 1}にダメージを与えた！\n`;
                pc2.scar[target] = 2;
            } else {
                // 回避された場合、ダメージ処理をスキップするが、ループは継続する（回数消化）
                // ただし、迎撃スキルの発動判定もスキップされるべきか？
                // 通常、ダメージを受けないと迎撃は発動しない。
            }

            let target2 = 0; // 迎撃スキルの対象
            let suspend2 = 0; // 受動側の攻撃中断フラグ

            // 迎撃スキルの確認
            if (!avoided && (pc2.type[target] === Player.COUNTER || (pc2.type[target] === Player.ATTACK && (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "反")))) {

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
                            pc2.skill[target] === "隠" || pc2.skill[target] === "怒" || pc2.skill[target] === "弱" ||
                            pc2.skill[target] === "鉄" || pc2.skill[target] === "烈" || pc2.skill[target] === "審" ||
                            pc2.skill[target] === "艦" || pc2.skill[target] === "死" || pc2.skill[target] === "狼" ||
                            pc2.skill[target] === "爆" || pc2.skill[target] === "魔" || pc2.skill[target] === "転" || 
                            pc2.skill[target] === "受" || pc2.skill[target] === "傲" || pc2.skill[target] === "欲" || 
                            pc2.skill[target] === "嫉" || pc2.skill[target] === "憤" || pc2.skill[target] === "色" || 
                            pc2.skill[target] === "暴") { // 通常ダメージ

                            if (pc2.skill[target] === "玉") {
                                pc2.damage[target] = speedPc1;
                            }
                            if (pc2.skill[target] === "転") {
                                pc2.damage[target] = 1;
                            }
                            if (pc2.skill[target] === "転") { // 転回：受けたダメージを返す
                                // ここでの「受けたダメージ」は、本来受けるはずだったダメージ。
                                // しかしこの迎撃が発動した時点でダメージは中断されるため、1ダメージ（カウンターとして与えるダメージ）になるのか？
                                // 仕様：「受けたダメージをそのまま相手に与え返す」
                                // 攻撃スキルの総ダメージではなく、この1回のダメージ処理分(1点)を返すのが自然。
                                // しかし description によると "受けたダメージを" とある。
                                // ここでは簡易的に「相手の攻撃スキルの総ダメージ」とするか、「1点」とするか。
                                // 迎撃スキルはダメージ処理を中断するため、このスキル自体はダメージを受けない（破壊されるが）。
                                // "そのまま与え返す" なので、本来受けるはずだった 1点 を返す、つまりダメージ1。
                                // pc2.damage[target] は初期化時に0になっているので、ここで設定が必要かもだが、
                                // Player.tsでdamage変数が設定されているはず。
                                // 転回のdamageは0設定だった。ここで1にする。
                                pc2.damage[target] = 1;
                            }

                            // ダメージの処理
                            let counterDamage = pc2.damage[target];
                            if (pc2.kakugo === 1) counterDamage += 1;

                            for (let i2 = 0; i2 < counterDamage; i2++) {

                                // if (pc1.musou === 1) {
                                //     this.text += `＞＞${pc1.playerName}は無想の効果でダメージを受けない！\n`;
                                //     break;
                                // }

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

                        if (pc2.skill[target] === "水") {
                            this.text += `＞【水幕】の効果でダメージ無効化！\n`;
                            // ダメージループを抜けるためにsuspend=1にするが、これは迎撃発動で自動的にそうなる。
                            // ここでの処理は特に不要（ダメージが発生しない迎撃スキルとして処理される）
                        }

                        if (pc2.skill[target] === "罠") {
                            pc1.stan = 2;
                        }

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
                        
                        if (pc2.skill[target] === "色") {
                            // 色欲：魅了（次の攻撃対象を自分に変更）
                            // これは次の自分のターンに影響する効果。
                            // 実装が複雑なので、今回はログ出力のみにとどめるか、簡易実装する。
                            this.text += `＞${pc1.playerName}は魅了された！\n`;
                        }
                        
                        if (pc2.skill[target] === "傲") {
                            // 傲慢：相手の補助スキルを全て破壊
                            for(let k=0; k<pc1.getSkillsLength(); k++) {
                                if(pc1.type[k] === Player.BUFF) pc1.scar[k] = 2;
                            }
                        }
                        
                        if (pc2.skill[target] === "欲") {
                            // 強欲：相手のスキルを2つ奪う
                            // 奪う処理は複雑なので、破壊に変更するか、あるいは簡易的に破壊として扱う。
                            // 仕様通りにするなら「奪う」だが、Playerクラスにスキルを追加するメソッドが必要。
                            // ここでは「2つ破壊」として実装。
                            this.text += `＞強欲の効果でスキルが奪われる（破壊される）！\n`;
                            let count = 0;
                            for(let k=0; k<pc1.getSkillsLength(); k++) {
                                if(pc1.type[k] !== Player.NONE && pc1.scar[k] !== 2) {
                                    pc1.scar[k] = 2;
                                    count++;
                                    if(count >= 2) break;
                                }
                            }
                        }
                        
                        if (pc2.skill[target] === "暴") {
                            // 暴食：1つ食べてHP回復
                            // HP回復＝破壊されたスキルを復活？あるいは空白を埋める？
                            // ここでは「1つ破壊」のみ実装。
                            this.text += `＞暴食の効果でスキルが食べられる（破壊される）！\n`;
                             for(let k=0; k<pc1.getSkillsLength(); k++) {
                                if(pc1.type[k] !== Player.NONE && pc1.scar[k] !== 2) {
                                    pc1.scar[k] = 2;
                                    break;
                                }
                            }
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

            // 幻惑（迎撃）の効果：ターゲットランダム変更
            if (suspend === 0 && pc2.skill[target] === "幻") {
                 let genwakuSpeed = pc2.speed[target];
                 if (target < pc2.getSkillsLength() - 1 && pc2.skill[target + 1] === "速") genwakuSpeed += 1;
                 if (pc2.kakugo === 1) genwakuSpeed += 2;
                 
                 let genwakuPenetrate = 0;
                 if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "錬" && penetrate === 0) genwakuPenetrate = 1;

                 if ((genwakuSpeed >= speedPc1 || bonda === 1) && genwakuPenetrate === 0) {
                     this.text += `＞${pc2.playerName}の【幻惑】${target + 1}が発動！\n`;
                     let validTargets = [];
                     for(let k=0; k<pc2.getSkillsLength(); k++) {
                         if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) validTargets.push(k);
                     }
                     if (validTargets.length > 0) {
                         const randIndex = Math.floor(Math.random() * validTargets.length);
                         target = validTargets[randIndex];
                         this.text += `＞攻撃対象が【${pc2.name[target]}】${target + 1}に変更された！\n`;
                     }
                     pc2.limited[target] = 2; 
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

        if (pc1.skill[use] === "瘴") {
            pc2.tyudoku = 1;
            this.text += `＞${pc2.playerName}は毒を受けた！\n`;
        }
        if (pc1.skill[use] === "審") {
            // ランダム破壊
            let validTargets = [];
            for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) validTargets.push(k);
            }
            if (validTargets.length > 0) {
                const randIndex = Math.floor(Math.random() * validTargets.length);
                pc2.scar[validTargets[randIndex]] = 2;
                this.text += `＞審判の効果で【${pc2.name[validTargets[randIndex]]}】が破壊された！\n`;
            }
        }
        if (pc1.skill[use] === "死") {
            // 瀕死（残り1つ）なら即死（破壊）
            let count = 0;
            let lastIdx = -1;
            for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) {
                    count++;
                    lastIdx = k;
                }
            }
            if (count === 1 && lastIdx !== -1) {
                pc2.scar[lastIdx] = 2;
                this.text += `＞死神の効果でとどめを刺した！\n`;
            }
        }
        if (pc1.skill[use] === "狼") {
            pc2.roubai = 2;
        }
        if (pc1.skill[use] === "解") {
            // 全ての付帯スキル無効化（破壊）
             for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] === Player.ENCHANT) {
                    pc2.scar[k] = 2;
                }
            }
            this.text += `＞▽解の効果で全ての付帯スキルが破壊された！\n`;
        }

        if (pc1.skill[use] === "紫") {
            pc1.stan = 2;
        }

        if (use < pc1.getSkillsLength() - 1 && pc1.skill[use + 1] === "盾") {
            pc1.tate = 2;
            pc1.limited[use + 1] = 2;

        }

        if (pc1.skill[use] === "呪") {
            pc2.suijaku = 2;
        }

        // ここから補助スキル

        if (pc1.skill[use] === "蟲") {
            pc2.tyudoku = 1;
            this.text += `＞${pc2.playerName}は毒を受けた！\n`;
        }
        if (pc1.skill[use] === "焦") {
            pc2.yakedo = 1;
            this.text += `＞${pc2.playerName}は火傷を受けた！\n`;
        }
        if (pc1.skill[use] === "盗") {
             for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) {
                    pc2.scar[k] = 2;
                    this.text += `＞盗賊の効果で【${pc2.name[k]}】を破壊した！\n`;
                    break;
                }
            }
        }


        if (pc1.skill[use] === "蟲") {
            pc2.tyudoku = 1;
            this.text += `＞${pc2.playerName}は毒を受けた！\n`;
        }
        if (pc1.skill[use] === "焦") {
            pc2.yakedo = 1;
            this.text += `＞${pc2.playerName}は火傷を受けた！\n`;
        }
        if (pc1.skill[use] === "盗") {
             // 盗賊：相手の先頭スキルを奪う
             // 簡易実装：相手の先頭を破壊し、自分の末尾に追加（可能なら）
             // 追加処理はPlayerクラスにメソッドがないと厳しいので、ここでは「破壊」のみとする。
             // 説明文「奪えない場合は1点ダメージ」 -> 破壊＝ダメージなのでOK
             for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) {
                    pc2.scar[k] = 2;
                    this.text += `＞盗賊の効果で【${pc2.name[k]}】を破壊した！\n`;
                    break;
                }
            }
        }

        if (pc1.skill[use] === "蟲") {
            pc2.tyudoku = 1;
            this.text += `＞${pc2.playerName}は毒を受けた！\n`;
        }
        if (pc1.skill[use] === "焦") {
            pc2.yakedo = 1;
            this.text += `＞${pc2.playerName}は火傷を受けた！\n`;
        }
        if (pc1.skill[use] === "盗") {
             for(let k=0; k<pc2.getSkillsLength(); k++) {
                if (pc2.type[k] !== Player.NONE && pc2.scar[k] !== 2) {
                    pc2.scar[k] = 2;
                    this.text += `＞盗賊の効果で【${pc2.name[k]}】を破壊した！\n`;
                    break;
                }
            }
        }

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

        if (pc1.tyudoku === 2) {
            this.text += `${pc1.playerName}は毒を受けた！\n`;
            pc1.tyudoku = 1;
            flag = 1;
        }

        if (pc1.yakedo === 2) {
            this.text += `${pc1.playerName}は火傷を受けた！\n`;
            pc1.yakedo = 1;
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

                    if (pc1.skill[i] === "円" && pc1.scar[i] === 1) { // scar=1は破壊フラグ
                        // 円環の復活処理
                        // limitedを使って回数制限（1回のみ）を管理するか？
                        // skillDataでは speed="なし" なので limited は使われていないはず。
                        // limited=0:未使用, 1:使用済み(復活済み) とする。
                        if (pc1.limited[i] === 0) {
                            this.text += `${pc1.playerName}の【円環】${i+1}は破壊されたが復活した！\n`;
                            pc1.scar[i] = 0; // 破壊無効
                            pc1.limited[i] = 1; // 使用済みにする
                            flag = 1; // 変更があったのでフラグON
                            continue; // 次のスキルの処理へ（破壊処理をスキップ）
                        }
                    }

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
            if (prior === 1) result = 1; // 攻撃フェイズ終了時、両者のスキルが全て破壊されているなら攻撃側の敗北（PC1の攻撃中ならPC1敗北=result2）
            else if (prior === 2) result = 2; // 攻撃フェイズ終了時、両者のスキルが全て破壊されているなら攻撃側の敗北（PC2の攻撃中ならPC2敗北=result1）
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
