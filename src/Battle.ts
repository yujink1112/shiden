import { Player } from './Player';

/**
 * 戦闘の状態定数
 */
enum StatusFlag {
    NONE = 0,
    ACTIVE = 1,
    RESERVED = 2,
    FROZEN = 3
}

/**
 * 勝敗判定の結果
 */
enum BattleResult {
    CONTINUE = 0,
    PC1_WIN = 1,
    PC2_WIN = 2,
    DRAW = 3
}

type SelectedActionSkill = {
    idx: number;
    skill: string;
};

export class Battle {
    static SHORT: number = 0; // 0=短縮しない 1=短縮する

    private dataPc1: string;
    private dataPc2: string;
    public text: string = "";

    private turn: number = 1;
    private roundFirst: Player | null = null;
    public pc1: Player;
    public pc2: Player;

    constructor(pc1Data: string, pc2Data: string) {
        this.dataPc1 = pc1Data;
        this.dataPc2 = pc2Data;
        this.pc1 = new Player(this.dataPc1);
        this.pc2 = new Player(this.dataPc2);
    }

    /**
     * ログを出力する
     */
    private log(message: string = ""): void {
        this.text += message + "\n";
    }

    /**
     * 戦闘開始
     */
    public start(): number {
        Battle.SHORT = 0;

        this.log("==========================================");
        this.log();
        this.log(`${this.pc1.playerName}　VS　${this.pc2.playerName}`);
        this.log();
        this.log("――戦闘開始――");
        this.log();

        for (this.turn = 1; this.turn < 100; this.turn++) { // 無限ループ回避のため上限設定
            const result = this.executeTurn();
            if (result !== BattleResult.CONTINUE) {
                return result;
            }
        }

        return BattleResult.DRAW;
    }

    /**
     * 1ターンの実行
     */
    private executeTurn(): number {
        this.log(`【第${this.turn}ラウンド】`);
        this.log();

        this.showPlayerStatus(this.pc1);
        this.showPlayerStatus(this.pc2);
        this.log();

        // 開始フェイズ
        this.log("▼開始フェイズ");
        this.log();
        this.phaseStart();
        this.log();

        // 先攻決定フェイズ
        this.log("▼先攻決定フェイズ");
        this.log();
        const { first, second } = this.phaseSpeed(true);
        this.roundFirst = first;
        const selectedSkills = new Map<Player, SelectedActionSkill>();
        this.log();

        // 攻撃フェイズ（先攻）
        this.log(`▼${first.playerName}の攻撃フェイズ`);
        this.log();
        selectedSkills.set(first, this.phaseAction(first, second, true));
        this.log();
        
        let result = this.judge(first === this.pc1 ? 2 : 1);
        if (result !== BattleResult.CONTINUE) return result;

        // 攻撃フェイズ（後攻）
        this.log(`▼${second.playerName}の攻撃フェイズ`);
        this.log();
        selectedSkills.set(second, this.phaseAction(second, first, false));
        this.log();

        result = this.judge(first === this.pc1 ? 1 : 2);
        if (result !== BattleResult.CONTINUE) return result;

        // 連撃フェイズ
        result = this.executeRengeki(selectedSkills);
        if (result !== BattleResult.CONTINUE) return result;

        // 終了フェイズ
        this.log("▼終了フェイズ");
        this.log();
        this.phaseEnd();
        this.log();

        // 円環の処理
        this.executeEnkan();

        // 強欲の処理
        this.executeGouyoku();

        const masteryResult = this.judgeMastery();
        if (masteryResult !== BattleResult.CONTINUE) return masteryResult;

        result = this.judge(3);
        if (result !== BattleResult.CONTINUE) return result;

        return BattleResult.CONTINUE;
    }

    private executeGouyoku(): void {
        const applyGouyoku = (pc: Player, opponent: Player, isFirst: boolean) => {
            if (pc.gouyoku > 0) {
                this.log();
                this.log(`${pc.playerName}の強欲が発動！`);
                this.log();
                this.log(`▼${pc.playerName}の攻撃フェイズ`);
                this.log();
                this.phaseAction(pc, opponent, isFirst);
                // 強欲終了時に状態解除
                pc.gouyoku = 0;
                return true;
            }
            return false;
        };
        const { first } = this.phaseSpeed(false);
        const pc1IsFirst = (first === this.pc1);
        applyGouyoku(this.pc1, this.pc2, pc1IsFirst);
        applyGouyoku(this.pc2, this.pc1, !pc1IsFirst);
    }

    private executeEnkan(): void {
        const hasEnkan = (pc: Player) => {
            for (let i = 0; i < pc.getSkillsLength(); i++) if (pc.skill[i] === "円") return i + 1;
            return 0;
        };
        const pc1Enkan = hasEnkan(this.pc1);
        const pc2Enkan = hasEnkan(this.pc2);
        if (pc1Enkan != 0) {
            this.log();
            this.log(this.pc1.playerName + `の【円環】${pc1Enkan}によって終了フェイズが繰り返される……。`);
            this.log();
            this.phaseEnd();
        }
        if (pc2Enkan != 0) {
            this.log();
            this.log(this.pc2.playerName + `の【円環】${pc2Enkan}によって終了フェイズが繰り返される……。`);
            this.log();
            this.phaseEnd();
        }

        // 凍結予約の解除
        this.clearTouketsu(this.pc1);
        this.clearTouketsu(this.pc2);
        
    }

    /**
     * プレイヤーの状態を表示
     */
    private showPlayerStatus(pc: Player): void {
        let skillsText = "";
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (Battle.SHORT === 0) {
                const extremeHp = pc.skill[i] === "極" ? `${pc.extremeHpRemaining[i]}` : "";
                skillsText += `【${pc.name[i]}】${extremeHp}`;
            } else {
                skillsText += pc.skill[i];
            }
        }

        let statusText = "";
        const appendStatus = (label: string, count: number) => {
            if (count > 0) statusText += `${label}x${count}`;
        };

