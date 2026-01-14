
const fs = require('fs');

const NONE = 0; const ATTACK = 1; const BUFF = 2; const COUNTER = 3; const ENCHANT = 4;
const skillTypes = { "一": 1, "刺": 1, "果": 1, "剣": 1, "紫": 1, "呪": 1, "雷": 1, "隠": 1, "怒": 1, "弱": 1, "覚": 2, "防": 2, "封": 2, "影": 2, "交": 3, "搦": 3, "待": 3, "玉": 3, "崩": 3, "疫": 3, "強": 4, "硬": 4, "速": 4, "反": 4, "盾": 4, "錬": 4, "逆": 4, "無": 4, "裏": 4, "先": 4, "連": 4, "燐": 4, "空": 4, "＿": 0 };
const skillSpeeds = { "一": "LV", "刺": "1", "果": "1", "剣": "LV-1", "紫": "LV+2", "呪": "1", "雷": "LV", "隠": "LV", "怒": "LV-2（最低0）", "弱": "0", "覚": "LV", "防": "LV", "封": "LV", "影": "LV", "交": "LV-1", "搦": "LV", "待": "1", "玉": "LV-1", "崩": "LV", "疫": "LV", "強": "なし", "硬": "なし", "速": "なし", "反": "なし", "盾": "なし", "錬": "なし", "逆": "なし", "無": "なし", "裏": "なし", "先": "なし", "連": "なし", "燐": "なし", "空": "なし" };

class Player {
    constructor(skillsRaw, name, initialGekirin = 0) {
        this.playerName = name; this.skillsRaw = skillsRaw; this.skill = skillsRaw.split('');
        this.type = this.skill.map(s => skillTypes[s] || 0); this.name = this.skill.map(s => skillNames[s] || "？");
        this.scar = new Array(this.skill.length).fill(0);
        this.gekirin = initialGekirin; this.stan = 0; this.roubai = 0; this.suijaku = 0; this.kakugo = 0;
        this.bouheki = 0; this.bouheki_ = 0; this.musou = 0; this.sensei = 0; this.tate = 0;
        this.limited = this.skill.map(s => ["雷", "覚", "防", "封", "盾", "錬", "無", "連"].includes(s) ? 1 : 0);
        this.kage = new Array(this.skill.length).fill(0);
    }
    getSkillsLength() { return this.skill.length; }
    getSpeed(i, turn) {
        let spd = skillSpeeds[this.skill[i]]; let base = 0;
        if (spd === "LV") base = i + 1; else if (spd === "LV-1") base = Math.max(0, i);
        else if (spd === "LV+2") base = i + 3; else if (spd === "LV-2（最低0）") base = Math.max(0, i - 1);
        else base = parseInt(spd) || 0;
        if (i < this.getSkillsLength() - 1 && this.skill[i+1] === "速") base += 1;
        if (this.kakugo === 1) base += 2; return this.roubai === 1 ? 0 : base;
    }
    getDamage(i, turn) {
        let s = this.skill[i]; let dmg = 0;
        if (s === "一" || s === "刺" || s === "紫" || s === "呪" || s === "弱" || s === "交") dmg = 1;
        else if (s === "果") dmg = i + 1; else if (s === "雷" || s === "隠" || s === "待") dmg = 2;
        else if (s === "剣") dmg = this.skill.filter((ss, idx) => this.type[idx] === ATTACK && !(idx < this.getSkillsLength() - 1 && this.skill[idx+1] === "反")).length;
        else if (s === "怒") dmg = turn;
        if (i < this.getSkillsLength() - 1 && this.skill[i+1] === "強") dmg += 1;
        if (this.kakugo === 1) dmg += 1; return dmg + this.gekirin;
    }
}

const skillNames = { "一": "一閃", "刺": "刺突", "果": "果断", "剣": "剣舞", "紫": "紫電", "呪": "呪詛", "雷": "雷火", "隠": "隠刃", "怒": "怒濤", "弱": "弱撃", "覚": "覚悟", "防": "防壁", "封": "封印", "影": "影討", "交": "交錯", "搦": "搦手", "待": "待伏", "玉": "玉響", "崩": "崩技", "疫": "疫病", "強": "＋強", "硬": "＋硬", "速": "＋速", "反": "＋反", "盾": "＋盾", "錬": "＋錬", "逆": "逆鱗", "無": "無想", "裏": "裏霞", "先": "先制", "連": "連撃", "燐": "燐光", "空": "空白", "＿": "　　" };

