import React from 'react';
import { SkillDetail, getSkillByAbbr } from './skillsData';
import { STAGE_DATA, StageContext, StageProcessor, getAvailableSkillsUntilStage } from './stageData';
import { getStorageUrl } from './firebase';

/**
 * stageCycleに応じたボス画像の表示サイズ設定
 */
interface BossImageStyleConfig {
  pc: React.CSSProperties;
  mobile: React.CSSProperties;
}

const BOSS_BACK_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  1: { pc: { height: '80%', width: '80%' }, mobile: { height: '70%', width: '70%' } },
  2: { pc: { height: '50%', width: '50%' }, mobile: { height: '50%', width: '50%' } },
  3: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  4: { pc: { height: '300%', width: '300%' }, mobile: { height: '300%', width: '300%' } },
  5: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  6: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  7: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  8: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  9: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  10: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  11: { pc: { height: '90%', width: '90%' }, mobile: { height: '90%', width: '90%' } },
  12: { pc: { height: '200%', width: '200%', position: 'absolute', top: '-50%', left: '-50%', transform: 'translate(-50%,-50%);'}, 
   mobile: { height: '170%', width: '200%', position: 'absolute', top: '-50%', left: '-50%', transform: 'translate(-50%,-50%);' } },
  13: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  14: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  15: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  16: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  17: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  18: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  19: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  20: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  21: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  22: { pc: { height: '120%', width: '100%', position: 'absolute', top: '0%', left: '0%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '100%', position: 'absolute', top: '0%', left: '0%', transform: 'translate(-50%,-50%);' } },
  23: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  24: { pc: { height: '160%', width: '100%', position: 'absolute', top: '0%', left: '0%', transform: 'translate(-50%,-50%);' },
   mobile: { height: '120%', width: '100%', position: 'absolute', top: '10%', left: '0%', transform: 'translate(-50%,-50%);' } },
  25: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  26: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  27: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  28: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  29: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  30: { pc: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);' } },
  31: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  32: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  33: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  34: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  35: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  36: { pc: { height: '120%', width: '120%', position: 'absolute', top: '-10%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%' , position: 'absolute', top: '-10%', left: '-10%', transform: 'translate(-50%,-50%);' }},
37: { pc: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%' , position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);' }},
      
};

const BOSS_BATTLE_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  1: { pc: { height: '80%', width: '80%' }, mobile: { height: '70%', width: '70%' } },
  2: { pc: { height: '50%', width: '50%' }, mobile: { height: '50%', width: '50%' } },
  3: { pc: { height: '70%', width: '70%' }, mobile: { height: '80%', width: '80%' } },
  4: { pc: { height: '300%', width: '300%' }, mobile: { height: '300%', width: '300%' } },
  5: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  6: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  7: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  8: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  9: { pc: { height: '60%', width: '60%' }, mobile: { height: '60%', width: '60%' } },
  10: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  11: { pc: { height: '90%', width: '90%' }, mobile: { height: '90%', width: '90%' } },
  12: { pc: { height: '150%', width: '150%' }, mobile: { height: '150%', width: '150%' } },
  13: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  14: { pc: { height: '100%', width: '100%' }, mobile: { height: '90%', width: '90%' } },
  15: { pc: { height: '100%', width: '100%' }, mobile: { height: '90%', width: '90%' } },
  16: { pc: { height: '100%', width: '100%' }, mobile: { height: '90%', width: '90%' } },
  17: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  18: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  19: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  20: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  21: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  22: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  23: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  24: { pc: { height: '160%', width: '100%', position: 'absolute', top: '0%', left: '0%', transform: 'translate(-50%,-50%);' },
   mobile: { height: '120%', width: '100%', position: 'absolute', top: '10%', left: '0%', transform: 'translate(-50%,-50%);' } },
  25: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  26: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  27: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  28: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  29: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  30: { pc: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);' } },
  31: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  32: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  33: { pc: { height: '100%', width: '100%' }, mobile: { height: '80%', width: '80%' } },
  34: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  35: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  36: { pc: { height: '120%', width: '120%', position: 'absolute', top: '-10%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%' , position: 'absolute', top: '-10%', left: '-10%', transform: 'translate(-50%,-50%);' }},
  37: { pc: { height: '120%', width: '120%', position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);'},
   mobile: { height: '120%', width: '120%' , position: 'absolute', top: '0%', left: '-10%', transform: 'translate(-50%,-50%);' }},
};