        appendStatus("ス", pc.stan === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("狼", pc.roubai === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("忘", pc.suijaku === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("覚", pc.kakugo === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("防", pc.bouheki);
        appendStatus("逆", pc.gekirin);
        appendStatus("無", pc.musou === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("先", pc.sensei === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("毒", pc.tyudoku === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("火", pc.yakedo === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("回", pc.kaifuku === StatusFlag.ACTIVE ? 1 : 0);
        pc.chiyu.forEach(round => { statusText += `癒${round}`; });
        appendStatus("奏", pc.kyousou);
        appendStatus("霊", pc.reika === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("欲", pc.gouyoku === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("傲", pc.gouman === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("憤", pc.funnu === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("暴", pc.boushoku === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("怠", pc.taida === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("嫉", pc.shitto === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("色", pc.shikiyoku === StatusFlag.ACTIVE ? 1 : 0);
        appendStatus("紋", pc.shimon);

        this.log(`${skillsText}／${pc.playerName}${statusText ? `〔${statusText}〕` : ""}`);
    }

    /**
     * 開始フェイズ
     */
    private phaseStart(): void {
        let startFlag = 0;

        this.applyRinko(this.pc1);
        this.applyRinko(this.pc2);

        // 特殊スキルの発動（無想、先制）
        startFlag |= this.triggerStartPhaseSkills(this.pc1);
        startFlag |= this.triggerStartPhaseSkills(this.pc2);

        if (startFlag === 0) {
            // 特に何も起きなかった場合も何か表示すべきか？元コードは空行のみ
        }
    }

    private applyRinko(pc: Player): void {
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.skill[i] === "燐") {
                this.log(`${pc.playerName}の【${pc.name[i]}】${i + 1}が発動！`);
                if (pc.stan === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}のスタンが解除された！`); pc.stan = StatusFlag.NONE; }
                if (pc.roubai === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の狼狽が解除された！`); pc.roubai = StatusFlag.NONE; }
                if (pc.suijaku === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の忘却が解除された！`); pc.suijaku = StatusFlag.NONE; }
                if (pc.tyudoku === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の毒が解除された！`); pc.tyudoku = StatusFlag.NONE; }
                if (pc.yakedo === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の火傷が解除された！`); pc.yakedo = StatusFlag.NONE; }
                if (pc.shimon > 0) { this.log(`＞${pc.playerName}の死紋が解除された！`); pc.shimon = StatusFlag.NONE; }
                if (pc.shitto === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の嫉妬が解除された！`); pc.shitto = StatusFlag.NONE; }
                if (pc.shikiyoku === StatusFlag.ACTIVE) { this.log(`＞${pc.playerName}の色欲が解除された！`); pc.shikiyoku = StatusFlag.NONE; }
                this.log();
                break;
            }
        }
    }

    private updateTimers(pc: Player): void {
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.kage[i] === StatusFlag.ACTIVE) { pc.kage[i] = StatusFlag.NONE; pc.scar[i] = 1; }
            if (pc.limited[i] === StatusFlag.RESERVED) { pc.limited[i] = StatusFlag.ACTIVE; pc.scar[i] = 1; }
        }
    }

    private applyPoisonDamage(pc: Player): number {
        if (pc.tyudoku !== StatusFlag.ACTIVE) return 0;
        this.log(`＞${pc.playerName}は毒に蝕まれている！`);
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.type[i] !== Player.NONE && pc.scar[i] === 0) {
                this.log(`＞${pc.playerName}の【${pc.name[i]}】${i + 1}が毒によって破壊された！`);
                pc.scar[i] = 1;
                return 1;
            }
        }
        return 0;
    }

    private triggerStartPhaseSkills(pc: Player): number {
        // 霊化は戦闘開始時のみ発動する
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (this.turn === 1 && pc.skill[i] === "霊") {
                if (pc.reika === 0) {
                    this.log(`${pc.playerName}の【霊化】${i + 1}が発動！`);
                    pc.reika = StatusFlag.ACTIVE;
                    pc.bouheki += 1;
                    this.log(`＞${pc.playerName}に防壁が1つ与えられた！`);
                    this.log(`＞${pc.playerName}に霊化が与えられた！`);
                }
            }
        }

        const skillIdx = this.findSkillByLevel(pc, this.turn);
        if (skillIdx === -1) return 0;
        const skill = pc.skill[skillIdx];
        
        if (skill === "無") {
            this.log(`${pc.playerName}の【${pc.name[skillIdx]}】${pc.getSkillLevel(skillIdx)}が発動！`);
            this.log(`＞${pc.playerName}に無想が与えられた！`);
            pc.musou = StatusFlag.ACTIVE;
            pc.limited[skillIdx] = StatusFlag.RESERVED;
            return 1;
        }
        if (skill === "先") {
            this.log(`${pc.playerName}の【${pc.name[skillIdx]}】${pc.getSkillLevel(skillIdx)}が発動！`);
            this.log(`＞${pc.playerName}に先制が与えられた！`);
            pc.sensei = StatusFlag.ACTIVE;
            return 1;
        }
        return 0;
    }

    private findSkillByLevel(pc: Player, level: number): number {
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.getSkillLevel(i) === level) return i;
        }
        return -1;
    }

    /**
     * 先攻決定フェイズ
     */
    private phaseSpeed(isLogging: boolean): { first: Player, second: Player } {
        const speed1 = this.calculateCurrentSpeed(this.pc1, this.pc2);
        const speed2 = this.calculateCurrentSpeed(this.pc2, this.pc1);

        if (isLogging) {
            this.log(`${this.pc1.playerName} 速度：${speed1 === 999 ? "先制" : speed1 === -999 ? "スタン" : speed1}`);
            this.log(`${this.pc2.playerName} 速度：${speed2 === 999 ? "先制" : speed2 === -999 ? "スタン" : speed2}`);
            this.log();
        }

        if (speed1 >= speed2) {
            if (isLogging) this.log(`${this.pc1.playerName}の先攻！${speed1 === speed2 ? "（速度同値のため）" : ""}`);
            return { first: this.pc1, second: this.pc2 };
        } else {
            if (isLogging) this.log(`${this.pc2.playerName}の先攻！`);
            return { first: this.pc2, second: this.pc1 };
        }
    }

    private calculateCurrentSpeed(pc: Player, opponent: Player): number {
        if (pc.stan === StatusFlag.ACTIVE && opponent.stan === StatusFlag.NONE) return -999;
        if (pc.sensei === StatusFlag.ACTIVE && opponent.sensei === StatusFlag.NONE) return 999;

        for (let i = 0; i < pc.getSkillsLength(); i++) {
            // 発動可能な攻撃または補助スキルを探す
            if (this.isActionableSkill(pc, i)) {
                let speed = pc.speed[i];
                
                // 剣舞の特殊処理
                if (pc.skill[i] === "剣") {
                    speed = Math.max(0, speed);
                }

                // 速度補正
                let speedBuf = 0;
                
                // 隣接付帯効果
                if (i < pc.getSkillsLength() - 1) {
                    if (pc.skill[i + 1] === "速") speedBuf += 1;
                    if (pc.type[i] === Player.ATTACK && pc.skill[i + 1] === "弓") speedBuf += 3;
                }

                // 状態異常・バフ
                if (pc.kakugo === StatusFlag.ACTIVE) speedBuf += 2;
                if (pc.gouman > 0) speedBuf += 1;
                
                // 相手の座礁チェック
                for (let k = 0; k < opponent.getSkillsLength(); k++) {
                    if (opponent.skill[k] === "礁") speedBuf -= 1;
                }

                return speed + speedBuf;
            }
        }
        return 0;
    }

    private isActionableSkill(pc: Player, idx: number): boolean {
        const type = pc.type[idx];
        const skill = pc.skill[idx];
        
        if (type === Player.NONE) return false;
        
        // リミテッド使用済みチェック
        if (pc.limited[idx] === StatusFlag.RESERVED) return false;

        // 攻撃スキルの場合
        if (type === Player.ATTACK) {
            // 反撃付帯がついていないこと
            const hasCounter = (idx < pc.getSkillsLength() - 1 && pc.skill[idx + 1] === "反");
            // 隠刃の隔ターン判定
            const isHiddenNotActive = (skill === "隠" && this.turn % 2 !== 0);
            
            if (!hasCounter && !isHiddenNotActive) return true;
        }
        
        // 補助スキルの場合
        if (type === Player.BUFF) return true;

        return false;
    }

    private isReusableActionSkill(pc: Player, selectedSkill: SelectedActionSkill): boolean {
        const { idx, skill } = selectedSkill;
        if (idx < 0 || idx >= pc.getSkillsLength()) return false;

        const type = pc.type[idx];
        if (pc.skill[idx] !== skill) return false;
        if (type === Player.NONE) return false;

        if (type === Player.ATTACK) {
            const hasCounter = (idx < pc.getSkillsLength() - 1 && pc.skill[idx + 1] === "反");
            const isHiddenNotActive = (pc.skill[idx] === "隠" && this.turn % 2 !== 0);
            return !hasCounter && !isHiddenNotActive;
        }

        return type === Player.BUFF;
    }

    /**
     * 攻撃フェイズ
     */
    private phaseAction(attacker: Player, defender: Player, isFirst: boolean, preferredSkill?: SelectedActionSkill): SelectedActionSkill {
        let skillIdx = -1;
        let isUragasumi = false;

        // 裏霞の確認
        for (let i = 0; i < attacker.getSkillsLength(); i++) {
            if (attacker.skill[i] === "裏") {
                this.log(`${attacker.playerName}の【${attacker.name[i]}】${i + 1}が発動！`);
                this.log();
                isUragasumi = true;
                break;
            }
        }

        // スキルの決定
        if (preferredSkill && this.isReusableActionSkill(attacker, preferredSkill)) {
            skillIdx = preferredSkill.idx;
        } else {
            if (isUragasumi) {
                for (let i = attacker.getSkillsLength() - 1; i >= 0; i--) {
                    if (this.isActionableSkill(attacker, i)) {
                        skillIdx = i;
                        break;
                    }
                }
            } else {
                for (let i = 0; i < attacker.getSkillsLength(); i++) {
                    if (this.isActionableSkill(attacker, i)) {
                        skillIdx = i;
                        break;
                    }
                }
            }
        }

        const usedSkill = skillIdx >= 0 ? attacker.skill[skillIdx] : "";

        if (skillIdx === -1) {
            if (attacker.reika > 0) {
                this.log(`${attacker.playerName}は霊化しているため【影討】を使用！`);
                // 影討のダミーインデックスとして -2 を使うか、直接処理する
                this.log(`${attacker.playerName}の【影討】0！`);
                this.handleBuffSkill(attacker, defender, -2); // -2 は 霊化による影討
            } else {
                this.log(`${attacker.playerName}の【弱撃】0！`);
                this.executeAttack(attacker, defender, -1, 1, 0); // 弱撃
            }
        } else {
            this.log(`${attacker.playerName}の【${attacker.name[skillIdx]}】${skillIdx + 1}！`);
            this.processSkillEffects(attacker, defender, skillIdx, isFirst);
        }

        // 攻撃後のエフェクト適用と破壊
        if (this.applyEffects(attacker, defender) + this.applyEffects(defender, attacker) >= 1) this.log();
        if (this.applyBreakup(attacker) + this.applyBreakup(defender) >= 1) this.log();
        return { idx: skillIdx, skill: usedSkill };
    }

    private processSkillEffects(attacker: Player, defender: Player, idx: number, isFirst: boolean): void {
        // リミテッド処理
        if (attacker.limited[idx] === StatusFlag.ACTIVE) attacker.limited[idx] = StatusFlag.RESERVED;
        // ＋弓によるリミテッド化
        if (attacker.type[idx] === Player.ATTACK && idx < attacker.getSkillsLength() - 1 && attacker.skill[idx + 1] === "弓") {
            attacker.limited[idx] = StatusFlag.RESERVED;
        }

        // ダメージと速度の計算
        let damage = this.calculateSkillDamage(attacker, defender, idx, isFirst, 0);
        let speed = attacker.speed[idx];

        // 補助・付帯効果の適用
        let damageBuf = 0;
        const noEnchant = (attacker.skill[idx] === "▽");

        if (attacker.nextLvUp === 1) {
            this.log("＞協奏の効果でLVが+1された！");
            damage++; speed++; attacker.nextLvUp = 0;
        }

        if (idx < attacker.getSkillsLength() - 1 && !noEnchant) {
            const nextSkill = attacker.skill[idx + 1];
            if (nextSkill === "強") { this.log(`＞【＋強】${idx + 2}の効果でダメージが1点上昇！`); damageBuf++; }
            if (nextSkill === "速") this.log(`＞【＋速】${idx + 2}の効果で速度に+1！`);
            if (attacker.type[idx] === Player.ATTACK && nextSkill === "錬") { this.log(`＞【＋錬】${idx + 2}の効果で迎撃スキルの発動を1回のみ無効に！`); attacker.limited[idx + 1] = StatusFlag.RESERVED; }
            if (nextSkill === "盾") {
                this.log(`＞【＋盾】${idx + 2}の効果で防壁が2つ与えられる！`);
                this.grantBouheki(attacker, 2);
                attacker.limited[idx + 1] = StatusFlag.RESERVED;
            }
            if (nextSkill === "光" && attacker.skill[idx] === "一") { this.log(`＞【＋光】${idx + 2}の効果でダメージが2点上昇！`); damageBuf += 2; }
        }

        if (attacker.kakugo === StatusFlag.ACTIVE) { this.log("＞覚悟の効果でダメージが1点上昇！速度に+2！"); damageBuf++; }
        if (attacker.kyousou > 0) { this.log(`＞協奏の効果でダメージが${attacker.kyousou}点上昇！速度に+${attacker.kyousou}！`); damageBuf += attacker.kyousou; }
        if (attacker.funnu > 0) { this.log("＞憤怒の効果でダメージが1点上昇！"); damageBuf++; }
        if (attacker.gekirin > 0) { this.log(`＞逆鱗の効果でダメージが${attacker.gekirin}点上昇！`); damageBuf += attacker.gekirin; attacker.gekirin = 0; }
        
        if (attacker.roubai === StatusFlag.ACTIVE) this.log("＞狼狽の効果で速度が0になっている！");
        if (attacker.yakedo === StatusFlag.ACTIVE) { this.log("＞火傷の効果でダメージが1下がった！"); damageBuf--; }
        if (attacker.shikiyoku > 0) { this.log("＞色欲の効果でダメージが1下がった！"); damageBuf--; }
        if (defender.shimon > 0) { this.log(`＞死紋の効果で${defender.playerName}へのダメージが${defender.shimon}点上昇！`); damageBuf += defender.shimon; }

        // 最終ダメージ・速度
        let finalDamage = Math.max(0, damage + damageBuf);
        if ((attacker.yakedo === StatusFlag.ACTIVE || attacker.shikiyoku > 0) && finalDamage < 1 && damage > 0) finalDamage = 1; // 最低1 (火傷、色欲)

        let finalSpeed = speed;
        if (idx < attacker.getSkillsLength() - 1 && attacker.skill[idx + 1] === "速" && !noEnchant) finalSpeed += 1;
        
        // ＋弓の効果
        if (attacker.type[idx] === Player.ATTACK && idx < attacker.getSkillsLength() - 1 && attacker.skill[idx + 1] === "弓") {
            this.log(`＞【＋弓】${idx + 2}の効果でリミテッド化！速度に+3！`);
            finalSpeed += 3;
        }

        if (attacker.kakugo === StatusFlag.ACTIVE) finalSpeed += 2;
        if (attacker.kyousou > 0) finalSpeed += attacker.kyousou;
        if (attacker.gouman > 0) finalSpeed += 1;

        for (let k = 0; k < defender.getSkillsLength(); k++) {
            if (defender.skill[k] === "礁") finalSpeed = Math.max(finalSpeed - 1, 0);
        }
        if (attacker.roubai === StatusFlag.ACTIVE) finalSpeed = 0;

        // 攻撃の実行
        if (attacker.type[idx] === Player.BUFF) {
            this.handleBuffSkill(attacker, defender, idx);
        } else {
            const count = attacker.skill[idx] === "▽" ? 3 : 1;

            // 飛行の確認
            if (finalSpeed === 0 && attacker.skill[idx] != "弱") {
                for (let k = 0; k < defender.getSkillsLength(); k++) {
                    if (defender.skill[k] === "飛") {
                        this.log(`＞${defender.playerName}の【${defender.name[k]}】${k + 1}が発動！`);
                        this.log(`＞${defender.playerName}は速度0の攻撃を受けない！`);
                        this.reserveSelfSkillEffects(attacker, idx);
                        return;
                    }
                }
            }

            if (attacker.skill[idx] === "滅") this.clearGoodStatuses(defender, "撃滅");

            for (let c = 0; c < count; c++) {
                this.executeAttack(attacker, defender, idx, finalDamage, finalSpeed);
                if (count > 1 && c < count - 1) {
                    this.resolveImmediateStateChanges(attacker, defender);
                }
            }
        }

        // 攻撃スキルの追加効果予約
        this.reserveSkillEffects(attacker, defender, idx);

        // 強欲の更新
        if (attacker.skill[idx] === "欲") attacker.gouyoku = StatusFlag.RESERVED;
    }

    private resolveImmediateStateChanges(attacker: Player, defender: Player): void {
        if (this.applyEffects(attacker, defender) + this.applyEffects(defender, attacker) >= 1) this.log();
        if (this.applyBreakup(attacker) + this.applyBreakup(defender) >= 1) this.log();
    }

    private handleBuffSkill(attacker: Player, defender: Player, idx: number): void {
        const skill = idx === -2 ? "影" : attacker.skill[idx];
        switch (skill) {
            case "奏":
                attacker.kyousou_ = StatusFlag.RESERVED;
                attacker.suijaku = StatusFlag.RESERVED;
                break;
            case "癒":
                if (idx >= 0) attacker.chiyuReserved.push(Math.max(attacker.getSkillLevel(idx) - 1, 0));
                break;
            case "凍":
                defender.roubai = StatusFlag.RESERVED;
                if (idx >= 0) attacker.limited[idx] = StatusFlag.FROZEN; // 終了フェイズ処理のため
                break;
            case "魚": this.log(`＞${defender.playerName}に1点のダメージ！（迎撃不可）`); attacker.gyogun = 1; break;
            case "盗": this.log("＞盗賊の効果！"); attacker.tozoku = 1; break;
            case "覚": attacker.kakugo = StatusFlag.RESERVED; break;
            case "防": attacker.bouheki_ = StatusFlag.RESERVED; break;
            case "毒": defender.tyudoku = StatusFlag.RESERVED; break;
            case "影":
                this.reserveKageuchi(defender);
                break;
        }
    }

    private calculateSkillDamage(attacker: Player, defender: Player, idx: number, isFirst: boolean, incomingSpeed: number): number {
        switch (attacker.skill[idx]) {
            case "剣": {
                let damage = 0;
                for (let j = 0; j < attacker.getSkillsLength(); j++) {
                    if (attacker.type[j] === Player.ATTACK && !(j < attacker.getSkillsLength() - 1 && attacker.skill[j + 1] === "反")) {
                        damage++;
                    }
                }
                return damage;
            }
            case "怒":
                return this.turn;
            case "瘴": {
                let damage = 0;
                for (let j = 0; j < attacker.getSkillsLength(); j++) if (attacker.skill[j] === "疫") damage++;
                for (let j = 0; j < defender.getSkillsLength(); j++) if (defender.skill[j] === "疫") damage++;
                return damage;
            }
            case "拳":
                return isFirst ? 2 : 1;
            case "死": {
                let damage = 1;
                if (defender.stan > 0) damage++;
                if (defender.roubai > 0) damage++;
                if (defender.suijaku > 0) damage++;
                if (defender.tyudoku > 0) damage++;
                if (defender.yakedo > 0) damage++;
                if (defender.shimon > 0) damage += defender.shimon;
                if (defender.shitto > 0) damage++;
                if (defender.shikiyoku > 0) damage++;
                return damage;
            }
            case "狼":
            case "爆":
                return attacker.getSkillLevel(idx);
            case "玉":
                return incomingSpeed;
            case "▽":
            case "魔":
                return 1;
            case "憤": {
                let damage = 0;
                for (let k = 0; k < attacker.getSkillsLength(); k++) {
                    if (attacker.type[k] === Player.NONE && attacker.skill[k] !== "空" && attacker.skill[k] !== "＿") damage++;
                }
                return damage;
            }
            default:
                return attacker.damage[idx];
        }
    }

    private grantBouheki(pc: Player, count: number): void {
        if (pc.shitto > 0) {
            this.log(`${pc.playerName}は嫉妬のため防壁を受け取れない！`);
            return;
        }
        pc.bouheki += count;
        this.log(`＞${pc.playerName}に防壁が${count}つ与えられた！`);
    }

    private clearGoodStatuses(pc: Player, sourceName: string): void {
        const hadGoodStatus =
            pc.kakugo === StatusFlag.ACTIVE ||
            pc.bouheki > 0 ||
            pc.musou === StatusFlag.ACTIVE ||
            pc.sensei === StatusFlag.ACTIVE ||
            pc.kaifuku > 0 ||
            pc.chiyu.length > 0 ||
            pc.kyousou > 0 ||
            pc.reika > 0;

        pc.kakugo = 0;
        pc.bouheki = 0;
        pc.musou = 0;
        pc.sensei = 0;
        pc.kaifuku = 0;
        pc.chiyu = [];
        pc.chiyuReserved = [];
        pc.kyousou = 0;
        pc.reika = 0;

        if (hadGoodStatus) this.log(`＞${sourceName}の効果で${pc.playerName}の良い状態が全て解除された！`);
    }

    private reserveSelfSkillEffects(attacker: Player, idx: number): void {
        const s = attacker.skill[idx];
        if (s === "紫") attacker.stan = StatusFlag.RESERVED;
        if (s === "爆") {
            attacker.suijaku = StatusFlag.RESERVED;
            attacker.stan = StatusFlag.RESERVED;
            attacker.yakedo = StatusFlag.RESERVED;
        }
    }

    private reserveKageuchi(defender: Player): void {
        for (let i = 0; i < defender.getSkillsLength(); i++) {
            if (defender.type[i] !== Player.NONE) {
                if (defender.skill[i] === "Ｈ") {
                    this.log(`＞${defender.playerName}の【ＨＰ】${i + 1}は【影討】の効果を受けない！`);
                    return;
                }
                for (let j = 0; j < defender.getSkillsLength(); j++) {
                    if (defender.skill[j] === defender.skill[i] && defender.skill[j] !== "Ｈ") {
                        defender.kage[j] = StatusFlag.RESERVED;
                    }
                }
                return;
            }
        }
    }

    private getStatusName(key: string): string {
        const names: Record<string, string> = { tyudoku: "毒", yakedo: "火傷", roubai: "狼狽", stan: "スタン", suijaku: "忘却" };
        return names[key] || key;
    }

    private executeAttack(attacker: Player, defender: Player, useIdx: number, damage: number, speed: number): void {
        if (damage > 0) this.log(`＞${defender.playerName}に${damage}点のダメージ！（速度：${speed}）`);
        this.log();

        let isSuspended = false;
        const counterSuppressions = this.getCounterSuppressionSources(attacker, useIdx);

        for (let d = 0; d < damage; d++) {
            if (defender.musou === StatusFlag.ACTIVE) { this.log(`＞${defender.playerName}は無想の効果でダメージを受けない！`); break; }
            if (defender.bouheki >= 1) {
                this.log(`＞${defender.playerName}は防壁の効果でダメージを受けない！`);
                const removeCount = Math.ceil(defender.bouheki / 2);
                this.log(`＞${defender.playerName}の防壁が${removeCount}個解除された！`);
                defender.bouheki -= removeCount;
                break;
            }

            // ターゲット選択
            let targetIdx = this.selectTarget(attacker, defender, useIdx);
            if (targetIdx === -1) break;

            if (defender.skill[targetIdx] === "極" && defender.extremeHpRemaining[targetIdx] > 1) {
                const absorbed = this.applyExtremeHpDamage(defender, targetIdx, damage - d, "＞");
                d += absorbed - 1;
                continue;
            }

            // ダメージ適用
            this.log(`＞${defender.playerName}の【${defender.name[targetIdx]}】${targetIdx + 1}にダメージを与えた！`);
            defender.scar[targetIdx] = 2; // 適用前ダメージ

            // 迎撃判定
            if (this.handleCounter(attacker, defender, useIdx, targetIdx, speed, counterSuppressions)) {
                if (d < damage - 1) {
                    this.log(`＞${attacker.playerName}の【${attacker.name[useIdx]}】${useIdx + 1}が強制中断された！`);
                    isSuspended = true;
                }
                break; 
            }

        }

        // 烈風によるスキル破壊
        if (!isSuspended){
            if (useIdx !== -1 && (attacker.skill[useIdx] === "烈")) {
                const damage = 1;
                for (let d = 0; d < damage; d++) {
                    let targetIdx = this.selectTarget(attacker, defender, useIdx);
                    if (targetIdx === -1) break;
                    if (defender.skill[targetIdx] === "極" && defender.extremeHpRemaining[targetIdx] > 1) {
                        defender.extremeHpRemaining[targetIdx]--;
                        this.log(`＞烈風の効果を${defender.playerName}の【極限】${targetIdx + 1}が【ＨＰ】として受け止めた！（残り${defender.extremeHpRemaining[targetIdx]}）`);
                        continue;
                    }
                    this.log(`＞烈風の効果で、さらに【${defender.name[targetIdx]}】${targetIdx + 1}が破壊される！`);
                    defender.scar[targetIdx] = 2; // 適用前ダメージ
                }
            }  
        }

        // 一時ダメージの確定
        this.finalizeDamage(attacker);
        this.finalizeDamage(defender);
    }

    private getCounterSuppressionSources(attacker: Player, useIdx: number): number[] {
        if (useIdx === -1) return [];

        const sources: number[] = [];
        if (attacker.skill[useIdx] === "狼") sources.push(useIdx);
        if (attacker.type[useIdx] === Player.ATTACK && useIdx < attacker.getSkillsLength() - 1 && attacker.skill[useIdx + 1] === "錬") sources.push(useIdx + 1);
        return sources;
    }

    private selectTarget(attacker: Player, defender: Player, useIdx: number): number {

        // 刺突・艦砲の特殊ターゲット
        if (useIdx !== -1 && (attacker.skill[useIdx] === "刺" || attacker.skill[useIdx] === "砲")) {
            return this.selectPiercingTarget(defender, attacker.getSkillLevel(useIdx));
        }

        for (let i = 0; i < defender.getSkillsLength(); i++) {
            if (defender.type[i] !== Player.NONE && defender.scar[i] !== 2) return i;
        }

        return -1;
    }

    private selectPiercingTarget(defender: Player, level: number): number {
        let bestDiff = 999;
        let bestIdx = -1;
        for (let i = 0; i < defender.getSkillsLength(); i++) {
            if (defender.type[i] !== Player.NONE && defender.scar[i] !== 2) {
                const diff = Math.abs(level - defender.getSkillLevel(i));
                if (diff < bestDiff || (diff === bestDiff && i > bestIdx)) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
        }
        return bestIdx;
    }

    private handleCounter(attacker: Player, defender: Player, useIdx: number, targetIdx: number, attackerSpeed: number, counterSuppressions: number[]): boolean {
        const isCounterSkill = (defender.type[targetIdx] === Player.COUNTER || 
                              (defender.type[targetIdx] === Player.ATTACK && targetIdx < defender.getSkillsLength() - 1 && defender.skill[targetIdx + 1] === "反"));
        if (!isCounterSkill) return false;

        // ＋錬・狼嵐による迎撃無効化（スキル使用ごとに1回ずつ）
        if (counterSuppressions.length > 0) {
            const sourceIdx = counterSuppressions.shift()!;
            this.log(`＞【${attacker.name[sourceIdx]}】${sourceIdx + 1}の効果で${defender.playerName}の【${defender.name[targetIdx]}】${targetIdx + 1}は発動しない！`);
            return false;
        }

        // 迎撃速度の計算
        let counterSpeed = defender.speed[targetIdx];
        if (defender.skill[targetIdx] === "剣") {
             // 剣舞の迎撃ダメージ再計算（元コードにあるが迎撃時はダメージ固定が多いので必要か検討）
        }
        if (targetIdx < defender.getSkillsLength() - 1 && defender.skill[targetIdx + 1] === "速") counterSpeed += 1;
        if (defender.kakugo === StatusFlag.ACTIVE) counterSpeed += 2;

        if (counterSpeed >= attackerSpeed || useIdx === -1) {
            this.log(`＞${defender.playerName}の【${defender.name[targetIdx]}】${targetIdx + 1}が発動！（速度：${counterSpeed}）`);
            if (defender.limited[targetIdx] === StatusFlag.ACTIVE) defender.limited[targetIdx] = StatusFlag.RESERVED;

            // 反撃ダメージの処理
            const defenderIsFirst = this.roundFirst === defender;
            let cDamage = this.calculateSkillDamage(defender, attacker, targetIdx, defenderIsFirst, attackerSpeed);
            if (defender.kakugo === StatusFlag.ACTIVE) cDamage += 1;

            for (let i = 0; i < cDamage; i++) {
                let cTarget = -1;
                if (defender.skill[targetIdx] === "交") {
                    if (useIdx === -1) { this.log(`＞＞${attacker.playerName}の【弱撃】0はダメージの対象にならない！`); break; }
                    cTarget = useIdx;
                } else if (defender.skill[targetIdx] === "刺" || defender.skill[targetIdx] === "砲") {
                    cTarget = this.selectPiercingTarget(attacker, defender.getSkillLevel(targetIdx));
                } else {
                    for (let j = 0; j < attacker.getSkillsLength(); j++) {
                        if (attacker.type[j] !== Player.NONE && attacker.scar[j] !== 2) { cTarget = j; break; }
                    }
                }

                if (cTarget !== -1) {
                    if (attacker.skill[cTarget] === "極" && attacker.extremeHpRemaining[cTarget] > 1) {
                        const absorbed = this.applyExtremeHpDamage(attacker, cTarget, cDamage - i, "＞＞");
                        i += absorbed - 1;
                        continue;
                    }
                    this.log(`＞＞${attacker.playerName}の【${attacker.name[cTarget]}】${cTarget + 1}にダメージを与えた！`);
                    attacker.scar[cTarget] = 2;
                }
            }

            // 迎撃による状態異常付与
            this.reserveCounterEffects(attacker, defender, targetIdx);

            // 幻惑による終了フェイズ破壊予約
            if (defender.skill[targetIdx] === "幻") {
                defender.scar[targetIdx] = 0;
                defender.kage[targetIdx] = StatusFlag.RESERVED;
                this.log(`＞＞${defender.playerName}の【幻惑】${targetIdx + 1}は終了フェイズまで破壊されない！`);
            }

            return true; // 攻撃中断
        }

        return false;
    }

    private applyExtremeHpDamage(pc: Player, targetIdx: number, damage: number, logPrefix: string): number {
        const absorbed = Math.min(damage, pc.extremeHpRemaining[targetIdx] - 1);
        pc.extremeHpRemaining[targetIdx] -= absorbed;
        const damageText = absorbed === 1 ? "ダメージ" : `${absorbed}点のダメージ`;
        this.log(`${logPrefix}${pc.playerName}の【極限】${targetIdx + 1}が【ＨＰ】として${damageText}を受けた！（残り${pc.extremeHpRemaining[targetIdx]}）`);
        return absorbed;
    }

    private reserveSkillEffects(attacker: Player, defender: Player, idx: number): void {
        const s = attacker.skill[idx];
        if (s === "毒") defender.tyudoku = StatusFlag.RESERVED;
        if (s === "焦") defender.yakedo = StatusFlag.RESERVED;
        if (s === "覚") attacker.kakugo = StatusFlag.RESERVED;
        if (s === "防") attacker.bouheki_ = StatusFlag.RESERVED;
        if (s === "封") { defender.stan = StatusFlag.RESERVED; defender.roubai = StatusFlag.RESERVED; defender.suijaku = StatusFlag.RESERVED; }
        if (s === "紫") attacker.stan = StatusFlag.RESERVED;
        if (s === "呪") defender.suijaku = StatusFlag.RESERVED;
        if (s === "魔") {
            defender.shimon++;
            this.log(`＞魔弾の効果で${defender.playerName}に死紋が刻まれた！`);
        }
        if (s === "爆") {
            attacker.suijaku = StatusFlag.RESERVED;
            attacker.stan = StatusFlag.RESERVED;
            attacker.yakedo = StatusFlag.RESERVED;
        }
        
        // 盗賊の効果
        if (s === "盗" || attacker.tozoku === 1) {
            this.log(`＞盗賊の効果で${defender.playerName}の良い状態を全て奪った！`);
            if (defender.kakugo === StatusFlag.ACTIVE) { attacker.kakugo = StatusFlag.ACTIVE; defender.kakugo = 0; }
            if (defender.bouheki > 0) { attacker.bouheki += defender.bouheki; defender.bouheki = 0; }
            if (defender.musou === StatusFlag.ACTIVE) { attacker.musou = StatusFlag.ACTIVE; defender.musou = 0; }
            if (defender.sensei === StatusFlag.ACTIVE) { attacker.sensei = StatusFlag.ACTIVE; defender.sensei = 0; }
            if (defender.kaifuku > 0) { attacker.kaifuku = StatusFlag.ACTIVE; defender.kaifuku = 0; }
            if (defender.chiyu.length > 0) {
                if (attacker.chiyu.length === 0) attacker.chiyu = [defender.chiyu[0]];
                defender.chiyu = [];
                defender.chiyuReserved = [];
            }
            if (defender.kyousou > 0) { attacker.kyousou += defender.kyousou; defender.kyousou = 0; }
            if (defender.reika > 0) { attacker.reika = StatusFlag.ACTIVE; defender.reika = 0; }
            attacker.tozoku = 0;
        }
    }

    private reserveCounterEffects(attacker: Player, defender: Player, targetIdx: number): void {
        const s = defender.skill[targetIdx];
        if (s === "崩") attacker.stan = StatusFlag.RESERVED;
        if (s === "搦") attacker.roubai = StatusFlag.RESERVED;
        if (s === "疫") attacker.ekibyo = StatusFlag.RESERVED;
        if (s === "紫") defender.stan = StatusFlag.RESERVED;
        if (s === "呪") attacker.suijaku = StatusFlag.RESERVED;
        if (s === "水") this.grantBouheki(defender, 1);
        if (s === "転") defender.roubai = StatusFlag.RESERVED;
        if (s === "受") {
            // 自分の悪い状態を相手に、相手の悪い状態を自分に？
            // skillsData: "あなたが受けている悪い状態を全て解除し、相手に同じ状態を全て与える。"
            if (defender.tyudoku > 0) { attacker.tyudoku = StatusFlag.RESERVED; defender.tyudoku = 0; }
            if (defender.yakedo > 0) { attacker.yakedo = StatusFlag.RESERVED; defender.yakedo = 0; }
            if (defender.roubai > 0) { attacker.roubai = StatusFlag.RESERVED; defender.roubai = 0; }
            if (defender.stan > 0) { attacker.stan = StatusFlag.RESERVED; defender.stan = 0; }
            if (defender.suijaku > 0) { attacker.suijaku = StatusFlag.RESERVED; defender.suijaku = 0; }
            if (defender.shimon > 0) { attacker.shimon += defender.shimon; defender.shimon = 0; }
            if (defender.shitto > 0) { attacker.shitto = StatusFlag.RESERVED; defender.shitto = 0; }
            if (defender.shikiyoku > 0) { attacker.shikiyoku = StatusFlag.RESERVED; defender.shikiyoku = 0; }
            this.log(`＞${defender.playerName}の悪い状態が${attacker.playerName}に移し替えられた！`);
        }
    }

    private finalizeDamage(pc: Player): void {
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.scar[i] === 2) pc.scar[i] = 1;
        }
    }

