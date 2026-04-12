import React from 'react';
import SkillCard from './components/SkillCard';
import AnimatedRichLog from './components/AnimatedRichLog';
import Kamishibai from './components/Kamishibai';
import { GameProps, BattleResult } from './types/GameProps';
import { StageMode } from './components/AnimatedRichLog';
import { getAvailableSkillsUntilStage } from './stageData';
import { SkillDetail } from './skillsData';

const GameChapter1: React.FC<GameProps> = (props) => {
  const {
    stageCycle,
    setStageCycle,
    stageMode,
    gameStarted,
    battleResults,
    showLogForBattleIndex,
    setShowLogForBattleIndex,
    logComplete,
    useRichLog,
    setUseRichLog,
    stageProcessor,
    stageContext,
    isMobile,
    isLoungeMode,
    showEpilogue,
    setShowEpilogue,
    handleResetGame,
    handleStartGame,
    handleBattleLogComplete,
    triggerVictoryConfetti,
    getStorageUrl,
    selectedPlayerSkills,
    handleSelectedSkillClick,
    availablePlayerCards,
    handlePlayerSkillSelectionClick,
    storyContent,
    storyContentV2,
    canGoToBoss,
    showBossClearPanel,
    rewardSelectionMode,
    setRewardSelectionMode,
    selectedRewards,
    setSelectedRewards,
    handleRewardSelection,
    confirmRewards,
    clearBossAndNextCycle,
    goToBossStage,
    iconMode,
    panelRef,
    mainGameAreaRef,
    connections,
    dimmedIndices,
    lineCoords,
    kenjuBoss,
    currentKenjuBattle,
    setKenjuBoss,
    setIsTitle,
    setShowRule,
    setShowSettings,
    getSkillCardsFromAbbrs,
    winRateDisplay,
    stage11TrialActive,
    stageVictorySkills,
    PLAYER_SKILL_COUNT,
    ALL_SKILLS,
    user,
    myProfile,
    setShowBossClearPanel,
    ownedSkillAbbrs,
    showStage1Tutorial,
    setShowStage1Tutorial,
    epilogueContent,
    backToTitle
  } = props;

  // 敵のスキル数に応じたスケール計算
  const enemySkills = React.useMemo(() => stageProcessor.getEnemySkills(0, stageContext), [stageProcessor, stageContext]);
  const skillCount = enemySkills.length;
  const bossSkillScale = isMobile ? 'none' : 
                         skillCount === 7 ? 'scale(0.9)' :
                         skillCount === 8 ? 'scale(0.8)' :
                         skillCount >= 9 ? 'scale(0.7)' : 'none';

  return (
    <div className="AppContainer"
    style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      width: '100%', 
      height: isMobile ? 'auto' : '100dvh', 
      backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>

{showStage1Tutorial && (
        <div className="ChangelogModalOverlay" style={{ zIndex: 20000 }} onClick={() => setShowStage1Tutorial(false)}>
          <div className="ChangelogModal" style={{ maxWidth: '480px', border: '2px solid #00d2ff' }} onClick={(e) => e.stopPropagation()}>
            <div className="ChangelogHeader" style={{ background: '#00d2ff' }}>
              <span style={{ color: '#000', fontWeight: 'bold' }}>おめでとうございます！</span>
              <button onClick={() => setShowStage1Tutorial(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div className="ChangelogContent" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ fontSize: '1.1rem', color: '#eee', lineHeight: '1.6', margin: 0, textAlign: 'left' }}>
                このゲームは、こんな風にスキルを5つ編成して相手のスキルを全て破壊するゲームです。<br /><br />
                左上の📖のアイコンから、ルールを確認することができます。<br /><br />
                ゲームログをじっくり読むと、何かが掴めるかも？<br /><br />
                ステージに勝っても負けても、報酬としてスキルを得ることができます。<br />
                （過去のステージのスキルももらえるので安心！）<br /><br />
                それでは、『紫電一閃』の世界をお楽しみください。
              </p>
            </div>
            <button className="ChangelogCloseButton" style={{ background: '#00d2ff', color: '#000', fontWeight: 'bold' }} onClick={() => setShowStage1Tutorial(false)}>閉じる</button>
          </div>
        </div>
      )}
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
              <button className="TitleButton neon-gold" onClick={() => { setShowEpilogue(false); backToTitle(); setStageCycle(12); localStorage.removeItem('shiden_stage_mode'); }}>タイトルへ戻る</button>
            </div>
          </div>
        </div>
      )}

      <div ref={mainGameAreaRef} className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', display: (isLoungeMode || showEpilogue) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)', position: 'relative', color: '#eee' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => { handleResetGame(); setIsTitle(true); setKenjuBoss(null); localStorage.setItem('shiden_is_title', 'true');}} style={{ position: 'absolute', left: '10px', top: '10px', padding: '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', zIndex: 11 }}>TITLE</button>
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
              <div className="BossSkillPreview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.4)', boxSizing: 'border-box', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', backdropFilter: 'blur(2px)', paddingTop: '20px', overflow: 'visible' }}>
                  <h2 style={{ color: '#ff5252', textAlign: 'center', margin: '0 0 5px 0', fontSize: '1rem', textShadow: '0 0 5px #000' }}>
                      {stageProcessor.getEnemyTitle?.({ ...stageContext, userName: currentKenjuBattle?.userName || myProfile?.displayName })}
                  </h2>
                  <div className="boss-skill-grid" style={{ transform: bossSkillScale, transformOrigin: 'center' }}>
                    {enemySkills.length > 0 ? (
                      enemySkills.map((skill: SkillDetail, index: number) => <div key={index} className="boss-skill-card-wrapper"><SkillCard skill={skill} isSelected={false} disableTooltip={false} /></div>)
                    ) : (
                      <div style={{ color: '#ff5252', padding: '20px' }}>スキル未設定</div>
                    )}
                  </div>
              </div>
            )}
          </div>

          {selectedPlayerSkills.length > 0 && (
            <div className="SelectedSkillsPanel" ref={panelRef} style={{ position: (stageMode === 'MID' || (!gameStarted && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI'))) ? 'absolute' : 'relative', bottom: 0, left: 0, width: '100%', padding: '15px', background: (stageMode === 'MID' || !gameStarted) ? 'rgba(0, 0, 0, 0.5)' : '#121212', borderRadius: '10px', boxSizing: 'border-box', zIndex: 5, backdropFilter: (stageMode === 'MID' || !gameStarted) ? 'blur(5px)' : 'none' }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {lineCoords.map((coord: { x1: number; y1: number; x2: number; y2: number }, idx: number) => <line key={idx} x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffeb3b" strokeWidth="4" />)}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill: SkillDetail, index: number) => <SkillCard key={index} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={connections.some((c: { fromId: string; toId: string }) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)} isDimmed={dimmedIndices.includes(index)} onClick={gameStarted ? undefined : handleSelectedSkillClick} iconMode={iconMode} />)}</div>
            </div>
          )}
        </div>

        {(!gameStarted && stageVictorySkills[`${stageMode}_${stageCycle}`]?.length > 0) && (
          <div className="BossSkillPreview" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '10px 20px', border: `2px solid ${(stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#ff5252' : '#4fc3f7'}`, borderRadius: '10px', background: (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#2c0a0a' : '#0a1a2c', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#ffd700', textAlign: 'center', margin: '5px 0px 10px 0px', fontSize: '1rem' }}>戦いの記憶</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>{getSkillCardsFromAbbrs(stageVictorySkills[`${stageMode}_${stageCycle}`]).map((skill: SkillDetail, idx: number) => <img key={idx} src={getStorageUrl(skill.icon)} alt="" style={{ width: '30px', border: '1px solid #ffd700', borderRadius: '4px' }} />)}</div>
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
              <div className="skill-card-grid">{(stageMode === 'KENJU' || stageMode === 'DENEI' ? ALL_SKILLS.filter(s => s.name !== "空白") : availablePlayerCards).map((skill: SkillDetail) => <SkillCard key={skill.abbr} skill={skill} isSelected={selectedPlayerSkills.includes(skill.abbr)} onClick={handlePlayerSkillSelectionClick} iconMode={iconMode} />)}</div>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                  {getAvailableSkillsUntilStage(stageCycle).map((skill: SkillDetail) => { if (ownedSkillAbbrs.includes(skill.abbr)) return null; return <div key={skill.abbr} onClick={() => handleRewardSelection(skill.abbr)} style={{ cursor: 'pointer' }}><SkillCard skill={skill} isSelected={selectedRewards.includes(skill.abbr)} iconMode={iconMode} /></div>; })}
                </div>
                <button disabled={selectedRewards.length === 0} onClick={confirmRewards} style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>スキルを獲得する</button>
                <div style={{ marginTop: '15px' }}><button onClick={() => { 
                    setSelectedRewards([]); 
                    setRewardSelectionMode(false); 
                    if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle(); 
                }} style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>報酬を受け取らない</button></div>
              </div>
            )}
            {(canGoToBoss && (stageMode === 'MID' || showBossClearPanel)) && !rewardSelectionMode && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>{ (stageMode === 'KENJU' || stageMode === 'DENEI') ? <>{currentKenjuBattle?.name || kenjuBoss?.name}撃破！<br />おめでとうございます！！</> : (stageMode === 'MID' ? 'ボスへの道が開かれた！' : <>{stageProcessor.getEnemyName(0, stageContext)}撃破！<br />素晴らしいです！！</>)}</h2>
                <button onClick={() => {
                  if (stageMode === 'MID') {
                    // 第1章ではシンプルにボスへ進む
                    goToBossStage();
                  } else {
                    clearBossAndNextCycle();
                  }
                }} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {(stageMode === 'KENJU' || stageMode === 'DENEI') ? 'ラウンジへ戻る' : (stageMode === 'MID' ? 'ボスステージへ進む' : '次のステージへ進む')}
                </button>
              </div>
            )}
            {battleResults.length > 0 && !rewardSelectionMode && !showBossClearPanel &&
              ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ? (battleResults[0]?.winner === 2 && logComplete) :
               (stageCycle != 11 && (battleResults.some(r => r.winner === 2)) || (stageMode === 'MID' && !canGoToBoss))) && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                {!stage11TrialActive && (
                  <>
                    <div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>{battleResults.every((r: BattleResult) => r.winner === 2) ? "次こそは！" : "再挑戦しましょう。"}</div>
                    <button onClick={handleResetGame} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>再挑戦</button>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{battleResults.map((battle: BattleResult, index: number) => <div key={index} onClick={() => setShowLogForBattleIndex(index)} style={{ padding: '10px', border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#444'}`, borderRadius: '5px', backgroundColor: '#1e1e1e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><span style={{ marginRight: '10px', fontWeight: 'bold', color: battle.winner === 1 ? '#66bb6a' : '#ef5350' }}>{battle.resultText}</span><div style={{ display: 'flex', gap: '5px' }}>{battle.computerSkills.map((s: SkillDetail, si: number) => <img key={si} src={getStorageUrl(s.icon)} alt="" style={{ width: '30px', height: '30px' }} />)}</div></div>)}</div>
          </div>
        )}
      </div>
      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', overflow: 'hidden', borderLeft: '1px solid #333', visibility: isLoungeMode ? 'hidden' : 'visible', display: isLoungeMode ? 'none' : 'flex', flexDirection: 'column', color: '#eee' }}>
        <h2 style={{ color: '#61dafb' }}>
            {(storyContent || (storyContentV2 && !stageCycle /* STAGE_DATA logic simplified */)) && !gameStarted ? 'ストーリー' :
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
        
        ((storyContent || (storyContentV2 /* simplified condition */)) && !gameStarted ?
        
        <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
          {storyContent ? (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>{storyContent}</pre>
          ) : (
              storyContentV2 && (
                  <Kamishibai
                      script={storyContentV2}
                      onEnd={() => {
                          // setShowStoryModal(false); // GameChapter1 uses Kamishibai in sidebar for Chapter 1
                          // setGameStarted(false);
                      }}
                  />
              )
          )}
          </div> :
          ((stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI') ?
           <div style={{ textAlign: 'center' }}>
            <img src={(() => {
              const bossImage = stageProcessor.getBossImage(stageContext);
              return bossImage || "";
            })()} alt="" style={stageProcessor.getBossImageStyle(stageContext, isMobile, 'sidebar')} />
            <h3>{stageProcessor.getEnemyName(0, stageContext)}</h3>
            <p style={{ textAlign: 'left', whiteSpace: 'pre-wrap', padding: '0 10px' }}>
              {stageProcessor.getBossDescription(stageContext).replace(/\\n/g, '\n')}
            </p></div> : "ログがありません。"))}
      </div>
    </div>
  );
};

export default GameChapter1;