const BOSS_SIDEBAR_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  1: { pc: { height: '70%', width: '70%' }, mobile: { height: '70%', width: '70%' } },
  2: { pc: { height: '50%', width: '50%' }, mobile: { height: '50%', width: '50%' } },
  3: { pc: { height: '60%', width: '60%' }, mobile: { height: '40%', width: '40%' } },
  4: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  5: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  6: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  7: { pc: { height: '60%', width: '60%' }, mobile: { height: '40%', width: '40%' } },
  8: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  9: { pc: { height: '50%', width: '50%' }, mobile: { height: '40%', width: '40%' } },
  10: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  11: { pc: { height: '60%', width: '60%' }, mobile: { height: '60%', width: '60%' } },
  12: { pc: { height: '100%', width: '100%'}, mobile: { height: '100%', width: '100%'} },
  13: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  14: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  15: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  16: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  17: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  18: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  19: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  20: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  21: { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } },
  22: { pc: { height: '100%', width: '80%' }, mobile: { height: '100%', width: '60%' } },
  23: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  24: { pc: { height: '70%', width: '70%' }, mobile: { height: '100%', width: '100%' } },
  25: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  26: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  27: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  28: { pc: { height: '60%', width: '60%' }, mobile: { height: '60%', width: '60%' } },
  29: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  30: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  31: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  32: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  33: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  34: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
  35: { pc: { height: '80%', width: '80%' }, mobile: { height: '60%', width: '60%' } },
  36: { pc: { height: '90%', width: '90%' }, mobile: { height: '100%', width: '100%' } },
37: { pc: { height: '100%', width: '100%' }, mobile: { height: '100%', width: '100%' } },
};

const KENJU_BACK_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  11: { pc: { height: '90%', width: '90%' }, mobile: { height: '80%', width: '80%' } },
};

const KENJU_BATTLE_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  11: { pc: { height: '90%', width: '90%' }, mobile: { height: '80%', width: '80%' } },
};

const KENJU_SIDEBAR_IMAGE_CONFIGS: Record<number, BossImageStyleConfig> = {
  11: { pc: { height: '70%', width: '70%' }, mobile: { height: '70%', width: '70%' } },
};

function getBossImageStyleCommon(stageCycle: number, isMobile: boolean, type: 'back' | 'battle' | 'sidebar'): React.CSSProperties {
  const configs = type === 'back' ? BOSS_BACK_IMAGE_CONFIGS : (type === 'battle' ? BOSS_BATTLE_IMAGE_CONFIGS : BOSS_SIDEBAR_IMAGE_CONFIGS);
  const config = configs[stageCycle] || { pc: { height: '80%', width: '80%' }, mobile: { height: '80%', width: '80%' } };
  const style = isMobile ? config.mobile : config.pc;
  return {
    maxWidth: 'none',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.9)) drop-shadow(0 0 5px rgba(255,255,255,0.2))',
    flexShrink: 0,
    ...style
  };
}

export class MidStageProcessor implements StageProcessor {
  getBattleCount(): number {
    return 10;
  }
  
  getEnemyName(index: number, context: StageContext): string {
    const namesAtStage = context.midEnemyData[context.stageCycle] || ["コンピュータ"];
    return namesAtStage[index % namesAtStage.length];
  }