    /**
     * エフェクトの適用
     */
    private applyEffects(pc1: Player, pc2: Player): number {
        let flag = 0;
        const hasShitto = (pc1.shitto > 0);

        if (pc1.kakugo === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため覚悟を受け取れない！`);
            else { this.log(`${pc1.playerName}に覚悟が与えられた！`); pc1.kakugo = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.bouheki_ === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため防壁を受け取れない！`);
            else { this.log(`${pc1.playerName}に防壁が与えられた！`); pc1.bouheki += 3; flag = 1; }
            pc1.bouheki_ = 0;
        }
        if (pc1.tate === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため防壁を受け取れない！`);
            else { this.log(`${pc1.playerName}に防壁が与えられた！`); pc1.bouheki += 2; flag = 1; }
            pc1.tate = 0;
        }
        if (pc1.stan === StatusFlag.RESERVED) { this.log(`${pc1.playerName}はスタンを受けた！`); pc1.stan = StatusFlag.ACTIVE; flag = 1; }
        if (pc1.roubai === StatusFlag.RESERVED) { this.log(`${pc1.playerName}は狼狽を受けた！`); pc1.roubai = StatusFlag.ACTIVE; flag = 1; }
        if (pc1.suijaku === StatusFlag.RESERVED) {
            this.log(`${pc1.playerName}は忘却を受けた！`);
            pc1.suijaku = StatusFlag.ACTIVE;
            flag = 1;
        }
        if (pc1.tyudoku === StatusFlag.RESERVED) { this.log(`${pc1.playerName}は毒を受けた！`); pc1.tyudoku = StatusFlag.ACTIVE; flag = 1; }
        if (pc1.yakedo === StatusFlag.RESERVED) { this.log(`${pc1.playerName}は火傷を受けた！`); pc1.yakedo = StatusFlag.ACTIVE; flag = 1; }
        
        if (pc1.kaifuku === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため回復状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は回復状態になった！`); pc1.kaifuku = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.chiyuReserved.length > 0) {
            if (hasShitto) {
                this.log(`${pc1.playerName}は嫉妬のため治癒状態を受け取れない！`);
            } else if (pc1.chiyu.length > 0) {
                this.log(`${pc1.playerName}はすでに治癒(${pc1.chiyu[0]})状態のため、新たな治癒を受け取れない！`);
                flag = 1;
            } else {
                const round = pc1.chiyuReserved[0];
                pc1.chiyu.push(round);
                this.log(`${pc1.playerName}は治癒(${round})状態になった！`);
                flag = 1;
            }
            pc1.chiyuReserved = [];
        }
        if (pc1.kyousou_ === StatusFlag.RESERVED) {
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため協奏状態を受け取れない！`);
            else { this.log(`${pc1.playerName}に協奏が1つ与えられた！`); pc1.kyousou += 1; flag = 1; }
            pc1.kyousou_ = 0;
        }
        if (pc1.reika === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため霊化状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は霊化状態になった！`); pc1.reika = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.gouyoku === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため強欲状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は強欲状態になった！`); pc1.gouyoku = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.gouman === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため傲慢状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は傲慢状態になった！`); pc1.gouman = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.funnu === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため憤怒状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は憤怒状態になった！`); pc1.funnu = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.boushoku === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため暴食状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は暴食状態になった！`); pc1.boushoku = StatusFlag.ACTIVE; flag = 1; }
        }
        if (pc1.taida === StatusFlag.RESERVED) { 
            if (hasShitto) this.log(`${pc1.playerName}は嫉妬のため怠惰状態を受け取れない！`);
            else { this.log(`${pc1.playerName}は怠惰状態になった！`); pc1.taida = StatusFlag.ACTIVE; flag = 1; }
        }
        
        if (pc1.shitto === StatusFlag.RESERVED) { this.log(`${pc1.playerName}は嫉妬を受けた！`); pc1.shitto = StatusFlag.ACTIVE; flag = 1; }
        if (pc1.shikiyoku === StatusFlag.RESERVED) { this.log(`${pc1.playerName}は色欲を受けた！`); pc1.shikiyoku = StatusFlag.ACTIVE; flag = 1; }

        for (let i = 0; i < pc2.getSkillsLength(); i++) {
            if (pc2.kage[i] === StatusFlag.RESERVED) {
                this.log(`${pc2.playerName}の【${pc2.name[i]}】${i + 1}は終了フェイズに破壊される！`);
                pc2.kage[i] = StatusFlag.ACTIVE;
                flag = 1;
            }
        }

        if (pc1.ekibyo === StatusFlag.RESERVED) {
            for (let i = 0; i < pc1.getSkillsLength(); i++) {
                if (pc1.type[i] !== Player.NONE) {
                    if (pc1.skill[i] === "極") {
                        this.log(`${pc1.playerName}の【極限】${i + 1}はいかなる変化効果も受けない！`);
                        break;
                    }
                    this.log(`${pc1.playerName}の【${pc1.name[i]}】${i + 1}が【疫病】${i + 1}に変化した！`);
                    pc1.skill[i] = "疫"; pc1.name[i] = "疫病"; pc1.type[i] = Player.COUNTER;
                    pc1.speed[i] = pc1.getSkillLevel(i); pc1.damage[i] = 0; pc1.limited[i] = 0;
                    break;
                }
            }
            pc1.ekibyo = 0; flag = 1;
        }
        return flag;
    }

    /**
     * 破壊処理
     */
    private applyBreakup(pc: Player): number {
        let flag = 0;
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.scar[i] === 1) {
                if (pc.skill[i] === "極" && pc.extremeHpRemaining[i] > 1) {
                    pc.extremeHpRemaining[i]--;
                    this.log(`${pc.playerName}の【極限】${i + 1}が【ＨＰ】として破壊を受け止めた！（残り${pc.extremeHpRemaining[i]}）`);
                    pc.scar[i] = 0;
                    flag = 1;
                    continue;
                }

                // ＋硬による保護
                if (pc.type[i] !== Player.ENCHANT && i < pc.getSkillsLength() - 1 && pc.skill[i + 1] === "硬") {
                    this.log(`${pc.playerName}の【＋硬】${i + 2}によって【${pc.name[i]}】${i + 1}の破壊が無効化された！`);
                    this.log(`${pc.playerName}の【＋硬】${i + 2}が破壊された！`);
                    this.destroySkill(pc, i + 1);
                    pc.scar[i] = 0;
                } else {
                    this.log(`${pc.playerName}の【${pc.name[i]}】${i + 1}が破壊された！`);
                    // 逆鱗の発動
                    if (pc.skill[i] === "逆") {
                        this.log(`${pc.playerName}の【${pc.name[i]}】${i + 1}が発動！`);
                        this.log(`＞${pc.playerName}に逆鱗が与えられた！`);
                        pc.gekirin++;
                    }
                    this.destroySkill(pc, i);
                }
                flag = 1;
            }
        }
        return flag;
    }

    private destroySkill(pc: Player, idx: number): void {
        pc.skill[idx] = "＿";
        pc.name[idx] = "　　";
        pc.type[idx] = Player.NONE;
        pc.speed[idx] = 0;
        pc.damage[idx] = 0;
        pc.scar[idx] = 0;
        pc.limited[idx] = 0;
        pc.kage[idx] = 0;
    }

    /**
     * 連撃の実行
     */
    private executeRengeki(selectedSkills: Map<Player, SelectedActionSkill>): number {
        const applyRengeki = (pc: Player, opponent: Player, isFirst: boolean) => {
            for (let i = 0; i < pc.getSkillsLength(); i++) {
                if (pc.skill[i] === "連") {
                    this.log();
                    this.log(`${pc.playerName}の【${pc.name[i]}】${i + 1}が発動！`);
                    this.log();
                    this.log(`▼${pc.playerName}の攻撃フェイズ`);
                    this.log();
                    this.phaseAction(pc, opponent, isFirst, selectedSkills.get(pc));
                    return true;
                }
            }
            return false;
        };

        const { first } = this.phaseSpeed(false); // 再度誰が先攻か確認（状態が変わっている可能性があるため）
        const pc1IsFirst = (first === this.pc1);

        if (applyRengeki(this.pc1, this.pc2, pc1IsFirst)) {
            const res = this.judge(2);
            if (res !== BattleResult.CONTINUE) return res;
        }
        if (applyRengeki(this.pc2, this.pc1, !pc1IsFirst)) {
            const res = this.judge(1);
            if (res !== BattleResult.CONTINUE) return res;
        }
        return BattleResult.CONTINUE;
    }

    /**
     * 終了フェイズ
     */
    private phaseEnd(): void {
        let endFlag = 0;
        const endLogBefore = this.text;

        // 状態の解除
        if (this.pc1.musou === StatusFlag.ACTIVE) { this.log(`${this.pc1.playerName}の無想が解除された！`); this.pc1.musou = 0; endFlag = 1; }
        if (this.pc2.musou === StatusFlag.ACTIVE) { this.log(`${this.pc2.playerName}の無想が解除された！`); this.pc2.musou = 0; endFlag = 1; }
        if (this.pc1.sensei === StatusFlag.ACTIVE) { this.log(`${this.pc1.playerName}の先制が解除された！`); this.pc1.sensei = 0; endFlag = 1; }
        if (this.pc2.sensei === StatusFlag.ACTIVE) { this.log(`${this.pc2.playerName}の先制が解除された！`); this.pc2.sensei = 0; endFlag = 1; }

        // 毒のダメージ
        endFlag |= this.applyPoisonDamage(this.pc1);
        endFlag |= this.applyPoisonDamage(this.pc2);
        
        // 怠惰の処理
        endFlag |= this.applyTaida(this.pc1);
        endFlag |= this.applyTaida(this.pc2);

        // 死紋の増殖
        if (this.pc1.shimon > 0) {
            const addCount = this.pc1.shimon;
            this.log(`${this.pc1.playerName}の死紋が刻まれていく……（+${addCount}）`);
            this.pc1.shimon += addCount;
            endFlag = 1;
        }
        if (this.pc2.shimon > 0) {
            const addCount = this.pc2.shimon;
            this.log(`${this.pc2.playerName}の死紋が刻まれていく……（+${addCount}）`);
            this.pc2.shimon += addCount;
            endFlag = 1;
        }

        // 凍結の処理
        endFlag |= this.applyTouketsu(this.pc1);
        endFlag |= this.applyTouketsu(this.pc2);

        // 影討・リミテッドの更新
        this.updateTimers(this.pc1);
        this.updateTimers(this.pc2);

        if (this.applyBreakup(this.pc1) + this.applyBreakup(this.pc2) >= 1) endFlag = 1;

        // 回復の処理
        endFlag |= this.applyKaifuku(this.pc1);
        endFlag |= this.applyKaifuku(this.pc2);

        // 治癒の処理
        endFlag |= this.applyChiyu(this.pc1);
        endFlag |= this.applyChiyu(this.pc2);

        // 忘却の処理
        endFlag |= this.applySuijaku(this.pc1);
        endFlag |= this.applySuijaku(this.pc2);

        if (this.text === endLogBefore) this.log("なし");
        if (endFlag === 1) this.log();
    }

    private applyKaifuku(pc: Player): number {
        if (pc.kaifuku === 0) return 0;
        this.log(`＞回復の効果で${pc.playerName}の【ＨＰ】が復元された！`);
        
        for (let idx = 0; idx < pc.getSkillsLength(); idx++) {
            if(pc.name[idx] == "　　") {
                pc.skill[idx] = "Ｈ";
                pc.name[idx] = "ＨＰ";
                pc.type[idx] = Player.ENCHANT;
            }

        }
        this.log(`＞${pc.playerName}の回復が解除された！`);
        pc.kaifuku = 0;
        return 1;
    }

    private applyChiyu(pc: Player): number {
        if (pc.chiyu.length === 0) return 0;

        let flag = 0;
        const restoredIdx = this.restoreFirstDestroyedSkillAsHp(pc);
        if (restoredIdx >= 0) {
            this.log(`＞治癒の効果で${pc.playerName}の【${pc.name[restoredIdx]}】${restoredIdx + 1}が復元された！`);
            flag = 1;
        }

        const beforeCount = pc.chiyu.length;
        const expired = pc.chiyu.filter(round => this.turn >= round);
        pc.chiyu = pc.chiyu.filter(round => this.turn < round);
        for (const round of expired) {
            this.log(`＞${pc.playerName}の治癒(${round})が解除された！`);
        }
        if (pc.chiyu.length !== beforeCount) flag = 1;

        return flag;
    }

    private restoreFirstDestroyedSkillAsHp(pc: Player): number {
        for (let idx = 0; idx < pc.getSkillsLength(); idx++) {
            if (pc.type[idx] === Player.NONE && pc.skill[idx] === "＿") {
                pc.skill[idx] = "Ｈ";
                pc.name[idx] = "ＨＰ";
                pc.type[idx] = Player.ENCHANT;
                pc.speed[idx] = 0;
                pc.damage[idx] = 0;
                pc.scar[idx] = 0;
                pc.limited[idx] = 0;
                pc.kage[idx] = 0;
                return idx;
            }
        }
        return -1;
    }

    private applyTaida(pc: Player): number {
        if (pc.taida === 0) return 0;
        let count = 0;
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.type[i] === Player.COUNTER) count++;
        }
        if (count > 0) {
            this.log(`＞怠惰の効果で防壁が${count}個与えられた！`);
            pc.bouheki += count;
            return 1;
        }
        return 0;
    }

    private applyTouketsu(pc: Player): number {
        // 凍結スキルの有無をチェック
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.skill[i] === "凍" && pc.limited[i] === StatusFlag.FROZEN) {
                 // 相手の先頭スキルを破壊
                 const opponent = (pc === this.pc1 ? this.pc2 : this.pc1);
                 for (let j = 0; j < opponent.getSkillsLength(); j++) {
                     if (opponent.type[j] !== Player.NONE && opponent.scar[j] === 0) {
                         this.log(`＞【凍結】の効果で${opponent.playerName}の【${opponent.name[j]}】${j + 1}を破壊した！`);
                         opponent.scar[j] = 1;
                         break;
                     }
                 }
                 return 1;
            }
        }
        return 0;
    }

    private clearTouketsu(pc: Player): number {
        // 凍結スキルの予約を解除
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.skill[i] === "凍" && pc.limited[i] === StatusFlag.FROZEN) {
                 pc.limited[i] = StatusFlag.NONE;
            }
        }
        return 0;
    }

    private applySuijaku(pc: Player): number {
        if (pc.suijaku !== StatusFlag.ACTIVE) return 0;
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.type[i] !== Player.NONE && pc.skill[i] !== "空") {
                if (pc.skill[i] === "極") {
                    this.log(`${pc.playerName}の【極限】${i + 1}はいかなる変化効果も受けない！`);
                    return 1;
                }
                this.log(`忘却の効果で${pc.playerName}の【${pc.name[i]}】${i + 1}が【空白】${i + 1}に変化した！`);
                pc.skill[i] = "空"; pc.name[i] = "空白"; pc.type[i] = Player.ENCHANT;
                pc.speed[i] = 0; pc.damage[i] = 0; pc.scar[i] = 0; pc.limited[i] = 0;
                return 1;
            }
        }
        return 0;
    }

    private judgeMastery(): number {
        if (this.turn !== 9) return BattleResult.CONTINUE;

        const pc1Mastery = this.hasActiveSkill(this.pc1, "掌");
        const pc2Mastery = this.hasActiveSkill(this.pc2, "掌");
        if (!pc1Mastery && !pc2Mastery) return BattleResult.CONTINUE;

        let result = BattleResult.CONTINUE;
        if (pc1Mastery && pc2Mastery) {
            result = BattleResult.DRAW;
        } else if (pc1Mastery) {
            result = BattleResult.PC1_WIN;
        } else {
            result = BattleResult.PC2_WIN;
        }

        if (result === BattleResult.PC1_WIN) this.log(`${this.pc1.playerName}は全てを掌握した！！`);
        else if (result === BattleResult.PC2_WIN) this.log(`${this.pc2.playerName}は全てを掌握した！！`);
        else this.log("互いの【掌握】により、引き分け！");

        this.log();
        this.log("==========================================");
        return result;
    }

    private hasActiveSkill(pc: Player, skill: string): boolean {
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if (pc.skill[i] === skill && pc.type[i] !== Player.NONE) return true;
        }
        return false;
    }

    /**
     * 勝敗判定
     */
    private judge(prior: number): number {
        const isDead = (pc: Player) => pc.type.every(t => t === Player.NONE);
        const dead1 = isDead(this.pc1);
        const dead2 = isDead(this.pc2);

        if (!dead1 && !dead2) return BattleResult.CONTINUE;

        this.log();
        this.log("【勝敗判定】");
        this.log();
        this.showPlayerStatus(this.pc1);
        this.showPlayerStatus(this.pc2);
        this.log();

        let result = BattleResult.CONTINUE;
        if (dead1 && dead2) {
            if (prior === 1) result = BattleResult.PC1_WIN;
            else if (prior === 2) result = BattleResult.PC2_WIN;
            else result = BattleResult.DRAW;
        } else if (dead1) {
            result = BattleResult.PC2_WIN;
        } else if (dead2) {
            result = BattleResult.PC1_WIN;
        }

        if (result === BattleResult.PC1_WIN) this.log(`${this.pc1.playerName}の勝利！`);
        else if (result === BattleResult.PC2_WIN) this.log(`${this.pc2.playerName}の勝利！`);
        else if (result === BattleResult.DRAW) this.log("引き分け");

        this.log();
        this.log("==========================================");
        return result;
    }
}
