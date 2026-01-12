import { Player } from './Player';
import { Battle } from './Battle';

export class Game {
    player1: Player;
    player2: Player;
    battle: Battle;
    gameLog: string = "";
    winner: number = 0; // 追加

    constructor(playerSkills: string, computerSkills: string) {
        this.player1 = new Player(playerSkills + "／プレイヤー");
        this.player2 = new Player(computerSkills + "／コンピュータ");

        // シャッフル機能の追加
        this.player1.shuffleSkills();
        this.player2.shuffleSkills();

        this.battle = new Battle(this.player1.skillsRaw + "／" + this.player1.playerName, this.player2.skillsRaw + "／" + this.player2.playerName);
    }

    startGame(): number { // 戻り値をstringからnumberに変更
        const result = this.battle.start();
        this.gameLog = this.battle.text; // Battleクラスからのログを取得
        this.winner = result; // 勝者を保存
        
        if (result === 1) {
            this.gameLog += "プレイヤーの勝利！";
        } else if (result === 2) {
            this.gameLog += "コンピュータの勝利！";
        } else if (result === 3) {
            this.gameLog += "引き分け！";
        } else {
            this.gameLog += "ゲームが終了しませんでした。"; // 0 の場合
        }
        return this.winner; // gameLogからwinnerに変更
    }

    // AIのスキル選択ロジック（改善版）
    chooseAISkill(): number {
        const availableAttackSkills = [];
        const availableOtherSkills = [];

        for (let i = 0; i < this.player2.getSkillsCount(); i++) {
            if (this.player2.type[i] !== Player.NONE && this.player2.scar[i] === 0) {
                if (this.player2.type[i] === Player.ATTACK) {
                    availableAttackSkills.push(i);
                } else {
                    availableOtherSkills.push(i);
                }
            }
        }

        if (availableAttackSkills.length > 0) {
            // 攻撃スキルがあれば、ランダムに選択
            const randomIndex = Math.floor(Math.random() * availableAttackSkills.length);
            return availableAttackSkills[randomIndex];
        } else if (availableOtherSkills.length > 0) {
            // 攻撃スキルがなければ、他の利用可能なスキルをランダムに選択
            const randomIndex = Math.floor(Math.random() * availableOtherSkills.length);
            return availableOtherSkills[randomIndex];
        } else {
            return -1; // 利用可能なスキルがない場合
        }
    }
}
