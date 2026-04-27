import React, { useState, useEffect, useRef } from 'react';
import { StageProcessor } from '../stageData';

export type StageMode = 'MID' | 'BOSS' | 'LOUNGE' | 'MYPAGE' | 'PROFILE' | 'RANKING' | 'KENJU' | 'DENEI' | 'VERIFY_EMAIL' | 'DELETE_ACCOUNT' | 'ADMIN_ANALYTICS' | 'LIFUKU';

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDestroyedSkillIndex = (line: string, name: string): number | null => {
    const escapedName = escapeRegExp(name);
    const m = line.match(new RegExp(`${escapedName}の【.*?】(\\d+).*破壊された`));
    return m ? parseInt(m[1], 10) - 1 : null;
};

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
    const playerName = battleInstance?.pc1?.playerName || 'あなた';
    
    useEffect(() => {
        if (!roundFinished[currentRoundIdx]) {
            const currentLineIdx = roundVisibleCounts[currentRoundIdx];
            if (currentLineIdx < currentRoundLines.length) {
                const line = currentRoundLines[currentLineIdx];
                if (line.includes('破壊された')) {
                    if (line.includes(`${playerName}の`)) {
                      const idx = getDestroyedSkillIndex(line, playerName);
                      if (idx !== null) setCurrentPc1Scar(prev => { const next = [...prev]; next[idx] = 1; return next; });
                    } else if (bossName && line.includes(`${bossName}の`)) {
                      const idx = getDestroyedSkillIndex(line, bossName);
                      if (idx !== null) setCurrentPc2Scar(prev => { const next = [...prev]; next[idx] = 1; return next; });
                    }
                }
                if (line.includes('リミテッド') && line.includes('破壊された')) {
                    if (line.includes(`${playerName}の`)) {
                        const idx = getDestroyedSkillIndex(line, playerName);
                        if (idx !== null) setCurrentPc1Scar(prev => { const next = [...prev]; next[idx] = 1; return next; });
                    } else if (bossName && line.includes(`${bossName}の`)) {
                        const idx = getDestroyedSkillIndex(line, bossName);
                        if (idx !== null) setCurrentPc2Scar(prev => { const next = [...prev]; next[idx] = 1; return next; });
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
    }, [roundVisibleCounts, currentRoundIdx, bossName, currentRoundLines, roundFinished, playerName]);

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
                if (line.includes(`${playerName}の`)) { const idx = getDestroyedSkillIndex(line, playerName); if (idx !== null) newPc1Scar[idx] = 1; }
                else if (bossName && line.includes(`${bossName}の`)) {
                    const idx = getDestroyedSkillIndex(line, bossName);
                    if (idx !== null) newPc2Scar[idx] = 1;
                }
            }
            if (line.includes('リミテッド') && line.includes('破壊された')) {
                if (line.includes(`${playerName}の`)) { const idx = getDestroyedSkillIndex(line, playerName); if (idx !== null) newPc1Scar[idx] = 1; }
                else if (bossName && line.includes(`${bossName}の`)) {
                    const idx = getDestroyedSkillIndex(line, bossName);
                    if (idx !== null) newPc2Scar[idx] = 1;
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
        onComplete();
      }
    };
    const goBack = () => { if (currentRoundIdx > 0) setCurrentRoundIdx(prev => prev - 1); };
    
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
            {/* <style>{`
              .rich-log-modern::-webkit-scrollbar {
                display: none;
              }
            `}</style> */}
          </div>
        )}
        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,50,0.9)', borderTop: '2px solid #fff', padding: '10px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? '400px' : 0, height: isMobile ? '400px' : '1px', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0 }}>
            <button disabled={currentRoundIdx === 0} onClick={goBack} style={{ background: '#000', color: '#fff', border: '1px solid #fff' }}>{'<'}</button>
            <button disabled={roundFinished[currentRoundIdx] && currentRoundIdx === rounds.length - 1} onClick={goNext} style={{ background: '#000', color: '#fff', border: '1px solid #fff' }}>{!roundFinished[currentRoundIdx] ? 'SKIP' : '>'}</button>
          </div>
          <div ref={scrollRef} className="rich-log-modern" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', minHeight: 0, boxSizing: 'border-box' }}>

          {/* <div ref={scrollRef} className="rich-log-modern" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none', scrollbarGutter: 'stable', WebkitOverflowScrolling: 'touch', minHeight: 0, boxSizing: 'border-box' }}> */}
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
                      <span
                        className="battle-start-enemy-name"
                        style={{
                          fontSize: p2.trim().length > 10 ? '1.2rem' : '1.8rem',
                          fontWeight: 'bold',
                          color: '#ff5252',
                          textShadow: '0 0 10px rgba(255,255,255,0.5)',
                          wordBreak: 'break-all',
                          whiteSpace: isMobile ? 'pre-line' : 'nowrap',
                          overflowWrap: 'anywhere',
                          lineHeight: isMobile ? 1.2 : 1,
                          textAlign: 'center',
                          maxWidth: isMobile ? 'min(180px, 42vw)' : 'none'
                        }}
                      >
                        {p2.trim()}
                      </span>
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

export default AnimatedRichLog;