  getEnemySkills(index: number, context: StageContext): SkillDetail[] {
    const eName = this.getEnemyName(index, context);
    const allPool = getAvailableSkillsUntilStage(context.stageCycle);
    const kuuhaku = getSkillByAbbr("空")!;
    
    const skillCount = (context.stageCycle === 11 || context.stageCycle === 12) ? 5 : 4;
    const selected: (SkillDetail|null)[] = Array(skillCount).fill(null);

    if (context.stageCycle === 12) {
      const r = Math.random();
      if (r < 0.3) selected[0] = getSkillByAbbr("無")!;
      else if (r < 0.6) selected[0] = getSkillByAbbr("先")!;
      else {
        const counterPool = allPool.filter(s => s.type.includes("迎撃"));
        if (counterPool.length > 0) selected[0] = counterPool[Math.floor(Math.random() * counterPool.length)];
      }
    }
    
    let fixedSkill: SkillDetail | null = null;
    if (context.stageCycle === 10) {
        if (eName === "火の精霊") fixedSkill = getSkillByAbbr("紫")!;
        else if (eName === "水の精霊") fixedSkill = getSkillByAbbr("玉")!;
        else if (eName === "風の精霊") fixedSkill = getSkillByAbbr("＋速")!;
        else if (eName === "地の精霊") fixedSkill = getSkillByAbbr("＋硬")!;
        else if (eName === "闇の精霊") fixedSkill = getSkillByAbbr("影")!;
    }
    
    if (fixedSkill && !fixedSkill.name.startsWith("＋")) {
        selected[skillCount - 1] = fixedSkill;
    }

    const isStage4 = context.stageCycle === 4;
    const attackPool = allPool.filter(s => s.type.includes("攻撃") && !s.name.startsWith("＋") && s.name !== "空白");
    if (!isStage4 && attackPool.length > 0) {
      const attackPos = Math.random() > 0.5 ? skillCount - 2 : (selected[skillCount - 1] ? skillCount - 2 : skillCount - 1);
      if (!selected[attackPos]) selected[attackPos] = attackPool[Math.floor(Math.random() * attackPool.length)];
    }
    
    for (let j = 0; j < skillCount; j++) {
        if (selected[j] !== null) continue;
        const prev = j > 0 ? selected[j - 1] : null;
        const weightedPool: SkillDetail[] = [];
        allPool.forEach(s => {
            if (s.name === "空白") return;
            if (isStage4 && s.type.includes("攻撃") && !s.name.startsWith("＋")) return;
            if (s.name === "無想" && selected.some(sel => sel?.name === "無想")) return;

            let weight = 1;
            if (s.name.startsWith("＋") && prev) {
                const canConnect = (s.name === "＋硬" || s.name === "＋速") ? (prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃")) : prev.type.includes("攻撃");
                if (canConnect) weight = 10; else weight = 0;
            } else if (s.name.startsWith("＋")) weight = 0;
            for (let k = 0; k < weight; k++) weightedPool.push(s);
        });
        selected[j] = weightedPool.length > 0 ? weightedPool[Math.floor(Math.random() * weightedPool.length)] : kuuhaku;
    }
    
    if (fixedSkill && fixedSkill.name.startsWith("＋")) {
        let placed = false;
        for (let k = 0; k < skillCount - 1; k++) {
            if (selected[k] && (selected[k]!.type.includes("攻撃") || selected[k]!.type.includes("迎撃"))) {
                selected[k+1] = fixedSkill;
                placed = true;
                break;
            }
        }
        if (!placed) selected[skillCount - 1] = fixedSkill;
    }

    if (context.stageCycle === 1) {
      selected[Math.floor(Math.random() * skillCount)] = kuuhaku;
    }

    const nonPlusSkills = selected.filter(s => s && !s.name.startsWith("＋"));
    const plusSkills = selected.filter(s => s && s.name.startsWith("＋"));

    nonPlusSkills.sort((a, b) => {
      const typeA = a!.type;
      const typeB = b!.type;
      if (typeA.includes("迎撃") && !typeB.includes("迎撃")) return -1;
      if (!typeA.includes("迎撃") && typeB.includes("迎撃")) return 1;
      if (typeA.includes("攻撃") && !typeB.includes("攻撃")) return 1;
      if (!typeA.includes("攻撃") && typeB.includes("攻撃")) return -1;
      return 0;
    });

    const result: SkillDetail[] = [];
    const usedPlus = new Set<number>();

    nonPlusSkills.forEach(s => {
      result.push(s!);
      for (let i = 0; i < plusSkills.length; i++) {
        if (usedPlus.has(i)) continue;
        const p = plusSkills[i]!;
        const canConnect = (p.name === "＋硬" || p.name === "＋速") 
          ? (s!.type.includes("攻撃") || s!.type.includes("補助") || s!.type.includes("迎撃")) 
          : s!.type.includes("攻撃");
        
        if (canConnect) {
          result.push(p);
          usedPlus.add(i);
          break;
        }
      }
    });

    plusSkills.forEach((p, i) => {
      if (!usedPlus.has(i)) result.push(p!);
    });

    while (result.length > skillCount) result.pop();
    while (result.length < skillCount) result.push(kuuhaku);
    
    return result;
  }

  onVictory(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: true, showReward: true };
  }

