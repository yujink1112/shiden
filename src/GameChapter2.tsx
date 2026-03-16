import React from 'react';
import SkillCard from './components/SkillCard';
import AnimatedRichLog from './components/AnimatedRichLog';
import StoryCanvas from './components/StoryCanvas';
import { GameProps, BattleResult } from './types/GameProps';
import { StageMode } from './components/AnimatedRichLog';
import { getAvailableSkillsUntilStage } from './stageData';
import { SkillDetail } from './skillsData';

const GameChapter2: React.FC<GameProps> = (props) => {
  const {
    stageCycle,
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
    handleResetGame,
    handleStartGame,
    handleBattleLogComplete,
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
    setGameStarted,
    setShowStoryModal,
    showStoryModal,
    isAdmin,
    showAdmin,
    chapter2SubStage,
    chapter2FlowIndex,
    chapter2Flows,
    moveToNextStep
  } = props;

  // 第2章のステージかどうかを判定
  const isChapter2 = React.useMemo(() => {
     return !!chapter2Flows.find(f => f.stageNo === stageCycle);
  }, [chapter2Flows, stageCycle]);

  // 第2章の現在のステップ
  const currentStep = React.useMemo(() => {
    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    return flow?.flow[chapter2FlowIndex] || null;
  }, [chapter2Flows, stageCycle, chapter2FlowIndex]);

  // 第2章の報酬選択（flow type が reward の場合）
  const isChapter2Reward = isChapter2 && currentStep?.type === 'reward';

  // 報酬選択の表示判定を上書き
  const showRewardSelection = rewardSelectionMode || isChapter2Reward;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100%', overflow: 'hidden' }}>
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
                  <div className="boss-skill-grid" style={{ transform: isMobile ? 'none' : ((stageMode === 'DENEI' || stageMode === 'KENJU' && kenjuBoss) || stageCycle === 4 || stageCycle === 10) ? 'scale(0.8)' : stageCycle === 9 ? 'scale(0.9)' : stageCycle === 11 || stageCycle === 12 ? 'scale(0.7)' : 'none', transformOrigin: 'center' }}>
                    {stageProcessor.getEnemySkills(0, stageContext).length > 0 ? (
                      stageProcessor.getEnemySkills(0, stageContext).map((skill: SkillDetail, index: number) => <div key={index} className="boss-skill-card-wrapper"><SkillCard skill={skill} isSelected={false} disableTooltip={false} /></div>)
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
            {showRewardSelection && (
              <div className="RewardSelection" style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#1a1a00', border: '2px solid #ffd700', borderRadius: '10px' }}>
                <h2 style={{ color: '#ffd700', margin: '0 0 15px 0' }}>
                  {(stageCycle === 11 && stageMode === 'MID' && canGoToBoss) ? '関門を突破！！' : 
                   (isChapter2 || stageMode === 'BOSS') ? (battleResults.length > 0 && battleResults.every(r => r.winner === 1) ? '撃破！！' : '敗北……') :
                   (battleResults.length > 0 && battleResults.every(r => r.winner === 1)) ? '全員倒した！' : '修行するぞ！'}<br />
                  {currentStep?.skill ? '新しいスキルを獲得しました！' :
                   currentStep?.choices ? 'どちらかのスキルを選んでください' :
                   isChapter2Reward ? `スキルを${currentStep?.count || 1}つ選んでください` : 'スキルを1つ選んでください'}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                  {currentStep?.skill ? (
                    <div style={{ transform: 'scale(1.2)', margin: '20px 0' }}>
                      <SkillCard skill={getSkillCardsFromAbbrs([currentStep.skill])[0]} isSelected={true} iconMode={iconMode} />
                    </div>
                  ) : currentStep?.choices ? (
                    currentStep.choices.map((abbr: string) => {
                      const skill = getSkillCardsFromAbbrs([abbr])[0];
                      if (!skill) return null;
                      return (
                        <div key={abbr} onClick={() => handleRewardSelection(abbr)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} className={selectedRewards.includes(abbr) ? 'selected-reward-card' : ''}>
                          <SkillCard skill={skill} isSelected={selectedRewards.includes(abbr)} iconMode={iconMode} />
                        </div>
                      );
                    })
                  ) : (
                    getAvailableSkillsUntilStage(stageCycle).map((skill: SkillDetail) => {
                      if (ownedSkillAbbrs.includes(skill.abbr)) return null;
                      return (
                        <div key={skill.abbr} onClick={() => handleRewardSelection(skill.abbr)} style={{ cursor: 'pointer' }}>
                          <SkillCard skill={skill} isSelected={selectedRewards.includes(skill.abbr)} iconMode={iconMode} />
                        </div>
                      );
                    })
                  )}
                </div>
                <button 
                  disabled={
                    currentStep?.skill ? false :
                    currentStep?.choices ? selectedRewards.length !== 1 :
                    isChapter2Reward ? selectedRewards.length !== (currentStep?.count || 1) : 
                    selectedRewards.length === 0
                  } 
                  onClick={() => {
                    if (currentStep?.skill) {
                      // 単一スキルの場合は自動的にそれを報酬として渡す
                      handleRewardSelection(currentStep.skill);
                      // handleRewardSelection は state 更新なので、直後に confirmRewards を呼ぶために
                      // selectedRewards を直接使うのではなく、confirmRewards 側で考慮するか、
                      // あるいはここで selectedRewards にセットされるのを待つ必要がある。
                      // App.tsx の confirmRewards を修正して、引数で渡せるようにするか、
                      // あるいは currentStep を参照するようにする。
                      // ここではひとまず既存の confirmRewards を呼ぶ。
                    }
                    confirmRewards();
                  }} 
                  style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', opacity: (currentStep?.skill ? false : currentStep?.choices ? selectedRewards.length !== 1 : isChapter2Reward ? selectedRewards.length !== (currentStep?.count || 1) : selectedRewards.length === 0) ? 0.5 : 1 }}
                >
                  {currentStep?.skill ? '確認' : 'スキルを獲得する'}
                </button>
                <div style={{ marginTop: '15px' }}>
                    {!isChapter2Reward && (
                        <button onClick={() => { 
                            setSelectedRewards([]); 
                            setRewardSelectionMode(false); 
                            if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle(); 
                        }} style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>報酬を受け取らない</button>
                    )}
                </div>
              </div>
            )}
            {(canGoToBoss && (stageMode === 'MID' || showBossClearPanel)) && !showRewardSelection && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>
                  { (stageMode === 'KENJU' || stageMode === 'DENEI') ? <>{currentKenjuBattle?.name || kenjuBoss?.name}撃破！<br />おめでとうございます！！</> : 
                    (isChapter2 || stageMode === 'BOSS') ? <>{stageProcessor.getEnemyName(0, stageContext)}撃破！<br />素晴らしいです！！</> :
                    (stageMode === 'MID' ? 'ボスへの道が開かれた！' : <>{stageProcessor.getEnemyName(0, stageContext)}撃破！<br />素晴らしいです！！</>)}
                </h2>
                <button onClick={() => {
                  if (stageMode === 'MID') {
                    // 第2章では中間ステージクリアも次のサイクルへ（あるいはボスへ）
                    // 実際には App.tsx の clearBossAndNextCycle 内でロードロジックが走る
                     clearBossAndNextCycle();
                  } else {
                    clearBossAndNextCycle();
                  }
                }} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {(stageMode === 'KENJU' || stageMode === 'DENEI') ? 'ラウンジへ戻る' : 
                   (isChapter2) ? '次へ進む' :
                   (stageMode === 'MID' ? 'ボスステージへ進む' : '次のステージへ進む')}
                </button>
              </div>
            )}
            {battleResults.length > 0 && !showRewardSelection && !showBossClearPanel &&
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
      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', overflowY: 'auto', borderLeft: '1px solid #333', visibility: isLoungeMode ? 'hidden' : 'visible', display: isLoungeMode ? 'none' : 'flex', flexDirection: 'column', color: '#eee' }}>
        <h2 style={{ color: '#61dafb' }}>
            {((storyContentV2 /* Chapter 2 only uses V2 */) && !gameStarted) ? 'ストーリー' :
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
        
        ((storyContentV2 /* Chapter 2 specific */) && !gameStarted ?
        
        <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
            {/* StoryCanvas integration for Chapter 2 */}
            {storyContentV2 && (
                <StoryCanvas
                    script={storyContentV2}
                    onEnd={() => {
                        setShowStoryModal(false);
                        setGameStarted(false);
                        moveToNextStep();
                    }}
                />
            )}
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
    </div>
  );
};

export default GameChapter2;