class BattleSimulator {
    constructor(p1, p2) { this.pc1 = p1; this.pc2 = p2; this.turn = 1; }
    start() {
        for (this.turn = 1; this.turn <= 20; this.turn++) {
            this.processStartPhase(this.pc1); this.processStartPhase(this.pc2);
            let sp1 = this.determineFirstActionSpeed(this.pc1); let sp2 = this.determineFirstActionSpeed(this.pc2);
            if (sp1 >= sp2) { if (this.unitTurn(this.pc1, this.pc2)) return 1; if (this.unitTurn(this.pc2, this.pc1)) return 2; }
            else { if (this.unitTurn(this.pc2, this.pc1)) return 2; if (this.unitTurn(this.pc1, this.pc2)) return 1; }
            if (this.pc1.skill.includes("連")) if (this.unitTurn(this.pc1, this.pc2)) return 1;
            if (this.pc2.skill.includes("連")) if (this.unitTurn(this.pc2, this.pc1)) return 2;
            this.processEndPhase(this.pc1); this.processEndPhase(this.pc2);
            if (this.pc2.skill.every((s, i) => this.pc2.type[i] === NONE)) return 1;
            if (this.pc1.skill.every((s, i) => this.pc1.type[i] === NONE)) return 2;
        } return 3;
    }
    determineFirstActionSpeed(pc) {
        if (pc.stan === 1) return -999; if (pc.sensei === 1) return 999;
        for (let i = 0; i < pc.getSkillsLength(); i++) {
            if ((pc.type[i] === ATTACK || pc.type[i] === BUFF) && pc.scar[i] === 0) {
                if (pc.skill[i] === "隠" && this.turn % 2 !== 0) continue; return pc.getSpeed(i, this.turn);
            }
        } return 0;
    }
    unitTurn(attacker, defender) {
        if (attacker.skill.includes("燐")) { attacker.stan = 0; attacker.suijaku = 0; attacker.roubai = 0; attacker.kakugo = 0; attacker.bouheki = 0; attacker.gekirin = 0; attacker.musou = 0; attacker.sensei = 0; }
        let useIdx = -1; let uragasumi = attacker.skill.includes("裏");
        if (!uragasumi) { for (let i = 0; i < attacker.getSkillsLength(); i++) { if ((attacker.type[i] === ATTACK || attacker.type[i] === BUFF) && attacker.scar[i] === 0) { if (attacker.skill[i] === "隠" && this.turn % 2 !== 0) continue; useIdx = i; break; } } }
        else { for (let i = attacker.getSkillsLength() - 1; i >= 0; i--) { if ((attacker.type[i] === ATTACK || attacker.type[i] === BUFF) && attacker.scar[i] === 0) { if (attacker.skill[i] === "隠" && this.turn % 2 !== 0) continue; useIdx = i; break; } } }
        if (useIdx === -1) { this.applyDamage(attacker, defender, 1, 0, -1, true); }
        else {
            if (attacker.limited[useIdx] === 1) attacker.limited[useIdx] = 2;
            if (attacker.type[useIdx] === ATTACK) {
                this.applyDamage(attacker, defender, attacker.getDamage(useIdx, this.turn), attacker.getSpeed(useIdx, this.turn), useIdx, false);
                if (attacker.gekirin > 0) attacker.gekirin = 0;
            }
            if (attacker.skill[useIdx] === "覚") attacker.kakugo = 2; if (attacker.skill[useIdx] === "防") attacker.bouheki_ = 2;
            if (attacker.skill[useIdx] === "封") { defender.stan = 2; defender.roubai = 2; defender.suijaku = 2; }
            if (useIdx < attacker.getSkillsLength() - 1 && attacker.skill[useIdx+1] === "盾") { attacker.tate = 2; attacker.limited[useIdx+1] = 2; }
        }
        this.resolveEffects(attacker, defender); this.breakup(attacker); this.breakup(defender);
        return (defender.skill.every((s, i) => defender.type[i] === NONE));
    }
    applyDamage(attacker, defender, dmg, spd, useIdx, isBonda) {
        for (let d = 0; d < dmg; d++) {
            if (defender.musou === 1 || defender.bouheki > 0) { if (defender.bouheki > 0) { const rm = Math.ceil(defender.bouheki / 2); defender.bouheki -= rm; } break; }
            let tIdx = -1;
            if (useIdx !== -1 && attacker.skill[useIdx] === "刺") {
                let b = 999; for (let j = 0; j < defender.getSkillsLength(); j++) { if (defender.type[j] !== NONE && defender.scar[j] !== 1) { let d = Math.abs((useIdx+1)-(j+1)); if (d < b) { b = d; tIdx = j; } else if (d === b && j > tIdx) { tIdx = j; } } }
            } else { for (let j = 0; j < defender.getSkillsLength(); j++) { if (defender.type[j] !== NONE && defender.scar[j] !== 1) { tIdx = j; break; } } }
            if (tIdx !== -1) {
                defender.scar[tIdx] = 1;
                if (defender.type[tIdx] === COUNTER || (defender.type[tIdx] === ATTACK && tIdx < defender.getSkillsLength()-1 && defender.skill[tIdx+1] === "反")) {
                    if (!(useIdx !== -1 && useIdx < attacker.getSkillsLength()-1 && attacker.skill[useIdx+1] === "錬")) {
                        let c = defender.getSpeed(tIdx, this.turn); if (c >= spd || isBonda) { if (defender.limited[tIdx] === 1) defender.limited[tIdx] = 2; if (defender.skill[tIdx] === "交") { if (!isBonda) attacker.scar[useIdx] = 1; } else if (defender.skill[tIdx] === "玉") this.applyDamage(defender, attacker, spd, c, tIdx, false); else this.applyDamage(defender, attacker, defender.getDamage(tIdx, this.turn), c, tIdx, false); break; }
                    }
                }
            }
        }
    }
    resolveEffects(p1, p2) { [p1, p2].forEach(p => { if (p.kakugo === 2) p.kakugo = 1; if (p.bouheki_ === 2) { p.bouheki += 3; p.bouheki_ = 0; } if (p.tate === 2) { p.bouheki += 2; p.tate = 0; } if (p.stan === 2) p.stan = 1; if (p.roubai === 2) p.roubai = 1; if (p.suijaku === 2) p.suijaku = 1; }); }
    breakup(pc) { for (let i = 0; i < pc.getSkillsLength(); i++) { if (pc.scar[i] === 1) { if (i < pc.getSkillsLength() - 1 && pc.skill[i+1] === "硬") { pc.skill[i+1] = "＿"; pc.type[i+1] = NONE; pc.scar[i] = 0; } else { if (pc.skill[i] === "逆") pc.gekirin++; pc.skill[i] = "＿"; pc.type[i] = NONE; } } } }
    processStartPhase(pc) { if (this.turn <= pc.getSkillsLength()) { if (pc.skill[this.turn-1] === "無") pc.musou = 1; if (pc.skill[this.turn-1] === "先") pc.sensei = 1; } }
    processEndPhase(pc) { pc.musou = 0; pc.sensei = 0; for (let i = 0; i < pc.getSkillsLength(); i++) { if (pc.limited[i] === 2) { pc.limited[i] = 1; pc.scar[i] = 1; } } if (pc.suijaku === 1) { for (let i = 0; i < pc.getSkillsLength(); i++) { if (pc.type[i] !== NONE && pc.skill[i] !== "空") { pc.skill[i] = "空"; pc.type[i] = ENCHANT; break; } } } this.breakup(pc); }
}