  onFailure(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: false, showReward: true };
  }

  getStageTitle(context: StageContext): string {
    const info = STAGE_DATA.find(s => s.no === context.stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
    if (!info) return "Loading...";
    return `${info.no}. ${info.name}`;
  }

  getStageDescription(context: StageContext): string {
    return '10戦全勝してボスに挑め！';
  }

  getBackgroundImage(context: StageContext): string {
    const info = STAGE_DATA.find(s => s.no === context.stageCycle);
    if (info?.backgroundImage) {
      return getStorageUrl(info.backgroundImage);
    }
    return getStorageUrl(`/images/background/${context.stageCycle}.jpg`);
  }

  getBossImage(context: StageContext): string | undefined {
    return undefined;
  }

  getBossDescription(context: StageContext): string {
    return "";
  }

  getBossImageStyle(context: StageContext, isMobile: boolean, type: 'back' | 'battle' | 'sidebar'): React.CSSProperties {
    console.log(context);
    const subStage = context.chapter2SubStage ? context.chapter2SubStage - 1 : 0;
    const idx = context.chapter === 1 ? context.stageCycle : (13 + (context.stageCycle - 13) * 2 + subStage);
    return getBossImageStyleCommon(idx, isMobile, type);
  }
}

export class Stage11MidStageProcessor extends MidStageProcessor {
  getBattleCount(): number {
    return 100;
  }
  onVictory(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: false, showReward: true };
  }
  getStageDescription(context: StageContext): string {
    return '100人の敵を倒せ！(勝率80%で突破)';
  }
  shouldShowWinRate(context: StageContext): boolean {
    return true;
  }
  getWinThreshold(context: StageContext): number {
    return 80;
  }
}

export class BossStageProcessor implements StageProcessor {
  getBattleCount(): number {
    return 1;
  }

  private getStageInfo(context: StageContext) {
    // 第2章の判定: chapter2SubStage があり、stageCycle が第2章の範囲（13以上）
    if (context.chapter2SubStage !== undefined && context.stageCycle >= 13) {
      const chapterStage = context.stageCycle - 12;
      const info = STAGE_DATA.find(s => s.chapter === 2 && s.stage === chapterStage && s.battle === context.chapter2SubStage);
      if (info) return info;
    }
    return STAGE_DATA.find(s => s.no === context.stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
  }

  getEnemyName(index: number, context: StageContext): string {
    const info = this.getStageInfo(context);
    return info?.bossName || "BOSS";
  }

  getEnemySkills(index: number, context: StageContext): SkillDetail[] {
    const info = this.getStageInfo(context);
    if (!info) return [];

    if (context.stageCycle === 10) {
      const gekirin = getSkillByAbbr("逆")!;
      const playerSkills = context.selectedPlayerSkills.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
      return [gekirin, gekirin, gekirin, ...playerSkills];
    }
    return info.bossSkillAbbrs.split("").map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
  }

  onVictory(context: StageContext): { canGoToNext: boolean; showReward: boolean; pendingClear: boolean } {
    return { canGoToNext: true, showReward: true, pendingClear: true };
  }

  onFailure(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: false, showReward: true };
  }

  getStageTitle(context: StageContext): string {
    const info = this.getStageInfo(context);
    return info ? `VS ${info.bossName}` : "VS BOSS";
  }

  getStageDescription(context: StageContext): string {
    return '敵の構成を見て対策を練れ！';
  }

  getBackgroundImage(context: StageContext): string {
    const info = this.getStageInfo(context);
    if (info?.backgroundImage) {
      return getStorageUrl(info.backgroundImage);
    }
    return getStorageUrl(`/images/background/${context.stageCycle}.jpg`);
  }

