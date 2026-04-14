import React from 'react';
import SkillCard from './components/SkillCard';
import AnimatedRichLog from './components/AnimatedRichLog';
import StoryCanvas from './components/StoryCanvas';
import { GameProps, BattleResult } from './types/GameProps';
import { getAvailableSkillsUntilStage } from './stageData';
import { SkillDetail } from './skillsData';

const GameChapter2: React.FC<GameProps> = (props) => {
  const {
    stageCycle,
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
    iconMode,
    panelRef,
    mainGameAreaRef,
    connections,
    dimmedIndices,
    lineCoords,
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
    ownedSkillAbbrs,
    setGameStarted,
    setShowStoryModal,
    showStoryModal,
    chapter2SubStage,
    chapter2FlowIndex,
    chapter2Flows,
    moveToNextStep,
    loadingImageUrl
  } = props;

  // 第2章の現在のステップ
  const currentStep = React.useMemo(() => {
    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    return flow?.flow[chapter2FlowIndex] || null;
  }, [chapter2Flows, stageCycle, chapter2FlowIndex]);

  // 第2章の報酬選択（flow type が reward の場合）
  const isChapter2Reward = currentStep?.type === 'reward';

  // 報酬の選択肢を生成して保存する。リロード時は同じ報酬ステップの候補を再利用する。
  const [rewardChoices, setRewardChoices] = React.useState<string[]>([]);

  React.useEffect(() => {
    const storageKey = 'shiden_chapter2_reward_choices';

    if (!isChapter2Reward || !currentStep) {
      setRewardChoices([]);
      localStorage.removeItem(storageKey);
      return;
    }

    const rewardStepKey = `${stageCycle}:${chapter2FlowIndex}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.key === rewardStepKey && Array.isArray(parsed?.choices)) {
          setRewardChoices(parsed.choices);
          return;
        }
      } catch {
        // 保存データが壊れている場合は下で作り直す
      }
    }

    if (currentStep.skill) {
      const choices = [currentStep.skill];
      setRewardChoices(choices);
      localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices }));
      return;
    }

    if (!currentStep.choices) {
      setRewardChoices([]);
      localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices: [] }));
      return;
    }

    let choices = [...currentStep.choices];
    
    // 選択肢が3個以下の場合、未所持スキルからランダムに追加
    if (choices.length <= 3) {
      const additionalCount = 5 - choices.length; // 最大5個まで増やす、あるいは3個以下なら補充という指示だが、一般的によくある「3個以下なら補充して3個にする」か「3個以下なら追加して選択肢を増やす」か。
      // 指示は「choice要素に含まれるスキルが3個以下ならば、...ランダムにスキルを選び、選択肢に追加する」
      // 何個追加するかは明記されていないが、通常は3個や5個にする。ここでは「追加する」とあるので、未所持のものをいくつか足す。
      
      const availablePool = ALL_SKILLS.filter(skill => 
        !ownedSkillAbbrs.includes(skill.abbr) && 
        !choices.includes(skill.abbr) &&
        (skill as any).exclude !== 1 &&
        skill.type !== "敵専用"
      );

      // ランダムにシャッフルして必要な分（例えば合計5個になるまで、あるいは適当な数）追加
      const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
      // 選択肢が3個以下の場合に追加するので、とりあえず合計5個くらいになるようにしてみる（あるいは単に3個追加するなど）
      // 指示通り「追加する」を実装。ここでは合計5個になるように補充してみる。
      const toAdd = shuffled.slice(0, 5 - choices.length);
      choices = [...choices, ...toAdd.map(s => s.abbr)];
    }

    setRewardChoices(choices);
    localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices }));
  }, [isChapter2Reward, currentStep, stageCycle, chapter2FlowIndex, ownedSkillAbbrs, ALL_SKILLS]);

  // 報酬選択の表示判定を上書き
  const showRewardSelection = rewardSelectionMode || isChapter2Reward;

  // 敵のスキル数に応じたスケール計算
  const enemySkills = React.useMemo(() => stageProcessor.getEnemySkills(0, stageContext), [stageProcessor, stageContext]);
  const skillCount = enemySkills.length;
  const bossSkillScale = isMobile ? 'none' : 
                         skillCount === 7 ? 'scale(0.9)' :
                         skillCount === 8 ? 'scale(0.8)' :
                         skillCount >= 9 ? 'scale(0.7)' : 'none';

  return (
    <div style={{ 
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
      <div ref={mainGameAreaRef} className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', display: (isLoungeMode || showEpilogue || showStoryModal) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)', position: 'relative', color: '#eee' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => { handleResetGame(); setIsTitle(true); setKenjuBoss(null); localStorage.setItem('shiden_is_title', 'true');}} style={{ position: 'absolute', left: '10px', top: '10px', padding: '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', zIndex: 11 }}>TITLE</button>
          <h1 style={{ margin: '0 20px', color: '#ff5252', fontSize: window.innerWidth < 600 ? '1.2rem' : '1.5rem', wordBreak: 'break-all' }}>
              {stageProcessor.getStageTitle(stageContext)}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.8rem' }}>{stageProcessor.getStageDescription(stageContext)}</p>
          <div style={{ position: 'absolute', right: '5px', top: '10px', display: 'flex', gap: '5px', zIndex: 11 }}>
            <button onClick={() => setShowRule(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '0px' }} title="ルール">📖</button>
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '2px' }} title="設定">⚙️</button>
          </div>
        </div>

        <div className={(gameStarted && isMobile) ? 'hidden-on-mobile-battle' : ''} style={{ position: 'relative', width: '100%', maxWidth: '800px', marginBottom: '20px', flexShrink: 0 }}>
          <div style={{
            width: '100%',
            height: stageProcessor.getBossImage(stageContext) ? '300px' : '240px',
            backgroundImage: `url(${(stageProcessor.getBackgroundImage(stageContext)) || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '10px',
            border: `2px solid #ff5252`,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {stageProcessor.getBossImage(stageContext) && (
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
            {!gameStarted && (
              <div className="BossSkillPreview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.4)', boxSizing: 'border-box', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', backdropFilter: 'blur(2px)', paddingTop: '20px', overflow: 'visible' }}>
                  <h2 style={{ color: '#ff5252', textAlign: 'center', margin: '0 0 5px 0', fontSize: '1rem', textShadow: '0 0 5px #000' }}>
                      {stageProcessor.getEnemyTitle?.(stageContext)}
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
            <div className="SelectedSkillsPanel" ref={panelRef} style={{ position: !gameStarted ? 'absolute' : 'relative', bottom: 0, left: 0, width: '100%', padding: '15px', background: !gameStarted ? 'rgba(0, 0, 0, 0.5)' : '#121212', borderRadius: '10px', boxSizing: 'border-box', zIndex: 5, backdropFilter: !gameStarted ? 'blur(5px)' : 'none' }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {lineCoords.map((coord: { x1: number; y1: number; x2: number; y2: number }, idx: number) => <line key={idx} x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffeb3b" strokeWidth="4" />)}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill: SkillDetail, index: number) => <SkillCard key={index} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={connections.some((c: { fromId: string; toId: string }) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)} isDimmed={dimmedIndices.includes(index)} onClick={gameStarted ? undefined : handleSelectedSkillClick} iconMode={iconMode} />)}</div>
            </div>
          )}
        </div>

        {(!gameStarted && stageVictorySkills[`BOSS_${stageCycle}`]?.length > 0) && (
          <div className="BossSkillPreview" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '10px 20px', border: `2px solid #ff5252`, borderRadius: '10px', background: '#2c0a0a', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#ffd700', textAlign: 'center', margin: '5px 0px 10px 0px', fontSize: '1rem' }}>戦いの記憶</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>{getSkillCardsFromAbbrs(stageVictorySkills[`BOSS_${stageCycle}`]).map((skill: SkillDetail, idx: number) => <img key={idx} src={getStorageUrl(skill.icon)} alt="" style={{ width: '30px', border: '1px solid #ffd700', borderRadius: '4px' }} />)}</div>
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
              <div className="skill-card-grid">{availablePlayerCards.map((skill: SkillDetail) => <SkillCard key={skill.abbr} skill={skill} isSelected={selectedPlayerSkills.includes(skill.abbr)} onClick={handlePlayerSkillSelectionClick} iconMode={iconMode} />)}</div>
            </div>
          </div>
        )}
        {gameStarted && logComplete && (
          <div className="ResultsOverview" style={{ marginTop: '0px', width: '100%', maxWidth: '800px' }}>
            {showRewardSelection && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(5px)'
              }}>
                <div className="RewardSelection" style={{ textAlign: 'center', padding: '30px', background: '#1a1a00', border: '2px solid #ffd700', borderRadius: '15px', maxWidth: '90%', maxHeight: '90%', overflowY: 'auto', boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)' }}>
                  <h2 style={{ color: '#ffd700', margin: '0 0 15px 0' }}>
                    {battleResults.length > 0 && battleResults.every(r => r.winner === 1) ? '撃破！！' : '敗北……'}<br />
                    {currentStep?.skill ? '新しいスキルを獲得しました！' :
                     currentStep?.choices ? 'スキルを1つ選んでください' :
                     isChapter2Reward ? `スキルを${currentStep?.count || 1}つ選んでください` : 'スキルを1つ選んでください'}
                  </h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                    {currentStep?.type === 'reward' ? (
                      rewardChoices.map((abbr: string) => {
                        const skill = getSkillCardsFromAbbrs([abbr])[0];
                        if (!skill) return null;
                        return (
                          <div key={abbr} onClick={() => handleRewardSelection(abbr)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} className={selectedRewards.includes(abbr) ? 'selected-reward-card' : ''}>
                            <SkillCard skill={skill} isSelected={currentStep?.choices ? true : selectedRewards.includes(abbr)} iconMode={iconMode} />
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
                      isChapter2Reward ? (
                        currentStep?.skill ? false :
                        currentStep?.choices ? selectedRewards.length !== 1 :
                        selectedRewards.length !== (currentStep?.count || 1)
                      ) : (
                        selectedRewards.length === 0
                      )
                    } 
                    onClick={() => {
                      if (isChapter2Reward && currentStep?.skill) {
                        handleRewardSelection(currentStep.skill);
                      }
                      confirmRewards();
                    }} 
                    style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', opacity: (isChapter2Reward ? (currentStep?.skill ? false : currentStep?.choices ? selectedRewards.length !== 1 : selectedRewards.length !== (currentStep?.count || 1)) : selectedRewards.length === 0) ? 0.5 : 1 }}
                  >
                    {isChapter2Reward && currentStep?.skill ? '確認' : 'スキルを獲得する'}
                  </button>
                  <div style={{ marginTop: '15px' }}>
                      {!isChapter2Reward && (
                          <button onClick={() => { 
                              setSelectedRewards([]); 
                              setRewardSelectionMode(false); 
                              clearBossAndNextCycle(); 
                          }} style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>報酬を受け取らない</button>
                      )}
                  </div>
                </div>
              </div>
            )}
            {canGoToBoss && !showRewardSelection && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>
                   {stageProcessor.getEnemyName(0, stageContext)}撃破！<br />素晴らしいです！！
                </h2>
                <button onClick={() => {
                    moveToNextStep();
                }} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                   次へ進む
                </button>
              </div>
            )}
            {battleResults.length > 0 && !showRewardSelection && !showBossClearPanel && (battleResults[0]?.winner === 2 && logComplete) && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                {!stage11TrialActive && (
                  <>
                    <div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>再挑戦しましょう。</div>
                    <button onClick={handleResetGame} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>再挑戦</button>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{battleResults.map((battle: BattleResult, index: number) => <div key={index} onClick={() => setShowLogForBattleIndex(index)} style={{ padding: '10px', border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#444'}`, borderRadius: '5px', backgroundColor: '#1e1e1e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><span style={{ marginRight: '10px', fontWeight: 'bold', color: battle.winner === 1 ? '#66bb6a' : '#ef5350' }}>{battle.resultText}</span><div style={{ display: 'flex', gap: '5px' }}>{battle.computerSkills.map((s: SkillDetail, si: number) => <img key={si} src={getStorageUrl(s.icon)} alt="" style={{ width: '30px', height: '30px' }} />)}</div></div>)}</div>
          </div>
        )}
      </div>
      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', overflow: 'hidden', borderLeft: '1px solid #333', visibility: (isLoungeMode || showStoryModal) ? 'hidden' : 'visible', display: (isLoungeMode || showStoryModal) ? 'none' : 'flex', flexDirection: 'column', color: '#eee' }}>
        <h2 style={{ color: '#61dafb' }}>
            {!gameStarted ? 'BOSS' : (logComplete ? 'ゲームログ' : 'BOSS')}
        </h2>
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
        {showLogForBattleIndex !== -1 && battleResults[showLogForBattleIndex] ? (
          useRichLog ? <AnimatedRichLog
            log={battleResults[showLogForBattleIndex].gameLog}
            onComplete={() => {
              handleBattleLogComplete();
            }}
            bossImage={stageProcessor.getBossImage(stageContext) || ""}
            bossName={stageProcessor.getEnemyName(0, stageContext)}
            battleInstance={battleResults[showLogForBattleIndex].battleInstance}
            key={`animated-log-${showLogForBattleIndex}-${battleResults[showLogForBattleIndex].gameLog.length}`}
            battleStageCycle={stageCycle}
            processor={stageProcessor}
            stageMode={"BOSS"}
            stageContext={stageContext}
            getStorageUrl={getStorageUrl}
          /> : <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{battleResults[showLogForBattleIndex].gameLog}</pre>{!logComplete && <button onClick={handleBattleLogComplete} style={{ marginTop: '10px', padding: '5px 15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>結果を確認</button>}</div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <img src={stageProcessor.getBossImage(stageContext) || ""} alt="" style={stageProcessor.getBossImageStyle(stageContext, isMobile, 'sidebar')} />
            <h3>{stageProcessor.getEnemyName(0, stageContext)}</h3>
            <p style={{ textAlign: 'left', whiteSpace: 'pre-wrap', padding: '0 10px' }}>
              {stageProcessor.getBossDescription(stageContext).replace(/\\n/g, '\n')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameChapter2;
