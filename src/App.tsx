import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ref, onValue, push, onDisconnect, set, serverTimestamp, query, limitToLast, get } from "firebase/database";
import { database, auth, googleProvider, recordAccess, getStorageUrl } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, deleteUser } from "firebase/auth";
import { Game } from './Game';
import { ALL_SKILLS, getSkillByAbbr, SkillDetail, STATUS_DATA } from './skillsData';
import { STAGE_DATA, getAvailableSkillsUntilStage, getSkillByName, KENJU_DATA, StageProcessor } from './stageData';
import { Lounge } from './Lounge';
import type { UserProfile } from './Lounge';
import { Rule } from './Rule';
import { MidStageProcessor, BossStageProcessor, KenjuStageProcessor, Stage11MidStageProcessor } from './stageProcessors';
import Lifuku from './Lifuku';
import './App.css';

// 2026/1/31 Ver 1.0リリース　やったー

interface AnimatedRichLogProps {
  log: string;
  onComplete: () => void;
  immediate?: boolean;
  bossImage?: string;
  bossName?: string;
  battleInstance?: any;
  battleStageCycle?: number;
  processor: StageProcessor;
  stageMode: StageMode;
  stageContext: any;
  getStorageUrl: (path: string) => string;
}

const AnimatedRichLog: React.FC<AnimatedRichLogProps> = React.memo(({ log, onComplete, immediate, bossImage, bossName, battleInstance, battleStageCycle, processor, stageMode, stageContext, getStorageUrl }) => {
    const rounds = React.useMemo(() => log.split(/(?=【第\d+ラウンド】|【勝敗判定】)/).filter(r => r.trim() !== ''), [log]);
    const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
    const [roundVisibleCounts, setRoundVisibleCounts] = useState<number[]>(new Array(rounds.length).fill(0));
    const [roundFinished, setRoundFinished] = useState<boolean[]>(new Array(rounds.length).fill(false));
    const [bossAnim, setBossAnim] = useState<'idle' | 'attack' | 'damage' | 'counter' | 'defeat'>('idle');
    const [currentPc1Scar, setCurrentPc1Scar] = useState<number[]>(battleInstance?.pc1?.scar || []);
    const [currentPc2Scar, setCurrentPc2Scar] = useState<number[]>(battleInstance?.pc2?.scar || []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentRoundLines = React.useMemo(() => rounds[currentRoundIdx]?.split('\n').filter(line => !line.includes('====') && line.trim() !== '') || [], [rounds, currentRoundIdx]);
    useEffect(() => {
        if (!roundFinished[currentRoundIdx]) {
            const currentLineIdx = roundVisibleCounts[currentRoundIdx];
            if (currentLineIdx < currentRoundLines.length) {
                const line = currentRoundLines[currentLineIdx];
                if (line.includes('破壊された')) {
                    if (line.includes('あなたの')) {
                      const m = line.match(/あなたの【.*?】(\d+)が破壊された/);
                      if (m) setCurrentPc1Scar(prev => { const next = [...prev]; next[parseInt(m[1], 10) - 1] = 1; return next; });
                    } else if (bossName && line.includes(`${bossName}の`)) {
                      // 特殊文字をエスケープして正規表現を作成
                      const escapedBossName = bossName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const m = line.match(new RegExp(`${escapedBossName}の【.*?】(\\d+)が破壊された`));
                      if (m) setCurrentPc2Scar(prev => { const next = [...prev]; next[parseInt(m[1], 10) - 1] = 1; return next; });
                    }
                }
                if (line.includes('リミテッド') && line.includes('破壊された')) {
                    if (line.includes('あなたの')) {
                        const m = line.match(/あなたの【.*?】(\d+)が破壊された/);
                        if (m) setCurrentPc1Scar(prev => { const next = [...prev]; next[parseInt(m[1], 10) - 1] = 1; return next; });
                    } else if (bossName && line.includes(`${bossName}の`)) {
                        const escapedBossName = bossName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const m = line.match(new RegExp(`${escapedBossName}の【.*?】(\\d+)が破壊された`));
                        if (m) setCurrentPc2Scar(prev => { const next = [...prev]; next[parseInt(m[1], 10) - 1] = 1; return next; });
                    }
                }
                if (bossName) {
                    if (line.includes(`${bossName}の勝利`) || line.includes(`${bossName}が破壊された`)) setBossAnim('defeat');
                    else if (line.includes(`${bossName}の【`) && line.includes('が発動')) { setBossAnim('counter'); setTimeout(() => setBossAnim('idle'), 800); }
                    else if (line.includes(`${bossName}の攻撃フェイズ`)) { setBossAnim('attack'); setTimeout(() => setBossAnim('idle'), 800); }
                    else if (line.includes(`${bossName}に`) && line.includes('のダメージ')) { setBossAnim('damage'); setTimeout(() => setBossAnim('idle'), 800); }
                }
            }
        }
    }, [roundVisibleCounts, currentRoundIdx, bossName, currentRoundLines, roundFinished]);
    useEffect(() => {
      if (immediate) { setRoundVisibleCounts(new Array(rounds.length).fill(100)); setRoundFinished(new Array(rounds.length).fill(true)); setCurrentRoundIdx(rounds.length - 1); onComplete(); return; }
      if (rounds[currentRoundIdx]?.includes('勝敗判定')) {
          const nc = [...roundVisibleCounts];
          if (nc[currentRoundIdx] !== currentRoundLines.length) {
            nc[currentRoundIdx] = currentRoundLines.length;
            setRoundVisibleCounts(nc);
          }
          if (!roundFinished[currentRoundIdx]) {
            const nf = [...roundFinished];
            nf[currentRoundIdx] = true;
            setRoundFinished(nf);
          }
          onComplete();
          return;
      }
      if (!roundFinished[currentRoundIdx]) {
        if (roundVisibleCounts[currentRoundIdx] < currentRoundLines.length) {
          const timer = setTimeout(() => { const nc = [...roundVisibleCounts]; nc[currentRoundIdx]++; setRoundVisibleCounts(nc); }, 400);
          return () => clearTimeout(timer);
        } else {
          const nf = [...roundFinished]; nf[currentRoundIdx] = true; setRoundFinished(nf);
          if (currentRoundIdx === rounds.length - 1) onComplete();
        }
      }
    }, [currentRoundIdx, roundVisibleCounts, roundFinished, currentRoundLines, immediate, rounds, onComplete]);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [roundVisibleCounts]);
    const goNext = () => {
      if (!roundFinished[currentRoundIdx]) {
        const fullLines = currentRoundLines;
        let newPc1Scar = [...currentPc1Scar], newPc2Scar = [...currentPc2Scar];
        fullLines.forEach(line => {
            if (line.includes('破壊された')) {
                if (line.includes('あなたの')) { const m = line.match(/あなたの【.*?】(\d+)が破壊された/); if (m) newPc1Scar[parseInt(m[1], 10) - 1] = 1; }
                else if (bossName && line.includes(`${bossName}の`)) {
                    const escapedBossName = bossName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const m = line.match(new RegExp(`${escapedBossName}の【.*?】(\\d+)が破壊された`));
                    if (m) newPc2Scar[parseInt(m[1], 10) - 1] = 1;
                }
            }
            if (line.includes('リミテッド') && line.includes('破壊された')) {
                if (line.includes('あなたの')) { const m = line.match(/あなたの【.*?】(\d+)が破壊された/); if (m) newPc1Scar[parseInt(m[1], 10) - 1] = 1; }
                else if (bossName && line.includes(`${bossName}の`)) {
                    const escapedBossName = bossName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const m = line.match(new RegExp(`${escapedBossName}の【.*?】(\\d+)が破壊された`));
                    if (m) newPc2Scar[parseInt(m[1], 10) - 1] = 1;
                }
            }
        });
        setCurrentPc1Scar(newPc1Scar); setCurrentPc2Scar(newPc2Scar);
        const nc = [...roundVisibleCounts]; nc[currentRoundIdx] = currentRoundLines.length; setRoundVisibleCounts(nc);
        const nf = [...roundFinished]; nf[currentRoundIdx] = true; setRoundFinished(nf);
        if (currentRoundIdx === rounds.length - 1) {
          onComplete();
        }
      } else if (currentRoundIdx < rounds.length - 1) {
        setCurrentRoundIdx(prev => prev + 1);
      } else {
        // すでに最終ラウンドが終了している場合でも確実に onComplete を呼ぶ
        onComplete();
      }
    };
    const goBack = () => { if (currentRoundIdx > 0) setCurrentRoundIdx(prev => prev - 1); };
    
    // PC1 (プレイヤー) と PC2 (ボス) のゲージを個別に管理
    const renderGauge = (player: any, scars: number[], color: string) => {
      if (!player) return null;
      const totalSkills = player.getSkillsLength();
      const brokenSkills = scars.filter((s: number) => s === 1).length;
      const percentage = Math.max(0, ((totalSkills - brokenSkills) / totalSkills) * 100);
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.8))', width: '80px' }}>
          <div style={{ fontSize: player.playerName.length >= 9 ? '8px' : '10px', fontWeight: 'bold', marginBottom: '6px', color: '#fff', textShadow: '0 0 4px #000, 1px 1px 2px #000', textAlign: 'center', width: '100%', wordBreak: 'break-all', height: '2.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            {player.playerName}
          </div>
          <div style={{ height: '140px', width: '16px', backgroundColor: 'rgba(20,20,20,0.8)', border: '2px solid #fff', borderRadius: '4px', boxSizing: 'border-box', boxShadow: '0 0 10px rgba(0,0,0,0.5), inset 0 0 5px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${percentage}%`,
              background: `linear-gradient(to top, ${color}, ${color}dd)`,
              transition: 'height 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: `0 0 15px ${color}`
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${percentage}%`,
              backgroundColor: '#fff', opacity: 0.3, filter: 'blur(2px)', mixBlendMode: 'overlay'
            }} />
          </div>
        </div>
      );
    };

    const isMobile = window.innerWidth < 768;

    return (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#000', border: '4px double #fff', borderRadius: '4px', overflow: 'hidden' }}>
        {bossImage && (
          <div className="boss-stage-area sticky-boss-area" style={{
            height: isMobile ? '200px' : '240px' , minHeight: isMobile ? '200px' : '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            backgroundImage: `url(${(stageMode === 'KENJU' || stageMode === 'DENEI' ? getStorageUrl(stageContext.kenjuBoss?.background || '') : (processor.getBackgroundImage(stageContext)) || '')})`,
            paddingTop: '10px', position: 'relative', overflow: 'hidden', flexShrink: 0
          }}>
            {/* 背景を暗くするオーバーレイ */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', zIndex: 2 }} />
            
            <div style={{ zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
              <div style={{ zIndex: 10, position: 'relative' }}>
                {battleInstance && renderGauge(battleInstance.pc2, currentPc2Scar, '#ff5252')}
              </div>
              
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: (battleStageCycle === 8 || battleStageCycle === 12) ? 'flex-start' : 'flex-end', zIndex: 5, overflow: battleStageCycle === 4 ? 'visible' : 'hidden' }}>
                <img
                  src={bossImage}
                  alt={bossName}
                  className={`boss-battle-image boss-anim-${bossAnim}`}
                  style={{
                      ...processor.getBossImageStyle({ ...stageContext, stageCycle: battleStageCycle }, isMobile, 'battle')
                  }}
                />
              </div>
              
              <div style={{ zIndex: 10, position: 'relative' }}>
                {battleInstance && renderGauge(battleInstance.pc1, currentPc1Scar, '#2196f3')}
              </div>
            </div>
            <style>{`
              @keyframes slideUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @-webkit-keyframes slideUp {
                from { opacity: 0; -webkit-transform: translateY(10px); }
                to { opacity: 1; -webkit-transform: translateY(0); }
              }
              .rich-log-modern div {
                will-change: transform, opacity;
              }
            `}</style>
          </div>
        )}
        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,50,0.9)', borderTop: '2px solid #fff', padding: '10px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? '400px' : 'auto', height: isMobile ? '400px' : 0, boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0 }}>
            <button disabled={currentRoundIdx === 0} onClick={goBack} style={{ background: '#000', color: '#fff', border: '1px solid #fff' }}>{'<'}</button>
            <button disabled={roundFinished[currentRoundIdx] && currentRoundIdx === rounds.length - 1} onClick={goNext} style={{ background: '#000', color: '#fff', border: '1px solid #fff' }}>{!roundFinished[currentRoundIdx] ? 'SKIP' : '>'}</button>
          </div>
          <div ref={scrollRef} className="rich-log-modern" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', minHeight: 0, boxSizing: 'border-box' }}>
            {currentRoundLines.slice(0, roundVisibleCounts[currentRoundIdx]).map((line, i) => {
              let style: React.CSSProperties = { marginBottom: '12px', opacity: 0, transform: 'translateY(10px)', animation: 'slideUp 0.3s forwards', WebkitTransform: 'translateY(10px)', WebkitAnimation: 'slideUp 0.3s forwards' };
              if (line.includes('VS')) {
                const [p1, p2] = line.split('VS');
                return (
                  <div key={i} className="battle-start-header" style={{ margin: '30px 0', textAlign: 'center', animation: 'zoomIn 0.8s forwards', background: 'linear-gradient(90deg, transparent, rgba(255,82,82,0.2), transparent)', padding: '20px 0', borderTop: '2px solid #ff5252', borderBottom: '2px solid #ff5252', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '10px' }}>BATTLE START</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '0 10px' }}>
                      <span className="battle-start-player-name" style={{ fontSize: p1.trim().length > 10 ? '1.2rem' : '1.8rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{p1.trim()}</span>
                      <span className="battle-start-vs" style={{ fontSize: '2.2rem', fontWeight: 'black', color: '#ff5252', fontStyle: 'italic' }}>VS</span>
                      <span className="battle-start-enemy-name" style={{ fontSize: p2.trim().length > 10 ? '1.2rem' : '1.8rem', fontWeight: 'bold', color: '#ff5252', textShadow: '0 0 10px rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{p2.trim()}</span>
                    </div>
                  </div>
                );
              }
              if (line.includes('戦闘開始')) return <div key={i} style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd54f', margin: '20px 0' }}>{line.replace(/[-―=]/g, '').trim()}</div>;
              if (line.includes('ラウンド') || line.includes('勝敗判定')) style = { ...style, color: '#61dafb', fontSize: '1.2em', borderBottom: '1px solid #333' };
              else if (line.includes('フェイズ')) style = { ...style, color: '#81c784', fontWeight: 'bold' };
              else if (line.includes('ダメージ') || line.includes('破壊')) style = { ...style, color: '#ff5252', paddingLeft: '10px', borderLeft: '2px solid #ff5252' };
              else if (line.includes('発動') || line.includes('効果')) style = { ...style, color: '#ffd54f', fontStyle: 'italic' };
              return <div key={i} className="log-line" style={style}>{line}</div>;
            })}
            
          </div>
        </div>
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @-webkit-keyframes slideUp {
            from { opacity: 0; -webkit-transform: translateY(10px); }
            to { opacity: 1; -webkit-transform: translateY(0); }
          }
          .rich-log-modern div {
            will-change: transform, opacity;
          }
        `}</style>
      </div>
    );
  }, (prevProps, nextProps) => {
    return prevProps.log === nextProps.log &&
           prevProps.immediate === nextProps.immediate &&
           prevProps.bossName === nextProps.bossName;
  });

interface SkillCardProps {
  skill: SkillDetail;
  isSelected?: boolean;
  onClick?: (abbr: string) => void;
  disableTooltip?: boolean;
  iconMode?: IconMode;
}

interface BattleResult {
  playerSkills: SkillDetail[];
  computerSkills: SkillDetail[];
  winner: number;
  resultText: string;
  gameLog: string;
  battleInstance?: any;
}

const SkillCard: React.FC<SkillCardProps & { id?: string; isConnected?: boolean; isDimmed?: boolean }> = ({ skill, isSelected, onClick, id, isConnected, isDimmed, disableTooltip, iconMode }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTooltipForceClosed, setIsTooltipForceClosed] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (onClick) {
      onClick(skill.abbr);
    }

  };

  const renderFormattedDescription = (text: string) => {
    let parts: (string | React.ReactNode)[] = [text];
    
    STATUS_DATA.forEach(status => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`(${status.name})`, 'g');
          const subParts = part.split(regex);
          subParts.forEach(subPart => {
            if (subPart === status.name) {
              newParts.push(
                <span 
                  key={status.name + Math.random()}
                  onMouseEnter={() => setHoveredStatus(status.name)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  style={{ color: '#ffeb3b', textDecoration: 'underline', cursor: 'help', fontWeight: 'bold', pointerEvents: 'auto' }}
                >
                  {subPart}
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts.map((part, i) => {
        if (typeof part === 'string') {
            return part.split('\n').map((line, j) => (
                <React.Fragment key={`${i}-${j}`}>
                    {line}
                    {j < part.split('\n').length - 1 && <br />}
                </React.Fragment>
            ));
        }
        return part;
    });
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<'center' | 'left' | 'right'>('center');
  const [isTooltipBelow, setIsTooltipBelow] = useState(false);

  useEffect(() => {
    if (showTooltip && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const margin = 20;
      const tooltipWidth = 220;
      const estimatedTooltipHeight = 150; // およその高さ

      // 垂直方向の判定
      const spaceAbove = rect.top;
      if (spaceAbove < estimatedTooltipHeight) {
        setIsTooltipBelow(true);
      } else {
        setIsTooltipBelow(false);
      }

      // 親要素(deneiSkillPanel)がある場合、その範囲内に収める
      const deneiPanel = document.getElementById('deneiSkillPanel');
      if (deneiPanel) {
        const panelRect = deneiPanel.getBoundingClientRect();
        const relativeLeft = rect.left - panelRect.left;
        const relativeRight = panelRect.right - rect.right;

        // パネル内での垂直判定を強化
        const spaceInPanelAbove = rect.top - panelRect.top;
        if (spaceInPanelAbove < estimatedTooltipHeight) {
          setIsTooltipBelow(true);
        }

        if (relativeLeft < tooltipWidth / 2) {
          setTooltipPos('left');
        } else if (relativeRight < tooltipWidth / 2) {
          setTooltipPos('right');
        } else {
          setTooltipPos('center');
        }
      } else {
        if (rect.left < tooltipWidth / 2 + margin) {
          setTooltipPos('left');
        } else if (screenWidth - rect.right < tooltipWidth / 2 + margin) {
          setTooltipPos('right');
        } else {
          setTooltipPos('center');
        }
      }
    }
  }, [showTooltip]);

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      ...(isTooltipBelow ? { top: '105%' } : { bottom: '105%' }),
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      whiteSpace: 'normal',
      zIndex: 2000,
      textAlign: 'left',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      minWidth: '220px',
      maxWidth: '300px',
      pointerEvents: 'auto',
      fontSize: '12px',
      lineHeight: '1.4',
      border: '1px solid #555',
    };

    if (tooltipPos === 'left') {
      return { ...base, left: '0', transform: 'none' };
    } else if (tooltipPos === 'right') {
      return { ...base, right: '0', transform: 'none' };
    }
    return { ...base, left: '50%', transform: 'translateX(-50%)' };
  };

  const renderIcon = () => {
    if (iconMode === 'ABBR') {
      return (
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', border: '1px solid #666', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold', color: '#fff', filter: isDimmed ? 'grayscale(100%)' : 'none' }}>
          {skill.abbr}
        </div>
      );
    }
    if (iconMode === 'PHONE') {
      const allAbbrs = ALL_SKILLS.map(s => s.abbr);
      const index = allAbbrs.indexOf(skill.abbr);
      let char = '';
      if (index >= 0 && index <= 9) char = index.toString();
      else if (index >= 10 && index <= 35) char = String.fromCharCode(65 + (index - 10)); // A-Z
      else char = '?';
      
      return (
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', border: '2px solid #4fc3f7', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', color: '#4fc3f7', boxShadow: '0 0 5px #4fc3f7', filter: isDimmed ? 'grayscale(100%)' : 'none' }}>
          {char}
        </div>
      );
    }
    return <img src={getStorageUrl(skill.icon)} alt={skill.name} className="skill-icon" style={{ filter: isDimmed ? 'grayscale(100%)' : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' }} />;
  };

  return (
    <div
      id={id}
      ref={cardRef}
      className={(isConnected ? 'synergy-active ' : '') + 'skill-card'}
      onClick={handleClick}
      onMouseEnter={() => {
        if (!disableTooltip) {
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
          }
          setShowTooltip(true);
          setIsTooltipForceClosed(false);
        }
      }}
      onMouseLeave={() => {
        if (!disableTooltip) {
          tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
          }, 300); // 300msの猶予を与える
        }
      }}
      style={{
        border: isConnected ? '3px solid #ffeb3b' : (isDimmed ? '3px solid #333' : (isSelected ? '3px solid gold' : '1px solid #444')),
        borderRadius: '8px',
        padding: '8px',
        margin: '2px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isConnected ? '#4a4a00' : (isSelected ? '#333300' : '#1a1a1a'),
        color: isDimmed ? '#666' : '#eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: isConnected ? '0 0 20px #ffeb3b, inset 0 0 15px #ffeb3b' : (isDimmed ? 'none' : (isSelected ? '0 0 10px rgba(255,215,0,0.7)' : '0 2px 4px rgba(0,0,0,0.3)')),
        position: 'relative',
        transition: 'all 0.3s ease',
        filter: isDimmed ? 'grayscale(80%)' : 'none',
        opacity: isDimmed ? 0.7 : 1,
      }}
    >
      {renderIcon()}
      <span className="skill-name">{skill.name}</span>
      {showTooltip && !isTooltipForceClosed && (
        <div 
          style={getTooltipStyle()}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
              tooltipTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            tooltipTimeoutRef.current = setTimeout(() => {
              setShowTooltip(false);
            }, 300);
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'baseline' }}>
            <div>
                <strong style={{ fontSize: '14px', color: '#ffd700' }}>{skill.name}</strong>
                <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '8px' }}>{skill.kana}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsTooltipForceClosed(true); }}
              style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', padding: '2px 6px' }}
            >
              閉じる
            </button>
          </div>
          <strong>種別:</strong> <span style={{ color: '#61dafb' }}>{skill.type}</span><br />
          <strong>速度:</strong> <span style={{ color: '#61dafb' }}>{skill.speed}</span><br />
          {renderFormattedDescription(skill.description)}

          {hoveredStatus && (
            <div style={{
              position: 'absolute',
              left: window.innerWidth < 600 ? '0' : '105%',
              top: window.innerWidth < 600 ? '105%' : 0,
              backgroundColor: '#444',
              color: '#fff',
              padding: '10px',
              borderRadius: '5px',
              width: window.innerWidth < 600 ? '100%' : '200px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              zIndex: 2001,
              border: '1px solid #ffd700',
              boxSizing: 'border-box'
            }}>
              <strong style={{ color: '#ffd700' }}>【{hoveredStatus}】</strong><br />
              {STATUS_DATA.find(s => s.name === hoveredStatus)?.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type StageMode = 'MID' | 'BOSS' | 'LOUNGE' | 'MYPAGE' | 'PROFILE' | 'RANKING' | 'KENJU' | 'DENEI' | 'VERIFY_EMAIL' | 'DELETE_ACCOUNT' | 'ADMIN_ANALYTICS' | 'LIFUKU';
type IconMode = 'ORIGINAL' | 'ABBR' | 'PHONE';

function App() {
  const [isTitle, setIsTitle] = useState(() => {
    const savedMode = localStorage.getItem('shiden_stage_mode');
    const loungeModes = ['LOUNGE', 'MYPAGE', 'PROFILE', 'RANKING', 'DELETE_ACCOUNT', 'ADMIN_ANALYTICS'];
    if (savedMode && loungeModes.includes(savedMode)) return false;
    
    const saved = localStorage.getItem('shiden_is_title');
    return saved === null ? true : saved === 'true';
  });

  // 初回レンダリング時に本日の剣獣を初期化
  useEffect(() => {
    refreshKenju();
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const isAdmin = user?.uid === process.env.REACT_APP_ADMIN_UID;
  const [iconMode, setIconMode] = useState<IconMode>(() => {
    const saved = localStorage.getItem('shiden_icon_mode');
    return (saved as IconMode) || 'ORIGINAL';
  });
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('shiden_bgm_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [bgmVolume, setBgmVolume] = useState<number>(() => {
    const saved = localStorage.getItem('shiden_bgm_volume');
    return saved === null ? 0.5 : parseFloat(saved);
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showRuleHint, setShowRuleHint] = useState(false);
  const [showClearStats, setShowClearStats] = useState(false);
  const [changelogData, setChangelogData] = useState<any[]>([]);
  const [showUpdateNotify, setShowUpdateNotify] = useState(false);

  const [availablePlayerCards, setAvailablePlayerCards] = useState<SkillDetail[]>([]);
  const [selectedPlayerSkills, setSelectedPlayerSkills] = useState<string[]>([]);
  const [connections, setConnections] = useState<{ fromId: string; toId: string }[]>([]);
  const [dimmedIndices, setDimmedIndices] = useState<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const mainGameAreaRef = useRef<HTMLDivElement>(null);
  
  const [logComplete, setLogComplete] = useState(false);
  const [useRichLog, setUseRichLog] = useState<boolean>(() => {
    const saved = localStorage.getItem('shiden_use_rich_log');
    return saved === null ? true : saved === 'true';
  });

  // 所持スキル
  const [ownedSkillAbbrs, setOwnedSkillAbbrs] = useState<string[]>(() => {
    const saved = localStorage.getItem('shiden_owned_skills');
    return saved ? JSON.parse(saved) : ["一"];
  });

  const [lastActiveProfiles, setLastActiveProfiles] = useState<{[uid: string]: number}>({});
  const [kenjuBoss, setKenjuBoss] = useState<{name: string, title: string, description: string, background: string, image: string, skills: SkillDetail[]} | null>(null);
  const [currentKenjuBattle, setCurrentKenjuBattle] = useState<{name: string, title: string, description: string, background: string, image: string, skills: SkillDetail[], isCustom?: boolean, userName?: string} | null>(() => {
    const saved = localStorage.getItem('shiden_current_kenju_battle');
    return saved ? JSON.parse(saved) : null;
  });
  const [kenjuClears, setKenjuClears] = useState<number>(0);
  const [kenjuTrials, setKenjuTrials] = useState<number>(0);
  const [allDeneiStats, setAllDeneiStats] = useState<{ [uid: string]: { [kenjuName: string]: { clears: number, trials: number, likes: number, isLiked?: boolean } } }>({});
  const [anonymousVictories, setAnonymousVictories] = useState<{[visitorId: string]: {[stageKey: string]: string[]}}>({});
  const [isDeneiStatsLoaded, setIsDeneiStatsLoaded] = useState(false);
  const [isLoungeDataLoaded, setIsLoungeDataLoaded] = useState(false); // 新しい状態変数

  const [currentPage, setCurrentPage] = useState(1);

  const [rewardSelectionMode, setRewardSelectionMode] = useState<boolean>(false);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [bossClearRewardPending, setBossClearRewardPending] = useState<boolean>(false);

  // ステージ管理
  const getStoredStageMode = (): StageMode => {
    const saved = localStorage.getItem('shiden_stage_mode');
    return (saved as StageMode) || 'MID';
  };

  const getLastGameMode = (): StageMode => {
    const saved = localStorage.getItem('shiden_last_game_mode');
    return (saved as StageMode) || 'MID';
  };

  const [stageMode, setStageMode] = useState<StageMode>(getStoredStageMode);
  const [stageCycle, setStageCycle] = useState<number>(() => {
    const saved = localStorage.getItem('shiden_stage_cycle');
    return saved ? parseInt(saved, 10) : 1;
  });
  const stageProcessor = React.useMemo<StageProcessor>(() => {
    // console.log(`[StageProcessor] Creating processor for Mode: ${stageMode}, Cycle: ${stageCycle}`);
    if (stageMode === 'KENJU' || stageMode === 'DENEI') return new KenjuStageProcessor();
    if (stageMode === 'BOSS') return new BossStageProcessor();
    if (stageMode === 'MID') {
      if (stageCycle === 11) return new Stage11MidStageProcessor();
      return new MidStageProcessor();
    }
    return new MidStageProcessor();
  }, [stageMode, stageCycle]);


  const [bossSkills, setBossSkills] = useState<SkillDetail[]>([]);
  const [canGoToBoss, setCanGoToBoss] = useState<boolean>(() => {
    const saved = localStorage.getItem('shiden_can_go_to_boss');
    return saved === 'true';
  });

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [showLogForBattleIndex, setShowLogForBattleIndex] = useState<number>(-1);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [epilogueContent, setEpilogueContent] = useState<string | null>(null);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [winRateDisplay, setWinRateDisplay] = useState<number | null>(null);
  const [stage11TrialActive, setStage11TrialActive] = useState(false);

  const NG_WORDS = ["死ね", "殺す", "バカ", "アホ", "カス", "ゴミ", "クズ", "卑猥", "セックス", "チンコ", "マンコ",
    "しね", "ころす", "ばか", "あほ", "かす", "ごみ", "くず", "エロ", "セックス", "ちんこ", "まんこ"];

  const filterNGWords = (text: string) => {
    let filtered = text;
    NG_WORDS.forEach(word => {
      const reg = new RegExp(word, 'gi');
      filtered = filtered.replace(reg, '*'.repeat(word.length));
    });
    return filtered;
  };

  const [stageVictorySkills, setStageVictorySkills] = useState<{ [key: string]: string[] }>(() => {
    const saved = localStorage.getItem('shiden_stage_victory_skills');
    return saved ? JSON.parse(saved) : {};
  });

  const [midEnemyData, setMidEnemyData] = useState<{ [stage: number]: string[] }>({});

  const stageContext = React.useMemo<import('./stageData').StageContext>(() => ({
    stageCycle,
    kenjuBoss: (stageMode === 'DENEI' || stageMode === 'KENJU') ? (currentKenjuBattle || kenjuBoss || undefined) : undefined,
    selectedPlayerSkills,
    midEnemyData,
    userName: myProfile?.displayName
  }), [stageCycle, stageMode, currentKenjuBattle, kenjuBoss, selectedPlayerSkills, midEnemyData, myProfile]);

  const lastSavedVictoryRef = useRef<string>("");

const PLAYER_SKILL_COUNT = 5;

  const getSkillCardsFromAbbrs = (abbrs: string[]) => {
    return abbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
  };

  useEffect(() => {
    const fetchStory = async () => {
      if (stageMode === 'MID' && !gameStarted) {
        try {
          const response = await fetch(`${process.env.PUBLIC_URL}/story/${stageCycle}.txt`);
          if (response.ok) {
            const text = await response.text();
            setStoryContent(text);
          }
        } catch (e) {
          console.error("Story fetch error:", e);
        }
      } else {
        setStoryContent(null);
      }
    };
    fetchStory();

    const fetchEpilogue = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/story/epilogue.txt`);
        if (response.ok) {
          const text = await response.text();
          setEpilogueContent(text);
        }
      } catch (e) {
        console.error("Epilogue fetch error:", e);
      }
    };
    fetchEpilogue();

    if (!gameStarted) {
      const getAvailableOwnedSkills = () => {
        const owned = ownedSkillAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
        return owned.sort((a, b) => {
          const indexA = ALL_SKILLS.findIndex(s => s.abbr === a.abbr);
          const indexB = ALL_SKILLS.findIndex(s => s.abbr === b.abbr);
          return indexA - indexB;
        });
      };
      
      const available = getAvailableOwnedSkills();
      setAvailablePlayerCards(available);
      
      setSelectedPlayerSkills([]);
      setBattleResults([]);
      setShowLogForBattleIndex(-1);
      setCanGoToBoss(false);
    }
  }, [gameStarted, ownedSkillAbbrs, stageCycle, stageMode]);

  useEffect(() => {
    if (stageMode === 'BOSS') {
      const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
      if (stageCycle === 10) {
        const gekirin = getSkillByAbbr("逆")!;
        const playerDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
        setBossSkills([gekirin, gekirin, gekirin, ...playerDetails]);
      } else {
        const bossAbbrs = currentStage.bossSkillAbbrs.split("");
        const skills = bossAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
        setBossSkills(skills);
      }
    } else {
      setBossSkills([]);
    }
  }, [stageMode, stageCycle, selectedPlayerSkills]);

  const handleSelectedSkillClick = (abbr: string) => {
    const index = selectedPlayerSkills.indexOf(abbr);
    if (index > -1) {
      const newSelectedSkills = [...selectedPlayerSkills];
      newSelectedSkills.splice(index, 1);
      setSelectedPlayerSkills(newSelectedSkills);
    }
  };

  useEffect(() => {
    localStorage.setItem('shiden_owned_skills', JSON.stringify(ownedSkillAbbrs));
  }, [ownedSkillAbbrs]);

  useEffect(() => {
    // 全てのモードを永続化する（リロード時に状態を維持するため）
    // LIFUKU モードの場合はリロード時にタイトルに戻るように保存しない
    if (stageMode !== 'LIFUKU') {
      localStorage.setItem('shiden_stage_mode', stageMode);
    }
    
    // ゲーム進行モード（MID/BOSS）の場合は、最後にプレイしたモードとして保存
    if (stageMode === 'MID' || stageMode === 'BOSS') {
      localStorage.setItem('shiden_last_game_mode', stageMode);
    }
  }, [stageMode]);

  useEffect(() => {
    if (currentKenjuBattle) {
      localStorage.setItem('shiden_current_kenju_battle', JSON.stringify(currentKenjuBattle));
    } else {
      localStorage.removeItem('shiden_current_kenju_battle');
    }
  }, [currentKenjuBattle]);

  useEffect(() => {
    localStorage.setItem('shiden_can_go_to_boss', canGoToBoss.toString());
  }, [canGoToBoss]);

  useEffect(() => {
    localStorage.setItem('shiden_use_rich_log', useRichLog.toString());
  }, [useRichLog]);

  useEffect(() => {
    localStorage.setItem('shiden_is_title', isTitle.toString());
  }, [isTitle]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setStageMode('LOUNGE');
      setIsTitle(false);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const handleEmailSignUp = async (email: string, pass: string) => {
    if (!email || !pass) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(userCredential.user);
      setStageMode('VERIFY_EMAIL');
      setIsTitle(false);
    } catch (error: any) {
      alert("サインアップエラー: " + error.message);
    }
  };

  const handleEmailSignIn = async (email: string, pass: string) => {
    if (!email || !pass) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (!userCredential.user.emailVerified) {
        setStageMode('VERIFY_EMAIL');
        setIsTitle(false);
        return;
      }
      setStageMode('LOUNGE');
      setIsTitle(false);
    } catch (error: any) {
      alert("サインインエラー: " + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setStageMode('MID');
      setIsTitle(true);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("本当にアカウントを削除しますか？この操作は取り消せません。")) return;

    try {
      const uid = user.uid;
      // 1. Delete profile from RTDB (Failure is okay here)
      try {
        const profileRef = ref(database, `profiles/${uid}`);
        await set(profileRef, null);
      } catch (dbError) {
        console.warn("Database profile deletion failed (ignoring):", dbError);
      }

      // 2. Delete user from Firebase Auth
      try {
        await deleteUser(user);
      } catch (authError: any) {
        if (authError.code === 'auth/requires-recent-login') {
          throw authError; // re-throw to be caught by outer catch
        }
        // If user is already gone from Auth but DB had data, we continue
        console.warn("Auth user deletion failed (possibly already deleted):", authError);
      }

      // 3. Ensure sign out (though deleteUser should handle it)
      await signOut(auth);

      // LocalStorage もクリアして完全リセット
      localStorage.removeItem('shiden_stage_cycle');
      localStorage.removeItem('shiden_owned_skills');
      localStorage.removeItem('shiden_stage_mode');
      localStorage.removeItem('shiden_last_game_mode');
      localStorage.removeItem('shiden_stage_victory_skills');
      localStorage.removeItem('shiden_can_go_to_boss');

      alert("アカウント削除が完了しました。ご利用ありがとうございました。");
      setStageMode('MID');
      setIsTitle(true);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        alert("セキュリティのため、再ログインしてから再度お試しください。");
        await signOut(auth);
        setStageMode('MID');
        setIsTitle(true);
      } else {
        alert("エラーが発生しました: " + error.message);
        // エラーが出ても最悪 LocalStorage だけは消してやり直せるようにする
        localStorage.removeItem('shiden_stage_cycle');
        localStorage.removeItem('shiden_owned_skills');
        setStageMode('MID');
        setIsTitle(true);
      }
    }
  };

  const handleLikeDenei = async (masterUid: string, deneiName: string) => {
    if (!user) return;

    const isCurrentlyLiked = allDeneiStats[masterUid]?.[deneiName]?.isLiked;
    
    // 楽観的UI更新
    setAllDeneiStats(prevStats => {
      const newStats = { ...prevStats };
      if (!newStats[masterUid]) {
        newStats[masterUid] = {};
      }
      if (!newStats[masterUid][deneiName]) {
        newStats[masterUid][deneiName] = { clears: 0, trials: 0, likes: 0 };
      }
      const currentLikes = newStats[masterUid][deneiName].likes || 0;
      newStats[masterUid][deneiName].likes = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
      newStats[masterUid][deneiName].isLiked = !isCurrentlyLiked;
      return newStats;
    });

    const likeRef = ref(database, `deneiLikes/${masterUid}/${deneiName}/${user.uid}`);
    if (isCurrentlyLiked) {
      set(likeRef, null).catch(err => console.error("Failed to unlike:", err));
    } else {
      set(likeRef, serverTimestamp()).catch(err => console.error("Failed to like:", err));
    }
  };

  const handleUpdateProfile = async (displayName: string, favoriteSkill: string, comment: string, photoURL?: string, title?: string, oneThing?: string, isSpoiler?: boolean, myKenju?: UserProfile['myKenju'], photoUploaderUid?: string) => {
    if (!user || !myProfile) return;
    const profileRef = ref(database, `profiles/${user.uid}`);
    
    const filteredName = filterNGWords(displayName || "");
    const filteredComment = filterNGWords(comment || "");

    const updatedProfile: UserProfile = {
      ...myProfile,
      displayName: filteredName || myProfile.displayName,
      favoriteSkill: favoriteSkill || myProfile.favoriteSkill,
      comment: filteredComment.substring(0, 15),
      photoURL: photoURL || myProfile.photoURL,
      title: title !== undefined ? title : (myProfile.title || ""),
      oneThing: oneThing !== undefined ? oneThing : (myProfile.oneThing || ""),
      isSpoiler: isSpoiler !== undefined ? isSpoiler : !!myProfile.isSpoiler,
      myKenju: myKenju !== undefined ? myKenju : (myProfile.myKenju || undefined),
      photoUploaderUid: photoUploaderUid !== undefined ? photoUploaderUid : (myProfile.photoUploaderUid || ""),
      lastActive: Date.now()
    };

    // Firebase cannot handle undefined. Remove undefined properties.
    const cleanProfile = JSON.parse(JSON.stringify(updatedProfile));

    // 楽観的UI更新
    setMyProfile(updatedProfile);

    // Firebase更新 (awaitしないことで入力をスムーズにする)
    set(profileRef, cleanProfile).catch(err => {
      console.error("Profile update failed:", err);
      // 失敗した場合は本当のDBの状態に戻るはず（onValue経由で）
    });
  };

  const handleSaveKenju = async (myKenju: UserProfile['myKenju'], shouldResetStats: boolean = true, onComplete?: (success: boolean, message: string) => void) => {
    if (!user || !myProfile || !myKenju) return;

    // 電影情報を更新
    const profileRef = ref(database, `profiles/${user.uid}`);
    const updatedProfile = {
      ...myProfile,
      myKenju: myKenju,
      lastActive: Date.now()
    };
    
    try {
      await set(profileRef, updatedProfile);

      if (shouldResetStats) {
        // クリア人数と挑戦回数をリセット
        const clearsRef = ref(database, `deneiClears/${user.uid}/${myKenju.name}`);
        const trialsRef = ref(database, `deneiTrials/${user.uid}/${myKenju.name}`);
        
        await set(clearsRef, null);
        await set(trialsRef, null);

        onComplete?.(true, "電影の設定を保存しました。\nスキル構成が変更されたため、クリア人数と挑戦回数がリセットされました。");
      } else {
        onComplete?.(true, "電影の設定を保存しました。");
      }
    } catch (err) {
      console.error("Failed to save Kenju or reset stats:", err);
      onComplete?.(false, "保存に失敗しました。");
    }
  };

  const generateDailyKenju = () => {
    const today = new Date();
    // 曜日ベースのインデックス (0: 日曜日, 1: 月曜日, ..., 5: 金曜日, 6: 土曜日)
    // KENJU_DATAが現在7体なので、曜日にそのまま対応させる
    // ヴォマクト(index 4)を金曜日(day 5)に、スティーブ(index 5)を土曜日(day 6)にしたい
    // 現在のデータ順:
    // 0: クリームヒルト
    // 1: ワダチ
    // 2: シーラン
    // 3: アティヤー
    // 4: ヴォマクト
    // 5: スティーブ
    // 6: 果てに視えるもの
    
    // 金曜日(5) -> 4(ヴォマクト), 土曜日(6) -> 5(スティーブ)
    // 1つずらす (day - 1) % 7
    // 日曜日(0) -> -1 -> 6 (果てに視えるもの)
    const day = today.getDay();
    // 0:日 -> 6, 1:月 -> 0, 2:火 -> 1, 3:水 -> 2, 4:木 -> 3, 5:金 -> 4, 6:土 -> 5
    const index = (day + 6) % 7;
    
    // KENJU_DATAの範囲内に収まるように念のため剰余を取る
    const kenjuBase = KENJU_DATA[index % KENJU_DATA.length] || KENJU_DATA[0];
    const skillAbbrs = kenjuBase.skillAbbrs.split("");
    const skills = skillAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];

    return {
        name: kenjuBase.name,
        title: kenjuBase.title,
        description: kenjuBase.description,
        background: kenjuBase.background || "/images/background/11.jpg",
        image: kenjuBase.image,
        skills: skills
    };
  };

  const refreshKenju = React.useCallback(() => {
    const kenju = generateDailyKenju();
    console.log("Daily Kenju Generated:", kenju);
    setKenjuBoss(kenju as any);

    // クリア人数をカウント
    const clearsRef = ref(database, `kenjuClears/${new Date().toLocaleDateString().replace(/\//g, '-')}/${kenju.name}`);
    onValue(clearsRef, (snapshot) => {
      if (snapshot.exists()) {
        setKenjuClears(snapshot.size);
      } else {
        setKenjuClears(0);
      }
    });

    const trialsRef = ref(database, `kenjuTrials/${new Date().toLocaleDateString().replace(/\//g, '-')}/${kenju.name}`);
    onValue(trialsRef, (snapshot) => {
      if (snapshot.exists()) {
        setKenjuTrials(snapshot.size);
      } else {
        setKenjuTrials(0);
      }
    });
    
    // Fetch midenemy.csv
    const fetchMidEnemyData = async () => {
        try {
            const response = await fetch(`${process.env.PUBLIC_URL}/enemy/midenemy.csv`);
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n');
                const data: { [stage: number]: string[] } = {};
                lines.forEach(line => {
                    const cols = line.split(',').map(c => c.trim()).filter(Boolean);
                    if (cols.length >= 2) {
                        const stageNo = parseInt(cols[0], 10);
                        if (!isNaN(stageNo)) {
                            data[stageNo] = cols.slice(1);
                        }
                    }
                });
                setMidEnemyData(data);
            }
        } catch (e) {
            console.error("Midenemy fetch error:", e);
        }
    };
    fetchMidEnemyData();

    // Fetch changelog.json and check version
    const fetchChangelogAndCheckVersion = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/changelog.json?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setChangelogData(data);
          
          if (data && data.length > 0) {
            const latestVersion = data[data.length - 1].date + "_" + data[data.length - 1].title;
            const savedVersion = localStorage.getItem('shiden_version');
            
            if (savedVersion && savedVersion !== latestVersion) {
              setShowUpdateNotify(true);
            }
            // 保存されていない場合は現在のものを保存して、初回は通知しない
            if (!savedVersion) {
              localStorage.setItem('shiden_version', latestVersion);
            }
          }
        }
      } catch (e) {
        console.error("Changelog fetch error:", e);
      }
    };
    fetchChangelogAndCheckVersion();

    // 1時間おきにチェック
    const interval = setInterval(fetchChangelogAndCheckVersion, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

   const handleKenjuBattle = async (selectedBoss?: { name: string; image: string; skills: SkillDetail[]; background?: string; title?: string; description?: string }, mode: StageMode = 'KENJU') => {
    if (!user || !myProfile) return;
    const targetBoss = selectedBoss || kenjuBoss;
    if (!targetBoss) return;

    const today = new Date().toLocaleDateString();

    const profileRef = ref(database, `profiles/${user.uid}`);
    await set(profileRef, { ...myProfile, lastKenjuDate: today, lastActive: Date.now() });
    
    // バトル用のステートにセットする（kenjuBossは「本日の剣獣」用として保持し続ける）
    setCurrentKenjuBattle(targetBoss as any);

    setStageMode(mode);
    handleResetGame();
  };

  const handleLifukuScore = async (score: number) => {
    if (!user || !myProfile) return;
    
    const currentHighscore = myProfile.lifukuHighscore || 0;
    if (score > currentHighscore) {
      const profileRef = ref(database, `profiles/${user.uid}`);
      await set(profileRef, {
        ...myProfile,
        lifukuHighscore: score,
        lastActive: Date.now()
      });
    }
  };

  const handleNewGame = () => {
    if (localStorage.getItem('shiden_stage_cycle') && !window.confirm('進捗をリセットして最初から始めますか？')) return;
    localStorage.removeItem('shiden_stage_cycle');
    localStorage.removeItem('shiden_owned_skills');
    localStorage.removeItem('shiden_stage_mode');
    localStorage.removeItem('shiden_last_game_mode');
    localStorage.removeItem('shiden_can_go_to_boss');
    localStorage.removeItem('shiden_stage_victory_skills');
    localStorage.setItem('shiden_is_title', 'false');
    setIsTitle(false);
    setStageMode('MID');
    setStageCycle(1);
    setOwnedSkillAbbrs(["一"]);
    setStageVictorySkills({});
    window.location.reload();
  };

  const handleContinue = () => {
    setStageMode(getLastGameMode());
    setIsTitle(false);
  };

  useEffect(() => {
    // 同一ブラウザからの接続を1人としてカウントするための識別子
    let visitorId = localStorage.getItem('shiden_visitor_id');
    if (!visitorId) {
      visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('shiden_visitor_id', visitorId);
    }

    const connectedRef = ref(database, '.info/connected');
    // visitorId の下に、タブごとの接続 ID を作成する
    // これにより、すべてのタブを閉じない限り visitorId ノードが維持される
    const myConnectionsRef = ref(database, `activeVisitors/${visitorId}`);
    const myConnectionRef = push(myConnectionsRef);
    
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(myConnectionRef).remove();
        set(myConnectionRef, {
          lastActive: serverTimestamp(),
          uid: auth.currentUser?.uid || null,
          userAgent: navigator.userAgent // 念のため
        });
      }
    });

    const activeVisitorsRef = ref(database, 'activeVisitors');
    onValue(activeVisitorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // ノードの直下の数（visitorIdの数）がユニークな接続数になる
        setActiveUsers(snapshot.size);

        // アクティブなプロフィール（UID）を集計
        const active: {[uid: string]: number} = {};
        Object.values(data).forEach((visitorConnections: any) => {
          if (typeof visitorConnections === 'object') {
            Object.values(visitorConnections).forEach((conn: any) => {
              if (conn && conn.uid) active[conn.uid] = conn.lastActive;
            });
          }
        });
        setLastActiveProfiles(active);
      } else {
        setActiveUsers(0);
        setLastActiveProfiles({});
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
           setStageMode('VERIFY_EMAIL');
           setIsTitle(false);
        } else if (stageMode === 'VERIFY_EMAIL') {
           setStageMode('LOUNGE');
        }
        // if (user.uid === process.env.REACT_APP_ADMIN_UID) {
        //   setShowAdmin(true);
        // }
        const profileRef = ref(database, `profiles/${user.uid}`);
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setMyProfile(data);
            // Firebaseから取得した勝利スキルをセット
            const firebaseVictorySkills = data.victorySkills || {};
            setStageVictorySkills(firebaseVictorySkills);
            localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(firebaseVictorySkills));

            // ローカルストレージに未アップロードの勝利スキルがあればFirebaseにアップロード
            const localVictorySkills = JSON.parse(localStorage.getItem('shiden_stage_victory_skills') || '{}');
            let hasNewLocalSkills = false;
            for (const key in localVictorySkills) {
              if (!(firebaseVictorySkills as any)[key]) {
                const specificVictorySkillRef = ref(database, `profiles/${user.uid}/victorySkills/${key}`);
                set(specificVictorySkillRef, localVictorySkills[key]);
                (firebaseVictorySkills as any)[key] = localVictorySkills[key]; // アップロードしたスキルをFirebaseデータにマージ
                hasNewLocalSkills = true;
              }
            }
            if (hasNewLocalSkills) {
              setStageVictorySkills(firebaseVictorySkills);
              localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(firebaseVictorySkills)); // 更新後のFirebaseデータをローカルにも保存
            }
          } else {
            const initialProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || "名無しの剣士",
              photoURL: user.photoURL || getStorageUrl("/images/icon/mon_215.gif"),
              favoriteSkill: "一",
              title: "",
              comment: "よろしく！",
              lastActive: Date.now(),
              points: 0,
              lastKenjuDate: new Date().toLocaleDateString()
            };
            set(profileRef, initialProfile);
          }
        });
      } else {
        setMyProfile(null);
      }
    });

    const profilesQuery = query(ref(database, 'profiles'), limitToLast(100));
    get(profilesQuery).then((snapshot) => {
      if (snapshot.exists()) {
        try {
          const data = snapshot.val();
          const profilesList = Object.values(data) as UserProfile[];
          const filteredList = profilesList.filter(p => p && p.displayName && p.displayName.trim() !== "");
          setAllProfiles(filteredList);
        } catch (err) {
          console.error("Error processing profiles:", err);
        }
      }
    });

    // 統計データはピックアップ表示に必要な分だけ、あるいは初回のみ取得するなどの工夫が必要だが、
    // まずは onValue をやめて get にすることで毎回の同期を避ける
    const deneiClearsRootRef = ref(database, 'deneiClears');
    const deneiTrialsRootRef = ref(database, 'deneiTrials');
    const deneiLikesRootRef = ref(database, 'deneiLikes');

    const updateDeneiStats = (clearsData: any, trialsData: any, likesData: any) => {
      const newState: { [uid: string]: { [kenjuName: string]: { clears: number, trials: number, likes: number, isLiked?: boolean } } } = {};
      
      const ensureStats = (uid: string, kenjuName: string) => {
        if (!newState[uid]) newState[uid] = {};
        if (!newState[uid][kenjuName]) newState[uid][kenjuName] = { clears: 0, trials: 0, likes: 0 };
      };

      if (clearsData) {
        Object.entries(clearsData).forEach(([uid, kenjus]) => {
          if (typeof kenjus !== 'object' || kenjus === null) return;
          Object.entries(kenjus).forEach(([kenjuName, clears]) => {
            if (typeof clears !== 'object' || clears === null) return;
            ensureStats(uid, kenjuName);
            newState[uid][kenjuName].clears = Object.keys(clears).length;
          });
        });
      }
      
      if (trialsData) {
        Object.entries(trialsData).forEach(([uid, kenjus]) => {
          if (typeof kenjus !== 'object' || kenjus === null) return;
          Object.entries(kenjus).forEach(([kenjuName, trials]) => {
            if (typeof trials !== 'object' || trials === null) return;
            ensureStats(uid, kenjuName);
            newState[uid][kenjuName].trials = Object.keys(trials).length;
          });
        });
      }

      if (likesData) {
        Object.entries(likesData).forEach(([uid, kenjus]) => {
          if (typeof kenjus !== 'object' || kenjus === null) return;
          Object.entries(kenjus).forEach(([kenjuName, likes]) => {
            if (typeof likes !== 'object' || likes === null) return;
            ensureStats(uid, kenjuName);
            newState[uid][kenjuName].likes = Object.keys(likes).length;
            if (auth.currentUser && likes[auth.currentUser.uid]) {
              newState[uid][kenjuName].isLiked = true;
            }
          });
        });
      }
      
      setAllDeneiStats(newState);
      setIsDeneiStatsLoaded(true);
    };

    // onValue に戻してリアルタイム更新を有効化
    const unsubClears = onValue(deneiClearsRootRef, (snap) => {
      get(deneiTrialsRootRef).then(trialsSnap => {
        get(deneiLikesRootRef).then(likesSnap => {
          updateDeneiStats(snap.val(), trialsSnap.val(), likesSnap.val());
        });
      });
    });
    const unsubTrials = onValue(deneiTrialsRootRef, (snap) => {
      get(deneiClearsRootRef).then(clearsSnap => {
        get(deneiLikesRootRef).then(likesSnap => {
          updateDeneiStats(clearsSnap.val(), snap.val(), likesSnap.val());
        });
      });
    });
    const unsubLikes = onValue(deneiLikesRootRef, (snap) => {
      get(deneiClearsRootRef).then(clearsSnap => {
        get(deneiTrialsRootRef).then(trialsSnap => {
          updateDeneiStats(clearsSnap.val(), trialsSnap.val(), snap.val());
        });
      });
    });

    setBattleResults([]);
    setLogComplete(false);
    setCanGoToBoss(false);
    setShowBossClearPanel(false);
    setSelectedPlayerSkills([]);


    const imageUrls = [
      getStorageUrl('/images/background/background.jpg'),
      getStorageUrl('/images/title/titlelogo.png')
    ];
    let loadedCount = 0;
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) setIsAssetsLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) setIsAssetsLoaded(true);
      };
    });

    return () => {
      unsubscribeAuth();
      unsubClears();
      unsubTrials();
      unsubLikes();
    };
  }, []);

  useEffect(() => {
    // 電影のクリア人数・挑戦回数を購読
    let deneiTrialsUnsubscribe: (() => void) | null = null;
    let deneiClearsUnsubscribe: (() => void) | null = null;

    if (viewingProfile?.myKenju?.name && viewingProfile.uid) {
      const masterUid = viewingProfile.uid;
      const kenjuName = viewingProfile.myKenju.name;

      const deneiTrialsRef = ref(database, `deneiTrials/${masterUid}/${kenjuName}`);
      deneiTrialsUnsubscribe = onValue(deneiTrialsRef, (snapshot) => {
        if (snapshot.exists()) {
          setKenjuTrials(snapshot.size);
        } else {
          setKenjuTrials(0);
        }
      });

      const deneiClearsRef = ref(database, `deneiClears/${masterUid}/${kenjuName}`);
      deneiClearsUnsubscribe = onValue(deneiClearsRef, (snapshot) => {
        if (snapshot.exists()) {
          setKenjuClears(snapshot.size);
        } else {
          setKenjuClears(0);
        }
      });
    }

    return () => {
      if (deneiTrialsUnsubscribe) deneiTrialsUnsubscribe();
      if (deneiClearsUnsubscribe) deneiClearsUnsubscribe();
    };
  }, [viewingProfile]);

  useEffect(() => {
    // sessionStorage を使って、タブ/セッションごとに一度だけアクセスを記録
    const LOCAL_KEY = 'shiden_local_accessed';
    if (!localStorage.getItem(LOCAL_KEY)) {
      recordAccess();
      localStorage.setItem(LOCAL_KEY, 'true');
    }
  }, []);

  useEffect(() => {
    const newConnections: { fromId: string; toId: string }[] = [];
    const newDimmedIndices: number[] = [];
    const skillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);

    for (let i = 0; i < skillDetails.length; i++) {
      const current = skillDetails[i];
      if (current.name.startsWith("＋")) {
        if (i > 0) {
          const prev = skillDetails[i - 1];
          let hasSynergy = false;
          if (current.name === "＋硬" || current.name === "＋速") {
            hasSynergy = prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃");
          } else {
            hasSynergy = prev.type.includes("攻撃");
          }
          if (hasSynergy) {
            newConnections.push({ fromId: `selected-skill-${i - 1}`, toId: `selected-skill-${i}` });
          } else {
            newDimmedIndices.push(i);
          }
        } else {
          newDimmedIndices.push(i);
        }
      }
    }
    setConnections(newConnections);
    setDimmedIndices(newDimmedIndices);
  }, [selectedPlayerSkills]);

  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    const updateCoords = () => {
      if (!panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const newCoords = connections.map(conn => {
        const fromEl = document.getElementById(conn.fromId);
        const toEl = document.getElementById(conn.toId);
        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          return {
            x1: fromRect.left + fromRect.width / 2 - panelRect.left,
            y1: fromRect.top + fromRect.height / 2 - panelRect.top,
            x2: toRect.left + toRect.width / 2 - panelRect.left,
            y2: toRect.top + toRect.height / 2 - panelRect.top,
          };
        }
        return null;
      }).filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];
      setLineCoords(newCoords);
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [connections, selectedPlayerSkills]);

  const triggerVictoryConfetti = () => {
    const positions = [{ x: 0.8, y: 0.8 }, { x: 0.2, y: 0.9 }, { x: 0.5, y: 0.95 }];
    [300, 500, 800].forEach((delay, index) => {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: positions[index],
          colors: ['#ffeb3b', '#ffc107', '#ff9800', '#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50'],
          zIndex: 10000,
        });
      }, delay);
    });
  };

  const [showBossClearPanel, setShowBossClearPanel] = useState(false);

  const handlePlayerSkillSelectionClick = (abbr: string) => {
    if (selectedPlayerSkills.length < PLAYER_SKILL_COUNT) {
      const skill = getSkillByAbbr(abbr);
      if (skill?.name === "無想" && selectedPlayerSkills.some(s => getSkillByAbbr(s)?.name === "無想")) {
        alert("「無想」は編成に1つしか入れられません。");
        return;
      }
      setSelectedPlayerSkills([...selectedPlayerSkills, abbr]);
    }
  };

  const handleStartGame = () => {
    if (selectedPlayerSkills.length === PLAYER_SKILL_COUNT) {
      window.scrollTo({ top: 0 });
      if (mainGameAreaRef.current) mainGameAreaRef.current.scrollTop = 0;
      const results: BattleResult[] = [];
      const playerSkillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
      const battleCount = stageProcessor.getBattleCount();
      const context = stageContext;

      // 挑戦回数をカウント
      if (stageMode === 'KENJU' && kenjuBoss) {
        const targetBossName = kenjuBoss.name;
        const trialsRef = ref(database, `kenjuTrials/${new Date().toLocaleDateString().replace(/\//g, '-')}/${targetBossName}`);
        const newTrialRef = push(trialsRef);
        set(newTrialRef, {
          uid: user?.uid || 'anonymous',
          timestamp: serverTimestamp()
        });
        // オプティミスティックUI更新
        setKenjuTrials(prev => prev + 1);
      } else if (stageMode === 'DENEI' && currentKenjuBattle) {
        const targetBossName = currentKenjuBattle.name;
        const masterUid = (currentKenjuBattle as any).masterUid;
        if (masterUid) {
          // オプティミスティックUI更新
          setAllDeneiStats(prevStats => {
            const newStats = { ...prevStats };
            if (!newStats[masterUid]) newStats[masterUid] = {};
            if (!newStats[masterUid][targetBossName]) newStats[masterUid][targetBossName] = { clears: 0, trials: 0, likes: 0 };
            newStats[masterUid][targetBossName].trials = (newStats[masterUid][targetBossName].trials || 0) + 1;
            return newStats;
          });

          const trialsRef = ref(database, `deneiTrials/${masterUid}/${targetBossName}`);
          const newTrialRef = push(trialsRef);
          set(newTrialRef, {
            uid: user?.uid || 'anonymous',
            timestamp: serverTimestamp()
          });

          // マスターにポイントを加算
          const masterPointsRef = ref(database, `profiles/${masterUid}/points`);
          onValue(masterPointsRef, (snapshot) => {
            const currentPoints = snapshot.val() || 0;
            set(masterPointsRef, currentPoints + 10);
          }, { onlyOnce: true });
        }
      }
      
      const processResults = (winCount: number) => {
          setBattleResults(results);
          setGameStarted(true);
          setShowLogForBattleIndex(0);
          const winRateVal = Math.round((winCount / battleCount) * 100);

          if (stageProcessor.shouldShowWinRate?.(context)) {
            setStage11TrialActive(true);
            let currentRate = 0;
            const threshold = stageProcessor.getWinThreshold?.(context) || 100;
            const interval = setInterval(() => {
              currentRate += 1;
              setWinRateDisplay(currentRate);
              if (currentRate >= winRateVal) {
                clearInterval(interval);
                setTimeout(() => {
                    if (winRateVal >= threshold) {
                        setCanGoToBoss(true);
                        triggerVictoryConfetti();
                    } else {
                        setCanGoToBoss(false);
                    }
                    if (getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
                      setRewardSelectionMode(true);
                    }
                    setStage11TrialActive(false);
                }, 1000);
              }
            }, 30);
          } else {
            const isVictory = (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) ? winCount >= 1 : winCount === 10;
            const result = isVictory ? stageProcessor.onVictory(context) : stageProcessor.onFailure(context);
            
            if (isVictory) {
              setCanGoToBoss(true);
              if (stageMode === 'MID') triggerVictoryConfetti();
            }

            if (result.showReward && getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
              if ((result as any).pendingClear) setBossClearRewardPending(true);
              else setRewardSelectionMode(true);
            } else if (isVictory && (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode)) {
              setShowBossClearPanel(true);
            }
          }
      };

      let winCountTotal = 0;
      for (let i = 0; i < battleCount; i++) {
        const enemyName = stageProcessor.getEnemyName(i, context);
        const currentComputerSkills = stageProcessor.getEnemySkills(i, context);
        const game = new Game(selectedPlayerSkills.join("") + "／あなた", currentComputerSkills.map(s => s.abbr).join("") + "／" + enemyName);
        const winner = game.startGame();
        if (winner === 1) winCountTotal++;
        results.push({ playerSkills: playerSkillDetails, computerSkills: currentComputerSkills, winner, resultText: winner === 1 ? "Win!" : winner === 2 ? "Lose" : "Draw", gameLog: game.gameLog, battleInstance: game.battle });
        if ((['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode)) break;
      }
      processResults(winCountTotal);
    } else {
      alert(`スキルを${PLAYER_SKILL_COUNT}枚選択してください。`);
    }
  };

  const handleResetGame = () => {
    setGameStarted(false);
    setBattleResults([]);
    setShowLogForBattleIndex(-1);
    setCanGoToBoss(false);
    setLogComplete(false);
  };

  const goToBossStage = () => { setStageMode('BOSS'); handleResetGame(); };

  const handleRewardSelection = (abbr: string) => {
    if (selectedRewards.includes(abbr)) setSelectedRewards([]);
    else setSelectedRewards([abbr]);
  };

  const confirmRewards = () => {
    setOwnedSkillAbbrs(prev => [...prev, ...selectedRewards]);
    setSelectedRewards([]);
    setRewardSelectionMode(false);
    if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle();
  };

  const clearBossAndNextCycle = () => {
    if (bossClearRewardPending) {
        const availableRewards = getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr));
        if (availableRewards.length > 0) { setRewardSelectionMode(true); setBossClearRewardPending(false); return; }
    }
    if (stageMode === 'KENJU' || stageMode === 'DENEI') {
      setStageMode('LOUNGE');
      handleResetGame();
      return;
    }
    if (stageCycle === 12) {
      setShowEpilogue(true);
      return;
    }
    setStageMode('MID');
    const nextCycle = stageCycle + 1;
    setStageCycle(nextCycle);
    localStorage.setItem('shiden_stage_cycle', nextCycle.toString());
    setShowBossClearPanel(false);
    handleResetGame();
    setCanGoToBoss(false);
    setLogComplete(false);
    setBattleResults([]);
    setGameStarted(false);
    setShowLogForBattleIndex(-1);
  };

  const handleBattleLogComplete = () => {
    setLogComplete(true);
    // ボス戦、剣獣戦、または電影戦で勝利した場合のみ、紙吹雪とボス撃破パネルを表示
    const winCount = battleResults.filter(r => r.winner === 1).length;
    const isVictory = (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? winCount >= 1 : winCount === 10;
    if (isVictory && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI')) {
        triggerVictoryConfetti();
        if (stageMode === 'BOSS') {
            setShowBossClearPanel(true);
            // Stage12のボス勝利で「クリアしたよ！」の称号
            if (stageCycle === 12 && user && myProfile && !(myProfile.medals || []).includes('master')) {
                const profileRef = ref(database, `profiles/${user.uid}/`);
                const newMedals = [...(myProfile.medals || []), 'master'];
                set(profileRef, { ...myProfile, medals: newMedals, lastActive: Date.now() });
            }
        }
        if (stageMode === 'KENJU' && kenjuBoss && user && myProfile) {
            const kenjuConfig = KENJU_DATA.find(k => k.name === kenjuBoss.name);
            if (kenjuConfig && kenjuConfig.medalId) {
                const medalId = kenjuConfig.medalId;
                if (!(myProfile.medals || []).includes(medalId)) {
                    const profileRef = ref(database, `profiles/${user.uid}/`);
                    const newMedals = [...(myProfile.medals || []), medalId];
                    set(profileRef, { ...myProfile, medals: newMedals, lastActive: Date.now() });
                    console.log(`[Medal] Awarded ${medalId} for defeating ${kenjuBoss.name}`);
                }
            }
        }
    }
  };

  const handleForceUpdate = () => {
    if (changelogData.length > 0) {
      const latestVersion = changelogData[changelogData.length - 1].date + "_" + changelogData[changelogData.length - 1].title;
      localStorage.setItem('shiden_version', latestVersion);
    }
    // 強制更新を模倣するためにキャッシュを無視してリロード
    window.location.reload();
  };


  const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
  const isMobile = window.innerWidth < 768;
  const isLargeScreen = window.innerWidth > 1024;
  const isLoungeMode = ['LOUNGE', 'MYPAGE', 'PROFILE', 'RANKING', 'DELETE_ACCOUNT', 'ADMIN_ANALYTICS'].includes(stageMode);

  useEffect(() => {
    if (gameStarted && battleResults.length > 0) {
      const winCount = battleResults.filter(r => r.winner === 1).length;
      const isVictory = (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) ? winCount >= 1 : winCount === 10;
      const saveKey = stageMode === 'KENJU' ? `KENJU_${kenjuBoss?.name}` :
                      stageMode === 'DENEI' ? `DENEI_${currentKenjuBattle?.name}` :
                      `${stageMode}_${stageCycle}`;
      const currentBattleId = `${saveKey}_${battleResults.length}_${winCount}`;

      if (lastSavedVictoryRef.current !== currentBattleId) {
          lastSavedVictoryRef.current = currentBattleId;

          // まずはローカルストレージに保存
          const localVictorySkills = JSON.parse(localStorage.getItem('shiden_stage_victory_skills') || '{}');
          const updatedLocalVictorySkills = { ...localVictorySkills, [saveKey]: selectedPlayerSkills };
          localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(updatedLocalVictorySkills));
          setStageVictorySkills(updatedLocalVictorySkills);
          

          // Firebase/サーバーへの保存は勝利時のみ
          if (isVictory) {
            // ユーザーがログインしている場合はFirebaseにも保存
            if (user) {
              const specificVictorySkillRef = ref(database, `profiles/${user.uid}/victorySkills/${saveKey.replace(/\.(?!\w+$)/g, '_').replace(/\./g, '_')}`);
              set(specificVictorySkillRef, selectedPlayerSkills);

              // クリア人数カウント用の記録
              if (stageMode === 'KENJU' && kenjuBoss) {
                const kenjuClearRef = ref(database, `kenjuClears/${new Date().toLocaleDateString().replace(/\//g, '-')}/${kenjuBoss.name}/${user.uid}`);
                set(kenjuClearRef, serverTimestamp());
                // オプティミスティックUI更新
                setKenjuClears(prev => prev + 1);
              } else if (stageMode === 'DENEI' && currentKenjuBattle) {
                const masterUid = (currentKenjuBattle as any).masterUid;
                if (masterUid) {
                  const deneiClearRef = ref(database, `deneiClears/${masterUid}/${currentKenjuBattle.name}/${user.uid}`);
                  set(deneiClearRef, serverTimestamp());
                  // オプティミスティックUI更新
                  setAllDeneiStats(prevStats => {
                    const newStats = { ...prevStats };
                    if (!newStats[masterUid]) newStats[masterUid] = {};
                    if (!newStats[masterUid][currentKenjuBattle.name]) newStats[masterUid][currentKenjuBattle.name] = { clears: 0, trials: 0, likes: 0 };
                    newStats[masterUid][currentKenjuBattle.name].clears = (newStats[masterUid][currentKenjuBattle.name].clears || 0) + 1;
                    return newStats;
                  });

                  // 自分のクリア履歴を保存
                  const deneiVictoryHistoryRef = ref(database, `profiles/${user.uid}/deneiVictories/${currentKenjuBattle.name.replace(/\.(?!\w+$)/g, '_').replace(/\./g, '_')}`);
                  set(deneiVictoryHistoryRef, {
                    skillAbbrs: selectedPlayerSkills,
                    timestamp: Date.now(),
                    targetName: currentKenjuBattle.name,
                    targetMasterUid: masterUid
                  });
                }
              }
            } else {
              // 未登録ユーザーの場合は anonymousVictories に記録
              const visitorId = localStorage.getItem('shiden_visitor_id');
              if (visitorId) {
                const anonymousVictoryRef = ref(database, `anonymousVictories/${visitorId}/${saveKey}`);
                set(anonymousVictoryRef, selectedPlayerSkills);
              }
            }
          }
      }
    }
  }, [gameStarted, stageMode, battleResults, stageCycle, selectedPlayerSkills, logComplete, user, myProfile]);

  if (stageMode === 'LIFUKU') {
    return (
      <Lifuku
        onBack={() => { setStageMode('MID'); setIsTitle(true); }}
        getStorageUrl={getStorageUrl}
        user={user}
        onSaveScore={handleLifukuScore}
        onShowLounge={() => { setStageMode('LOUNGE'); setIsTitle(false); }}
      />
    );
  }

  if (stageMode === 'VERIFY_EMAIL') {
      return (
          <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
              <h1 style={{ color: '#4fc3f7' }}>メールアドレスの確認</h1>
              <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #4fc3f7', maxWidth: '500px' }}>
                  <p style={{ color: '#fff'}}>確認メールを送信しました。メール内のリンクをクリックして、アカウントを有効化してください。</p>
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '20px' }}>※認証完了後、再度ログインしてください。</p>
                  <button className="TitleButton neon-blue" onClick={() => handleSignOut()} style={{ marginTop: '20px' }}>タイトルへ戻る</button>
              </div>
          </div>
      );
  }

  if (['LOUNGE', 'MYPAGE', 'PROFILE', 'RANKING', 'DELETE_ACCOUNT', 'ADMIN_ANALYTICS'].includes(stageMode)) {
    const currentUid = auth.currentUser?.uid;
    const sortedProfiles = [...allProfiles].sort((a, b) => {
        if (currentUid) {
          if (a.uid === currentUid) return -1;
          if (b.uid === currentUid) return 1;
        }
        const timeA = a.lastActive || 0;
        const timeB = b.lastActive || 0;
        return timeB - timeA;
    });

    const pagedProfiles = sortedProfiles.slice((currentPage - 1) * 20, currentPage * 20);

    return (
      <Lounge
        user={user}
        myProfile={myProfile}
        allProfiles={pagedProfiles}
        lastActiveProfiles={lastActiveProfiles}
        kenjuBoss={kenjuBoss}
        kenjuClears={kenjuClears}
        kenjuTrials={kenjuTrials}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignUp={handleEmailSignUp}
        onEmailSignIn={handleEmailSignIn}
        onSignOut={handleSignOut}
        onUpdateProfile={handleUpdateProfile}
        onSaveKenju={handleSaveKenju}
        onKenjuBattle={handleKenjuBattle}
        onLikeDenei={handleLikeDenei}
	      kenjuBosses={KENJU_DATA.map(k => ({
          name: k.name,
          image: getStorageUrl(k.image),
          skills: k.skillAbbrs.split('').map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[]
        }))}


        onDeleteAccount={handleDeleteAccount}
        onBack={() => {
          setIsTitle(true);
          // タイトルに戻る際は、次に CONTINUE した時のために進行モードに戻しておく
          setStageMode(getLastGameMode());
          refreshKenju();
        }}
        onViewProfile={(p) => { setViewingProfile(p); setStageMode('PROFILE'); }}
        stageMode={stageMode as any}
        setStageMode={setStageMode}
        viewingProfile={viewingProfile}
        allSkills={ALL_SKILLS}
        getSkillByAbbr={getSkillByAbbr}
        allProfilesCount={allProfiles.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isAdmin={isAdmin}
        currentKenjuBattle={currentKenjuBattle as any}
        allDeneiStats={allDeneiStats}
        isDeneiStatsLoaded={isDeneiStatsLoaded}
        SkillCard={SkillCard}
        showUpdateNotify={showUpdateNotify}
        changelogData={changelogData}
        setShowUpdateNotify={setShowUpdateNotify}
        handleForceUpdate={handleForceUpdate}
      />
    );
  }

  if (isTitle) {
    if (!isAssetsLoaded) return <div className="TitleScreenContainer" style={{ backgroundColor: '#000' }} />;
    const hasSaveData = !!localStorage.getItem('shiden_stage_cycle');
    return (
      <div className="TitleScreenContainer" style={{ position: 'fixed', overflow: 'hidden' }}>
        {showUpdateNotify && (
          <div className="UpdateNotification" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(0, 210, 255, 0.2)',
            backdropFilter: 'blur(5px)',
            color: '#fff',
            padding: '10px 0',
            textAlign: 'center',
            zIndex: 1000,
            borderBottom: '1px solid #00d2ff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            animation: 'slideDown 0.5s ease-out'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>✨ アップデートされました！ページを更新してください。</span>
            <button
              onClick={handleForceUpdate}
              style={{
                padding: '5px 15px',
                background: '#00d2ff',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              今すぐ更新
            </button>
            <button
              onClick={() => setShowUpdateNotify(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        )}
        <div className="TitleBackgroundEffect"></div>
        <div className="TitleContent">
          <div className="TitleLogoWrapper"><img src={getStorageUrl('/images/title/titlelogo.png')} alt="紫電一閃" className="TitleLogo" /></div>
          {user && (
            <div style={{ marginBottom: '20px', color: '#ffd700', fontSize: '1.1rem', textShadow: '0 0 5px rgba(255, 215, 0, 0.5)' }}>
                ユーザ名: {myProfile?.displayName || "名もなき人"}
            </div>
          )}
          <div className="TitleMenu">
            <button className="TitleButton neon-blue" onClick={handleNewGame}>NEW GAME</button>
            <button className="TitleButton neon-gold" onClick={handleContinue} disabled={!hasSaveData}>CONTINUE</button>
            <button className="TitleButton neon-green" onClick={() => { setStageMode('LOUNGE'); setIsTitle(false); refreshKenju(); }} >LOUNGE</button>
            <button
              className="TitleButton neon-purple"
              onClick={() => {
                if (hasSaveData) {
                  setShowRule(true);
                } else {
                  setShowRuleHint(true);
                }
              }}
              style={{ opacity: hasSaveData ? 1 : 0.5, cursor: 'pointer' }}
            >
              RULE
            </button>
            <button className="TitleButton neon-blue" onClick={() => {
              const anonymousVictoriesRef = ref(database, 'anonymousVictories');
              get(anonymousVictoriesRef).then((snap) => {
                if (snap.exists()) {
                  setAnonymousVictories(snap.val());
                }
                setShowClearStats(true);
              }).catch(err => {
                console.warn("Anonymous victories fetch failed (possibly permission denied):", err);
                setShowClearStats(true);
              });
            }} style={{ borderStyle: 'dotted' }}>BATTLE STATS</button>
          </div>
          <div
            className="LifukuTab"
            onClick={() => { setStageMode('LIFUKU'); setIsTitle(false); }}
            style={{
              position: 'absolute',
              bottom: '40px', // 右下（更新履歴の近く）
              right: '0px',
              backgroundColor: '#f06292',
              padding: '8px 25px 8px 15px',
              borderRadius: '20px 0 0 20px',
              cursor: 'pointer',
              boxShadow: '-2px 2px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.3s ease, background-color 0.3s',
              zIndex: 100,
              border: '2px solid #fff',
              borderRight: 'none',
              animation: 'tabSlideIn 0.8s ease-out'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-15px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
          >
            {/* 実際のらいふくに近い形状の小さな個体 */}
            <div style={{
              width: '28px',
              height: '24px',
              backgroundColor: 'white',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', // 饅頭フォルム
              position: 'relative',
              border: '1px solid #333', // 少し細く
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxSizing: 'border-box'
            }}>
              {/* 目 - 位置とサイズを調整 */}
              <div style={{ position: 'absolute', top: '10px', left: '6px', width: '2px', height: '2px', backgroundColor: 'black', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', top: '10px', right: '6px', width: '2px', height: '2px', backgroundColor: 'black', borderRadius: '50%' }} />
              {/* 口 (ωを疑似再現) - 左右の曲線を隙間なく配置 */}
              <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', width: '9px', height: '3.5px', display: 'flex' }}>
                <div style={{ flex: 1, border: '0.8px solid black', borderTop: 'none', borderRadius: '0 0 4.5px 4.5px', boxSizing: 'border-box' }} />
                <div style={{ flex: 1, border: '0.8px solid black', borderTop: 'none', borderLeft: 'none', borderRadius: '0 0 4.5px 4.5px', boxSizing: 'border-box' }} />
              </div>
              {/* ほっぺ */}
              <div style={{ position: 'absolute', bottom: '5px', left: '2px', width: '4px', height: '4px', backgroundColor: 'rgba(255, 120, 120, 0.6)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: '5px', right: '2px', width: '4px', height: '4px', backgroundColor: 'rgba(255, 120, 120, 0.6)', borderRadius: '50%' }} />
            </div>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>らいふく</span>
          </div>
          <div className="TitleFooter">
            <div style={{ padding: '0px 0px 0px 15px', marginBottom: '5px', color: '#00d2ff', fontSize: '0.9rem' }}>{activeUsers}人がプレイ中です</div>
            <div style={{fontSize: '0.8rem'}}> © 2026 Shiden Games </div>
            {isAdmin && false &&(
              <button className="TitleButton neon-purple" onClick={() => { setStageMode('ADMIN_ANALYTICS'); setIsTitle(false); }} style={{ marginTop: '10px' }}>Admin Analytics</button>
            )}
            <div onDoubleClick={() => setShowAdmin(true)} style={{ position: 'fixed', bottom: 0, left: 0, width: '50px', height: '50px', opacity: 0 }} />
          </div>
        </div>
        
        <div className="ChangelogTab" onClick={() => setShowChangelog(true)}>
          <span>更新履歴</span>
        </div>

        {showChangelog && (
          <div className="ChangelogModalOverlay" onClick={() => setShowChangelog(false)}>
            <div className="ChangelogModal" onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader">
                <span>更新履歴</span>
                <button onClick={() => setShowChangelog(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent">
                {changelogData.length > 0 ? (
                  [...changelogData].reverse().map((item, index) => (
                    <div key={index} className="ChangelogItem">
                      <div className="ChangelogVersion" style={{ fontSize: '1.4rem', borderLeft: '4px solid #00d2ff', paddingLeft: '10px', marginBottom: '10px', fontWeight: 'bold', color: '#00d2ff' }}>{item.title}</div>
                      <div className="ChangelogDate" style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px' }}>{item.date}</div>
                      <div className="ChangelogText" style={{ whiteSpace: 'pre-wrap' }}>
                        {Array.isArray(item.content) ? item.content.join('\n') : item.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</div>
                )}
              </div>
              <button className="ChangelogCloseButton" onClick={() => setShowChangelog(false)}>閉じる</button>
            </div>
          </div>
        )}

        {showRuleHint && (
          <div className="ChangelogModalOverlay" onClick={() => setShowRuleHint(false)}>
            <div className="ChangelogModal" style={{ maxWidth: '440px', border: '2px solid #00d2ff' }} onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader" style={{ background: '#00d2ff' }}>
                <span style={{ color: '#000', fontWeight: 'bold' }}>ご安心ください</span>
                <button onClick={() => setShowRuleHint(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <p style={{ fontSize: '1.1rem', color: '#eee', lineHeight: '1.6', margin: 0 }}>
                  まずは<strong style={{ color: '#00d2ff' }}>NEW GAME</strong>でプレイしてみましょう！<br />
                  スキルを<strong style={{ color: '#ffd700' }}>5回ポチポチ</strong>すれば大丈夫です！
                </p>
              </div>
              <button className="ChangelogCloseButton" style={{ background: '#00d2ff', color: '#000', fontWeight: 'bold' }} onClick={() => setShowRuleHint(false)}>閉じる</button>
            </div>
          </div>
        )}

        {showClearStats && (
          <div className="ChangelogModalOverlay" onClick={() => setShowClearStats(false)}>
            <div className="ChangelogModal" style={{ maxWidth: '600px', border: '2px solid #ffd700' }} onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader" style={{ background: '#ffd700' }}>
                <span style={{ color: '#000', fontWeight: 'bold' }}>BATTLE STATS</span>
                <button onClick={() => setShowClearStats(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(stageNum => {
                    const bossKey = `BOSS_${stageNum}`;
                    // BOSSのみを集計
                    const registeredClears = allProfiles.filter(p => p.victorySkills && p.victorySkills[bossKey]).length;
                    const anonClears = Object.values(anonymousVictories).filter(v => v && v[bossKey]).length;
                    const totalClears = registeredClears + anonClears;

                    const allStageCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                      const bk = `BOSS_${n}`;
                      return allProfiles.filter(p => p.victorySkills && p.victorySkills[bk]).length +
                             Object.values(anonymousVictories).filter(v => v && v[bk]).length;
                    });
                    const maxClears = Math.max(...allStageCounts, 1);
                    const percentage = (totalClears / maxClears) * 100;

                    // 虹色の計算 (Stage 12: 赤(0), Stage 1: 紫(270))
                    const hue = (12 - stageNum) * (270 / 11);
                    const barColor = `hsl(${hue}, 80%, 60%)`;
                    
                    return (
                      <div key={stageNum} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '70px', textAlign: 'right', fontSize: '0.8rem', color: '#ffd700', whiteSpace: 'nowrap' }}>Stage {stageNum}</div>
                        <div style={{ flex: 1, height: '20px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: barColor,
                            transition: 'width 1s ease-out',
                            boxShadow: stageNum === 12 ? `0 0 10px ${barColor}` : 'none'
                          }} />
                          <div style={{ position: 'absolute', right: '10px', top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 'bold', textShadow: '1px 1px 2px #000' }}>
                            {totalClears}人
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '20px', fontSize: '0.75rem', color: '#888', textAlign: 'center' }}>
                  ※各ステージのBOSSを撃破した人数です
                </div>
              </div>
              <button className="ChangelogCloseButton" style={{ background: '#ffd700', color: '#000', fontWeight: 'bold' }} onClick={() => setShowClearStats(false)}>閉じる</button>
            </div>
          </div>
        )}

        {showRule && <Rule onClose={() => setShowRule(false)} />}
        {isAdmin && showAdmin && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#1a1a1a', border: '2px solid #ff5252', padding: '20px', borderRadius: '10px', zIndex: 10000 }}>
            <h2 style={{ color: '#ff5252' }}>管理者パネル</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                <button key={n} onClick={() => { setStageCycle(n); setStageMode('MID'); localStorage.setItem('shiden_stage_cycle', n.toString()); setIsTitle(false); setShowAdmin(false); }} style={{ padding: '10px' }}>Stage {n}</button>
              ))}
            </div>
            <button onClick={() => setShowAdmin(false)} style={{ width: '100%', marginTop: '10px' }}>閉じる</button>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="AppContainer" style={{ display: (isLoungeMode || showEpilogue) ? 'block' : 'flex', height: '100vh', color: '#eee', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
      {showEpilogue && (
        <div className="EpilogueContainer">
          <div className="EpilogueBackground"></div>
          <div className="EpilogueStars"></div>
          <div className="EpilogueContent">
            <h1 className="EpilogueTitle">エピローグ</h1>
            <div className="EpilogueText">
              {(epilogueContent || '').split('\n').map((line, idx) => (
                <span
                  key={idx}
                  className="EpilogueLine"
                  style={{
                    animationDelay: `${idx * 1.2}s`,
                    display: 'block',
                    width: '100%',
                    minHeight: line.trim() === '' ? '1.5rem' : 'auto'
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
            <div style={{
                opacity: 0,
                animation: 'epilogueFadeIn 3s forwards',
                animationDelay: `${((epilogueContent || '').split('\n').length + 2) * 1.2}s`,
                textAlign: 'center',
                marginTop: '100px',
                marginBottom: '100px'
            }}>
                <div style={{ fontSize: '3rem', color: '#ffd700', fontFamily: 'serif', letterSpacing: '0.5rem' }}>完</div>
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: '40px',
              opacity: 0,
              animation: 'epilogueFadeIn 2s forwards',
              animationDelay: `${((epilogueContent || '').split('\n').length + 5) * 1.2}s`
            }}>
              <button className="TitleButton neon-gold" onClick={() => { setShowEpilogue(false); setIsTitle(true); setStageMode('MID'); setStageCycle(12); localStorage.removeItem('shiden_stage_mode'); }}>タイトルへ戻る</button>
            </div>
          </div>
        </div>
      )}
      <div ref={mainGameAreaRef} className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', display: (isLoungeMode || showEpilogue) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => { handleResetGame();　setIsTitle(true); setKenjuBoss(null); localStorage.setItem('shiden_is_title', 'true');}} style={{ position: 'absolute', left: '10px', top: '10px', padding: '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', zIndex: 11 }}>TITLE</button>
          <h1 style={{ margin: '0 20px', color: (stageMode === 'MID' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#4fc3f7' : '#ff5252', fontSize: window.innerWidth < 600 ? '1.2rem' : '1.5rem', wordBreak: 'break-all' }}>
              {stageProcessor.getStageTitle(stageContext)}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.8rem' }}>{stageProcessor.getStageDescription(stageContext)}</p>
          <div style={{ position: 'absolute', right: '5px', top: '10px', display: 'flex', gap: '5px', zIndex: 11 }}>
            <button onClick={() => setShowRule(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '0px' }} title="ルール">📖</button>
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '2px' }} title="設定">⚙️</button>
          </div>
        </div>

        <div className={(gameStarted && isMobile && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI')) ? 'hidden-on-mobile-battle' : ''} style={{ position: 'relative', width: '100%', maxWidth: '800px', marginBottom: '20px', flexShrink: 0 }}>
          <div style={{
            width: '100%',
            height: stageProcessor.getBossImage(stageContext) ? '300px' : '240px',
            backgroundImage: `url(${(stageMode === 'KENJU' || stageMode === 'DENEI' ? getStorageUrl(currentKenjuBattle?.background || '') : (stageProcessor.getBackgroundImage(stageContext)) || '')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '10px',
            border: `2px solid ${(stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#ff5252' : '#4fc3f7'}`,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {stageProcessor.getBossImage(stageContext) && (!gameStarted || (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI')) && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: (stageCycle === 8 || stageCycle === 12) ? 'flex-start' : 'flex-end', zIndex: 1, overflow: stageCycle === 4 ? 'visible' : 'hidden' }}>
                <img
                  src={stageProcessor.getBossImage(stageContext) || ""}
                  alt=""
                  className="boss-battle-image"
                  style={{
                      ...stageProcessor.getBossImageStyle(stageContext, isMobile, 'back')
                  }}
                />
              </div>
            )}
            {!gameStarted && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') && (
              <div className="BossSkillPreview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.4)', boxSizing: 'border-box', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', backdropFilter: 'blur(2px)', paddingTop: '20px' }}>
                  <h2 style={{ color: '#ff5252', textAlign: 'center', margin: '0 0 5px 0', fontSize: '1rem', textShadow: '0 0 5px #000' }}>
                      {stageProcessor.getEnemyTitle?.({ ...stageContext, userName: currentKenjuBattle?.userName || myProfile?.displayName })}
                  </h2>
                  <div className="boss-skill-grid" style={{ transform: isMobile ? 'none' : ((stageMode === 'DENEI' || stageMode === 'KENJU' && kenjuBoss) || stageCycle === 4 || stageCycle === 10) ? 'scale(0.8)' : stageCycle === 9 ? 'scale(0.9)' : stageCycle === 11 || stageCycle === 12 ? 'scale(0.7)' : 'none', transformOrigin: 'center' }}>
                    {stageProcessor.getEnemySkills(0, stageContext).length > 0 ? (
                      stageProcessor.getEnemySkills(0, stageContext).map((skill, index) => <div key={index} className="boss-skill-card-wrapper"><SkillCard skill={skill} isSelected={false} disableTooltip={true} /></div>)
                    ) : (
                      <div style={{ color: '#ff5252', padding: '20px' }}>スキル未設定</div>
                    )}
                  </div>
              </div>
            )}
          </div>

          {selectedPlayerSkills.length > 0 && (
            <div className="SelectedSkillsPanel" ref={panelRef} style={{ position: (stageMode === 'MID' || (!gameStarted && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI'))) ? 'absolute' : 'relative', bottom: 0, left: 0, width: '100%', padding: '15px', background: (stageMode === 'MID' || !gameStarted) ? 'rgba(0, 0, 0, 0.5)' : '#121212', borderRadius: '10px', boxSizing: 'border-box', zIndex: 10, backdropFilter: (stageMode === 'MID' || !gameStarted) ? 'blur(5px)' : 'none' }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {lineCoords.map((coord, idx) => <line key={idx} x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffeb3b" strokeWidth="4" />)}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill, index) => <SkillCard key={index} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={connections.some(c => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)} isDimmed={dimmedIndices.includes(index)} onClick={gameStarted ? undefined : handleSelectedSkillClick} iconMode={iconMode} />)}</div>
            </div>
          )}
        </div>

        {(!gameStarted && stageVictorySkills[`${stageMode}_${stageCycle}`]?.length > 0) && (
          <div className="BossSkillPreview" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '10px 20px', border: `2px solid ${(stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#ff5252' : '#4fc3f7'}`, borderRadius: '10px', background: (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#2c0a0a' : '#0a1a2c', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#ffd700', textAlign: 'center', margin: '5px 0px 10px 0px', fontSize: '1rem' }}>戦いの記憶</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>{getSkillCardsFromAbbrs(stageVictorySkills[`${stageMode}_${stageCycle}`]).map((skill, idx) => <img key={idx} src={getStorageUrl(skill.icon)} alt="" style={{ width: '30px', border: '1px solid #ffd700', borderRadius: '4px' }} />)}</div>
          </div>
        )}
        {!gameStarted && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            {selectedPlayerSkills.length === PLAYER_SKILL_COUNT && (
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={handleStartGame} style={{ padding: '10px 60px', fontSize: '20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', boxShadow: '0 0 15px rgba(40, 167, 69, 0.5)', fontWeight: 'bold' }}>戦闘開始</button>
              </div>
            )}
            <div className="PlayerSkillSelection" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #333', borderRadius: '10px', background: '#121212' }}>
              <h2 style={{ padding: '10px', color: '#4fc3f7' }}>所持スキルから編成してください</h2>
              <div className="skill-card-grid">{(stageMode === 'KENJU' || stageMode === 'DENEI' ? ALL_SKILLS.filter(s => s.name !== "空白") : availablePlayerCards).map(skill => <SkillCard key={skill.abbr} skill={skill} isSelected={selectedPlayerSkills.includes(skill.abbr)} onClick={handlePlayerSkillSelectionClick} iconMode={iconMode} />)}</div>
            </div>
          </div>
        )}
        {gameStarted && (logComplete || stageMode === 'MID') && (
          <div className="ResultsOverview" style={{ marginTop: '0px', width: '100%', maxWidth: '800px' }}>
            {stageCycle === 11 && stageMode === 'MID' && winRateDisplay !== null && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '30px', background: '#000', border: '3px solid #ff5252', borderRadius: '15px', boxShadow: '0 0 20px rgba(255,82,82,0.5)' }}>
                <h2 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '1rem' }}>WIN RATE</h2>
                <div style={{ fontSize: '5rem', fontWeight: 'bold', color: winRateDisplay >= 80 ? '#66bb6a' : '#ff5252', textShadow: `0 0 15px ${winRateDisplay >= 80 ? '#66bb6a' : '#ff5252'}`, fontFamily: 'monospace' }}>
                  {winRateDisplay}%
                </div>
                {!stage11TrialActive && (
                  <div style={{ marginTop: '10px', fontSize: '1.5rem', fontWeight: 'bold', color: winRateDisplay >= 80 ? '#66bb6a' : '#ff5252' }}>
                    {winRateDisplay >= 80 ? 'SUCCESS - TARGET REACHED' : 'FAILED - 80% REQUIRED'}
                  </div>
                )}
              </div>
            )}
            {rewardSelectionMode && (
              <div className="RewardSelection" style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#1a1a00', border: '2px solid #ffd700', borderRadius: '10px' }}>
                <h2 style={{ color: '#ffd700', margin: '0 0 15px 0' }}>{(stageCycle === 11 && stageMode === 'MID' && canGoToBoss) ? '関門を突破！！' : battleResults.every(r => r.winner === 1) ? '全員倒した！' : '修行するぞ！'}<br />スキルを1つ選んでください</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>{getAvailableSkillsUntilStage(stageCycle).map(skill => { if (ownedSkillAbbrs.includes(skill.abbr)) return null; return <div key={skill.abbr} onClick={() => handleRewardSelection(skill.abbr)} style={{ cursor: 'pointer' }}><SkillCard skill={skill} isSelected={selectedRewards.includes(skill.abbr)} iconMode={iconMode} /></div>; })}</div>
                <button disabled={selectedRewards.length === 0} onClick={confirmRewards} style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>スキルを獲得する</button>
                <div style={{ marginTop: '15px' }}><button onClick={() => { setSelectedRewards([]); setRewardSelectionMode(false); if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle(); }} style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>報酬を受け取らない</button></div>
              </div>
            )}
            {(canGoToBoss && (stageMode === 'MID' || showBossClearPanel)) && !rewardSelectionMode && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>{ (stageMode === 'KENJU' || stageMode === 'DENEI') ? <>{currentKenjuBattle?.name || kenjuBoss?.name}撃破！<br />おめでとうございます！！</> : (stageMode === 'MID' ? 'ボスへの道が開かれた！' : <>{stageProcessor.getEnemyName(0, stageContext)}撃破！<br />素晴らしいです！！</>)}</h2>
                <button onClick={stageMode === 'MID' ? goToBossStage : clearBossAndNextCycle} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>{(stageMode === 'KENJU' || stageMode === 'DENEI') ? 'ラウンジへ戻る' : (stageMode === 'MID' ? 'ボスステージへ進む' : '次のステージへ進む')}</button>
              </div>
            )}
            {battleResults.length > 0 && !rewardSelectionMode && !showBossClearPanel &&
              ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? (battleResults[0]?.winner === 2 && logComplete) :
               (stageCycle != 11 && (battleResults.some(r => r.winner === 2)) || (stageMode === 'MID' && !canGoToBoss))) && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                {!stage11TrialActive && (
                  <>
                    <div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>{battleResults.every(r => r.winner === 2) ? "次こそは！" : "再挑戦しましょう。"}</div>
                    <button onClick={handleResetGame} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>再挑戦</button>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{battleResults.map((battle, index) => <div key={index} onClick={() => setShowLogForBattleIndex(index)} style={{ padding: '10px', border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#444'}`, borderRadius: '5px', backgroundColor: '#1e1e1e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><span style={{ marginRight: '10px', fontWeight: 'bold', color: battle.winner === 1 ? '#66bb6a' : '#ef5350' }}>{battle.resultText}</span><div style={{ display: 'flex', gap: '5px' }}>{battle.computerSkills.map((s, si) => <img key={si} src={getStorageUrl(s.icon)} alt="" style={{ width: '30px', height: '30px' }} />)}</div></div>)}</div>
          </div>
        )}
      </div>
      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', overflowY: 'auto', borderLeft: '1px solid #333', visibility: isLoungeMode ? 'hidden' : 'visible', display: isLoungeMode ? 'none' : 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#61dafb' }}>
            {storyContent && !gameStarted ? 'ストーリー' :
             ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI' || stageMode === 'DELETE_ACCOUNT') && !logComplete ? 'BOSS' : 'ゲームログ')}
        </h2>
        {(stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button
              onClick={() => setUseRichLog(!useRichLog)}
              style={{
                padding: '5px 10px',
                fontSize: '0.7rem',
                backgroundColor: useRichLog ? '#2e7d32' : '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {useRichLog ? 'アニメーション表示中' : 'テキスト表示中'}
            </button>
          </div>
        )}
        {showLogForBattleIndex !== -1 && battleResults[showLogForBattleIndex] ? (
          ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI')  && useRichLog) ? <AnimatedRichLog
            log={battleResults[showLogForBattleIndex].gameLog}
            onComplete={() => {
              //setLogComplete(true);
              handleBattleLogComplete();
              // ボス戦または剣獣戦で勝利した場合のみ、紙吹雪とボス撃破パネルを表示
              const winCount = battleResults.filter(r => r.winner === 1).length;
              const isVictory = (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? winCount >= 1 : winCount === 10;
              if (isVictory && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI')) {
                  triggerVictoryConfetti();
                  if (stageMode === 'BOSS') {
                      setShowBossClearPanel(true);
                      // Stage12のボス勝利で「クリアしたよ！」の称号
                      if (stageCycle === 12 && user && myProfile && !(myProfile.medals || []).includes('master')) {
                          const profileRef = ref(database, `profiles/${user.uid}/`);
                          const newMedals = [...(myProfile.medals || []), 'master'];
                          set(profileRef, { ...myProfile, medals: newMedals, lastActive: Date.now() });
                      }
                  } else if (stageMode === 'DENEI') {
                      setShowBossClearPanel(true);
                  }

                  if (stageMode === 'KENJU' && kenjuBoss && user && myProfile) {
                      const targetBossName = kenjuBoss.name;
                      const kenjuConfig = KENJU_DATA.find(k => k.name === targetBossName);
                      if (kenjuConfig && (kenjuConfig as any).medalId) {
                          const medalId = (kenjuConfig as any).medalId;
                          if (!(myProfile.medals || []).includes(medalId)) {
                              const profileRef = ref(database, `profiles/${user.uid}/`);
                              const newMedals = [...(myProfile.medals || []), medalId];
                              set(profileRef, { ...myProfile, medals: newMedals, lastActive: Date.now() });
                              console.log(`[Medal] Awarded ${medalId} for defeating ${targetBossName}`);
                          }
                      }
                  }
              }
            }}
            bossImage={(() => {
              const bossImage = stageProcessor.getBossImage(stageContext);
              return bossImage || "";
            })()}
            bossName={stageProcessor.getEnemyName(0, stageContext)}
            battleInstance={battleResults[showLogForBattleIndex].battleInstance}
            key={`animated-log-${showLogForBattleIndex}-${battleResults[showLogForBattleIndex].gameLog.length}`}
            battleStageCycle={(stageMode === 'KENJU' || stageMode === 'DENEI') ? 11 : stageCycle}
            processor={stageProcessor}
            stageMode={stageMode}
            stageContext={stageContext}
            getStorageUrl={getStorageUrl}
          /> : <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{battleResults[showLogForBattleIndex].gameLog}</pre>{(['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) && !logComplete && <button onClick={handleBattleLogComplete} style={{ marginTop: '10px', padding: '5px 15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>結果を確認</button>}</div>
        ) :
        
        (storyContent && !gameStarted ? 
        
        <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>{storyContent}</pre>
          </div> :
          ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ?
           <div style={{ textAlign: 'center' }}>
            <img src={(() => {
              const bossImage = stageProcessor.getBossImage(stageContext);
              return bossImage || "";
            })()} alt="" style={stageProcessor.getBossImageStyle(stageContext, isMobile, 'sidebar')} />
            <h3>{stageProcessor.getEnemyName(0, stageContext)}</h3>
            <p>{stageProcessor.getBossDescription(stageContext)}</p></div> : "ログがありません。"))}
      </div>
      {showRule && <Rule onClose={() => setShowRule(false)} />}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#1a1a1a', border: '2px solid #fff', padding: '30px', borderRadius: '10px', width: '400px', maxWidth: '90%', textAlign: 'center' }}>
            <h2 style={{ padding: '0px', color: '#4fc3f7' }}>設定</h2>
            <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
              <h3 style={{ textAlign: 'left', color: '#4fc3f7', marginBottom: '20px' }}>アイコン</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setIconMode('ORIGINAL')} style={{ padding: '10px', background: iconMode === 'ORIGINAL' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>通常アイコン</button>
                <button onClick={() => setIconMode('ABBR')} style={{ padding: '10px', background: iconMode === 'ABBR' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>スキルの略字</button>
                <button onClick={() => setIconMode('PHONE')} style={{ padding: '10px', background: iconMode === 'PHONE' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>電話番号風</button>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} style={{ padding: '10px 30px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