  getBossImage(context: StageContext): string | undefined {
    const info = this.getStageInfo(context);
    return info ? getStorageUrl(info.bossImage) : undefined;
  }

  getBossDescription(context: StageContext): string {
    const info = this.getStageInfo(context);
    return info?.bossDescription || "";
  }

  getBossImageStyle(context: StageContext, isMobile: boolean, type: 'back' | 'battle' | 'sidebar'): React.CSSProperties {
    const subStage = context.chapter2SubStage ? context.chapter2SubStage - 1 : 0;
    const idx = context.chapter === 1 ? context.stageCycle : (13 + (context.stageCycle - 13) * 2 + subStage);
    return getBossImageStyleCommon(idx, isMobile, type);
  }

  getEnemyTitle(context: StageContext): string {
    const info = this.getStageInfo(context);
    if (info?.bossSkillTitle) return info.bossSkillTitle;
    return 'BOSS SKILLS DISCLOSED';
  }
}

export class KenjuStageProcessor implements StageProcessor {
  getBattleCount(): number {
    return 1;
  }

  getEnemyName(index: number, context: StageContext): string {
    return context.kenjuBoss?.name || "剣獣";
  }

  getEnemySkills(index: number, context: StageContext): SkillDetail[] {
    return context.kenjuBoss?.skills || [];
  }

  onVictory(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: true, showReward: false };
  }

  onFailure(context: StageContext): { canGoToNext: boolean; showReward: boolean } {
    return { canGoToNext: false, showReward: false };
  }

  getStageTitle(context: StageContext): string {
    if (context.kenjuBoss?.name && context.kenjuBoss.isCustom) {
        return `VS ${context.kenjuBoss.name}`;
    }
    return `VS ${context.kenjuBoss?.name || "剣獣"}`;
  }

  getBackgroundImage(context: StageContext): string {
    let path = "/images/background/11.jpg";
    if (context.kenjuBoss?.background && (context.kenjuBoss.name.includes("電影") || (context.kenjuBoss as any).isCustom)) {
      path = context.kenjuBoss.background;
    } else if (context.kenjuBoss?.background) {
      
    }
    return getStorageUrl(path);
  }

  getBossImage(context: StageContext): string | undefined {
    if (!context.kenjuBoss?.image) return undefined;
    return context.kenjuBoss.image.startsWith('/') ? getStorageUrl(context.kenjuBoss.image) : context.kenjuBoss.image;
  }

  getBossDescription(context: StageContext): string {
    return context.kenjuBoss?.description || "今日の強敵です。";
  }

  getBossImageStyle(context: StageContext, isMobile: boolean, type: 'back' | 'battle' | 'sidebar'): React.CSSProperties {
    const configs = type === 'back' ? KENJU_BACK_IMAGE_CONFIGS : (type === 'battle' ? KENJU_BATTLE_IMAGE_CONFIGS : KENJU_SIDEBAR_IMAGE_CONFIGS);
    // 全ての剣獣（管理者用、日替わり、電影）で11番（剣獣用）の設定を適用
    const config = configs[11] || { pc: { height: '90%', width: '90%' }, mobile: { height: '90%', width: '90%' } };
    const style = isMobile ? config.mobile : config.pc;
    return {
      maxWidth: 'none',
      objectFit: 'contain',
      filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.9)) drop-shadow(0 0 5px rgba(255,255,255,0.2))',
      flexShrink: 0,
      ...style
    };
  }

  getEnemyTitle(context: StageContext): string {
    if (context.kenjuBoss?.title) return context.kenjuBoss.title;
    return 'BOSS SKILLS DISCLOSED';
  }

  getStageDescription(context: StageContext): string {
    if (context.kenjuBoss?.name && (context.kenjuBoss.name.includes("電影") || (context.kenjuBoss as any).isCustom)) {
      const bossUserName = context.kenjuBoss.userName || "未知のプレイヤー";
      return `${bossUserName}さんの電影と対峙！`;
    }
    return '日替わりの強敵に勝利せよ！';
  }
}