const pool = "一刺果剣紫呪雷隠怒弱覚防封影交搦待玉崩疫強硬速反盾錬逆無裏先連燐空";
function getAllSetups(pool, count = 5) {
    const availablePool = pool.split(''); let results = new Set();
    function generate(current) {
        if (results.size >= 1000) return;
        if (current.length === count) { results.add(current.join('')); return; }
        const i = current.length;
        let options = availablePool.filter(s => {
            if (i === 0) return !["強", "硬", "速", "反", "盾", "錬"].includes(s);
            const prevType = skillTypes[current[i-1]];
            if (["強", "反", "錬"].includes(s)) return prevType === 1;
            if (["硬", "速"].includes(s)) return [1, 2, 3].includes(prevType);
            if (s === "盾") return [1, 2].includes(prevType);
            return true;
        });
        options.sort(() => Math.random() - 0.5);
        for (const opt of options) { generate([...current, opt]); if (results.size >= 1000) return; }
    }
    generate([]); return Array.from(results);
}

// 逆鱗3ボス vs 1000種類のランダムプレイヤー構成
const playerSetups = getAllSetups(pool);
let wins = 0;
playerSetups.forEach(setup => {
    const p1 = new Player(setup, "P");
    const p2 = new Player(setup, "Boss", 3);
    if (new BattleSimulator(p1, p2).start() === 1) wins++;
});
console.log(`Global Win Rate against Gekirin-3 Boss: ${(wins / playerSetups.length * 100).toFixed(2)}%`);
