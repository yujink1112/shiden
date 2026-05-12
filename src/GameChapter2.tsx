import React from 'react';
import SkillCard from './components/SkillCard';
import MobileSelectedSkillsTray from './components/MobileSelectedSkillsTray';
import MobileEnemySkillsTray from './components/MobileEnemySkillsTray';
import DesktopSelectedSkillsDock from './components/DesktopSelectedSkillsDock';
import AnimatedRichLog from './components/AnimatedRichLog';
import StoryCanvas from './components/StoryCanvas';
import AudioManager from './utils/audioManager';
import type { GameProps, BattleResult } from './types/GameProps';
import { getAvailableSkillsUntilStage } from './stageData';
import { SkillDetail } from './skillsData';

// 第2章 Stage12-3 勝利演出の手動調整ポイント。
// CSS側の .chapter2-final-* と合わせて調整すると、余韻や崩落速度を変えられます。
const FINAL_CLEAR_AUTO_ADVANCE_MS = 8200;

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
    handleDebugWin,
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
    pendingChapter2Reward,
    selectedRewards,
    setSelectedRewards,
    handleRewardSelection,
    confirmRewards,
    isRewardConfirming,
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
    bgmEnabled,
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
  const displayedRewardStep = React.useMemo(() => {
    if (currentStep?.type === 'reward') return currentStep;
    if (rewardSelectionMode && pendingChapter2Reward?.stageNo === stageCycle) {
      return pendingChapter2Reward.step;
    }
    return null;
  }, [currentStep, rewardSelectionMode, pendingChapter2Reward, stageCycle]);
  const currentFlow = React.useMemo(() => {
    return chapter2Flows.find(f => f.stageNo === stageCycle) || null;
  }, [chapter2Flows, stageCycle]);

  // 第2章の報酬選択（flow type が reward の場合）
  const isChapter2Reward = !!displayedRewardStep;
  const isFixedChapter2Reward = isChapter2Reward && !!displayedRewardStep?.skill;
  const displayedRewardFlowIndex = currentStep?.type === 'reward' ? chapter2FlowIndex : pendingChapter2Reward?.flowIndex;
  const isPreBattleReward = isChapter2Reward && currentFlow?.flow[(displayedRewardFlowIndex ?? chapter2FlowIndex) + 1]?.type === 'battle';

  // 報酬の選択肢を生成して保存する。リロード時は同じ報酬ステップの候補を再利用する。
  const [rewardChoices, setRewardChoices] = React.useState<string[]>([]);

  React.useEffect(() => {
    const storageKey = 'shiden_chapter2_reward_choices';

    if (isRewardConfirming) return;

    if (!isChapter2Reward || !displayedRewardStep) {
      setRewardChoices([]);
      localStorage.removeItem(storageKey);
      return;
    }

    const rewardStepKey = `${stageCycle}:${displayedRewardFlowIndex ?? chapter2FlowIndex}`;
    const saved = localStorage.getItem(storageKey);
    const canOfferReward = (abbr: string) => {
      const skill = ALL_SKILLS.find(s => s.abbr === abbr);
      return !!skill &&
        !ownedSkillAbbrs.includes(abbr) &&
        skill.type !== "敵専用";
    };
    const isAvailableRandomReward = (abbr: string) => {
      const skill = ALL_SKILLS.find(s => s.abbr === abbr);
      return canOfferReward(abbr) && (skill as SkillDetail).exclude !== 1;
    };
    const pickRandomRewards = (count: number, currentChoices: string[]) => {
      const used = new Set(currentChoices);
      const availablePool = ALL_SKILLS.filter(skill =>
        isAvailableRandomReward(skill.abbr) &&
        !used.has(skill.abbr)
      );
      return [...availablePool]
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .map(skill => skill.abbr);
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.key === rewardStepKey && Array.isArray(parsed?.choices)) {
          const savedChoices = parsed.choices as string[];
          const expectedChoices = displayedRewardStep.choices || (displayedRewardStep.skill ? [displayedRewardStep.skill] : []);
          const includesFixedChoices = expectedChoices.every(abbr => savedChoices.includes(abbr));
          if (savedChoices.every(abbr => canOfferReward(abbr)) && includesFixedChoices) {
            setRewardChoices(savedChoices);
            return;
          }
        }
      } catch {
        // 保存データが壊れている場合は下で作り直す
      }
    }

    if (displayedRewardStep.skill) {
      const choices = [displayedRewardStep.skill];
      setRewardChoices(choices);
      localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices }));
      return;
    }

    if (!displayedRewardStep.choices) {
      setRewardChoices([]);
      localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices: [] }));
      return;
    }

    let choices: string[] = [];
    displayedRewardStep.choices.forEach(abbr => {
      if (canOfferReward(abbr) && !choices.includes(abbr)) {
        choices.push(abbr);
        return;
      }

      const [rerolled] = pickRandomRewards(1, choices);
      if (rerolled) choices.push(rerolled);
    });
    
    // 選択肢が3個以下の場合、未所持スキルからランダムに追加
    if (choices.length <= 3) {
      // 指示は「choice要素に含まれるスキルが3個以下ならば、...ランダムにスキルを選び、選択肢に追加する」
      // 何個追加するかは明記されていないが、通常は3個や5個にする。ここでは「追加する」とあるので、未所持のものをいくつか足す。
      // 選択肢が3個以下の場合に追加するので、とりあえず合計5個くらいになるようにしてみる（あるいは単に3個追加するなど）
      // 指示通り「追加する」を実装。ここでは合計5個になるように補充してみる。
      choices = [...choices, ...pickRandomRewards(5 - choices.length, choices)];
    }

    setRewardChoices(choices);
    localStorage.setItem(storageKey, JSON.stringify({ key: rewardStepKey, choices }));
  }, [isChapter2Reward, displayedRewardStep, stageCycle, displayedRewardFlowIndex, chapter2FlowIndex, ownedSkillAbbrs, ALL_SKILLS, isRewardConfirming]);

  const previousChapter2BattleStep = React.useMemo(() => {
    if (!isChapter2Reward) return null;
    return [...(currentFlow?.flow.slice(0, chapter2FlowIndex) || [])].reverse().find(step => step.type === 'battle') || null;
  }, [isChapter2Reward, currentFlow, chapter2FlowIndex]);
  const hasCurrentBattleResults = battleResults.length > 0;
  const hasCurrentBattleVictory = battleResults.some(result => result.winner === 1);
  const hasChapter2BattleVictory = hasCurrentBattleVictory || (!hasCurrentBattleResults && canGoToBoss);

  // 報酬選択の表示判定を上書き
  const showRewardSelection = (rewardSelectionMode || isChapter2Reward) &&
    !(isChapter2Reward && !isPreBattleReward && previousChapter2BattleStep && !hasChapter2BattleVictory);
  const showChapter2VictoryPanel = !isChapter2Reward && canGoToBoss && (!hasCurrentBattleResults || hasCurrentBattleVictory);
  const isChapter2FinalBattle = stageCycle === 24 && (
    chapter2SubStage === 3 ||
    (currentStep?.type === 'battle' && currentStep.subStage === 3) ||
    chapter2FlowIndex === 6
  );
  const isFinalBattleVictoryComplete = isChapter2FinalBattle &&
    gameStarted &&
    logComplete &&
    battleResults.length > 0 &&
    battleResults[0]?.winner === 1;
  const [introEffectActive, setIntroEffectActive] = React.useState(false);
  const [finalClearEffectActive, setFinalClearEffectActive] = React.useState(false);
  const enemyPanelRef = React.useRef<HTMLDivElement>(null);
  const showDebugBattleButton = process.env.NODE_ENV !== 'production';
  const finalClearStartedRef = React.useRef(false);
  const introEffectKeyRef = React.useRef('');
  const moveToNextStepRef = React.useRef(moveToNextStep);
  const finalClearTimerRef = React.useRef<number | null>(null);
  const finalClearResetTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    moveToNextStepRef.current = moveToNextStep;
  }, [moveToNextStep]);

  React.useEffect(() => {
    if (!isChapter2FinalBattle || showStoryModal) return;

    const effectKey = `${stageCycle}:${chapter2FlowIndex}`;
    if (introEffectKeyRef.current === effectKey) return;

    introEffectKeyRef.current = effectKey;
    setIntroEffectActive(true);

    const timer = window.setTimeout(() => {
      setIntroEffectActive(false);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isChapter2FinalBattle, showStoryModal, stageCycle, chapter2FlowIndex]);

  const rewardSelectionOverlay = showRewardSelection ? (
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
          {isPreBattleReward && displayedRewardStep?.skill ? '覚醒！！' : 'ステージクリア！'}<br />
          {displayedRewardStep?.skill ? 'スキルを1つ選んでください' :
            displayedRewardStep?.choices ? 'スキルを1つ選んでください' :
            isChapter2Reward ? `スキルを${displayedRewardStep?.count || 1}つ選んでください` : 'スキルを1つ選んでください'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
          {isChapter2Reward ? (
            rewardChoices.map((abbr: string) => {
              const skill = getSkillCardsFromAbbrs([abbr])[0];
              if (!skill) return null;
              return (
                <div
                  key={abbr}
                  onClick={isFixedChapter2Reward ? undefined : () => handleRewardSelection(abbr)}
                  style={{ cursor: isFixedChapter2Reward ? 'default' : 'pointer', transition: 'transform 0.2s' }}
                  className={(isFixedChapter2Reward || selectedRewards.includes(abbr)) ? 'selected-reward-card' : ''}
                >
                  <SkillCard skill={skill} isSelected={isFixedChapter2Reward || displayedRewardStep?.choices ? true : selectedRewards.includes(abbr)} iconMode={iconMode} />
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
            isRewardConfirming || (isChapter2Reward ? (
              displayedRewardStep?.skill ? false :
              displayedRewardStep?.choices ? selectedRewards.length !== 1 :
              selectedRewards.length !== (displayedRewardStep?.count || 1)
            ) : (
              selectedRewards.length === 0
            ))
          }
          onClick={() => {
            if (isChapter2Reward && displayedRewardStep?.skill) {
              confirmRewards([displayedRewardStep.skill]);
              return;
            }
            confirmRewards();
          }}
          style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', opacity: (isRewardConfirming || (isChapter2Reward ? (displayedRewardStep?.skill ? false : displayedRewardStep?.choices ? selectedRewards.length !== 1 : selectedRewards.length !== (displayedRewardStep?.count || 1)) : selectedRewards.length === 0)) ? 0.5 : 1 }}
        >
          {isChapter2Reward && displayedRewardStep?.skill ? '確認' : 'スキルを獲得する'}
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
  ) : null;

  React.useEffect(() => {
    finalClearStartedRef.current = false;
    setFinalClearEffectActive(false);
    if (finalClearTimerRef.current !== null) {
      window.clearTimeout(finalClearTimerRef.current);
      finalClearTimerRef.current = null;
    }
    if (finalClearResetTimerRef.current !== null) {
      window.clearTimeout(finalClearResetTimerRef.current);
      finalClearResetTimerRef.current = null;
    }
  }, [stageCycle, chapter2SubStage, gameStarted]);

  React.useEffect(() => {
    return () => {
      if (finalClearTimerRef.current !== null) window.clearTimeout(finalClearTimerRef.current);
      if (finalClearResetTimerRef.current !== null) window.clearTimeout(finalClearResetTimerRef.current);
    };
  }, []);

  const startFinalClearEffect = React.useCallback(() => {
    AudioManager.getInstance().stopBgm();
    setFinalClearEffectActive(true);

    if (finalClearTimerRef.current !== null) {
      window.clearTimeout(finalClearTimerRef.current);
      finalClearTimerRef.current = null;
    }
    if (finalClearResetTimerRef.current !== null) {
      window.clearTimeout(finalClearResetTimerRef.current);
      finalClearResetTimerRef.current = null;
    }

    finalClearTimerRef.current = window.setTimeout(() => {
      moveToNextStepRef.current();
      finalClearTimerRef.current = null;
    }, FINAL_CLEAR_AUTO_ADVANCE_MS);
  }, []);

  React.useEffect(() => {
    if (!isFinalBattleVictoryComplete || finalClearStartedRef.current) return;

    finalClearStartedRef.current = true;
    startFinalClearEffect();
  }, [isFinalBattleVictoryComplete, startFinalClearEffect]);

  // 敵のスキル数に応じたスケール計算
  const enemySkills = React.useMemo(() => stageProcessor.getEnemySkills(0, stageContext), [stageProcessor, stageContext]);
  const skillCount = enemySkills.length;
  const bossSkillScale = isMobile ? 'none' : 
                         skillCount === 7 ? 'scale(0.9)' :
                         skillCount === 8 ? 'scale(0.8)' :
                         skillCount >= 9 ? 'scale(0.7)' : 'none';
  const getEmberStyle = (index: number): React.CSSProperties & Record<'--ember-drift' | '--ember-size', string> => ({
    left: `${(index * 29) % 100}%`,
    animationDelay: `${(index % 17) * -0.22}s`,
    animationDuration: `${2.4 + (index % 7) * 0.28}s`,
    '--ember-drift': `${((index % 9) - 4) * 12}px`,
    '--ember-size': `${3 + (index % 5)}px`
  });

  return (
    <div className={[
      'AppContainer',
      isChapter2FinalBattle ? 'chapter2-final-battle' : '',
      introEffectActive ? 'chapter2-final-intro-effect' : '',
      finalClearEffectActive ? 'chapter2-final-clear-effect' : ''
    ].filter(Boolean).join(' ')} style={{
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
      <MobileSelectedSkillsTray
        isMobile={isMobile}
        selectedPlayerSkills={selectedPlayerSkills}
        getSkillCardsFromAbbrs={getSkillCardsFromAbbrs}
        iconMode={iconMode}
        gameStarted={gameStarted}
        handleSelectedSkillClick={handleSelectedSkillClick}
        connections={connections}
        dimmedIndices={dimmedIndices}
        panelRef={panelRef}
      />
      <MobileEnemySkillsTray
        isMobile={isMobile}
        gameStarted={gameStarted}
        enemySkills={enemySkills}
        enemyTitle={stageProcessor.getEnemyTitle?.(stageContext) || '敵の編成'}
        targetRef={enemyPanelRef}
      />
      <DesktopSelectedSkillsDock
        isMobile={isMobile}
        gameStarted={gameStarted}
        selectedPlayerSkills={selectedPlayerSkills}
        getSkillCardsFromAbbrs={getSkillCardsFromAbbrs}
        iconMode={iconMode}
        handleSelectedSkillClick={handleSelectedSkillClick}
        connections={connections}
        dimmedIndices={dimmedIndices}
      />
      {isChapter2FinalBattle && !showStoryModal && (
        <div className="chapter2-final-embers" aria-hidden="true">
          {Array.from({ length: 34 }).map((_, index) => (
            <span key={index} style={getEmberStyle(index)} />
          ))}
        </div>
      )}
      {(introEffectActive || finalClearEffectActive) && (
        <div className="chapter2-final-white-flash" aria-hidden="true" />
      )}
      <div ref={mainGameAreaRef} className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', paddingBottom: isMobile && !gameStarted && selectedPlayerSkills.length > 0 ? '220px' : '20px', display: (isLoungeMode || showEpilogue || showStoryModal) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)', position: 'relative', color: '#eee' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: isMobile ? '10px 76px 10px 58px' : '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => { handleResetGame(); setIsTitle(true); setKenjuBoss(null); localStorage.setItem('shiden_is_title', 'true');}} style={{ position: 'absolute', left: isMobile ? '6px' : '10px', top: isMobile ? '8px' : '10px', padding: isMobile ? '4px 7px' : '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', zIndex: 11 }}>TITLE</button>
          <h1 style={{ margin: isMobile ? '0' : '0 20px', color: '#ff5252', fontSize: window.innerWidth < 600 ? '1.2rem' : '1.5rem', wordBreak: 'break-all' }}>
              {stageProcessor.getStageTitle(stageContext)}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.8rem' }}>{stageProcessor.getStageDescription(stageContext)}</p>
          <div style={{ position: 'absolute', right: isMobile ? '4px' : '5px', top: isMobile ? '7px' : '10px', display: 'flex', gap: isMobile ? '1px' : '5px', zIndex: 11 }}>
            <button onClick={() => setShowRule(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: '#888', padding: '0px' }} title="ルール">📖</button>
            <button onClick={() => AudioManager.getInstance().setMute(bgmEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: bgmEnabled ? '#888' : '#ffcc66', padding: isMobile ? '0px' : '2px' }} title={bgmEnabled ? '音声をミュート' : 'ミュート解除'}>{bgmEnabled ? '🔊' : '🔇'}</button>
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: '#888', padding: isMobile ? '0px' : '2px' }} title="設定">⚙️</button>
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
              <div ref={enemyPanelRef} className="BossSkillPreview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.4)', boxSizing: 'border-box', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', backdropFilter: 'blur(2px)', paddingTop: '20px', overflow: 'visible' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill: SkillDetail, index: number) => <SkillCard key={index} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={connections.some((c: { fromId: string; toId: string }) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)} isDimmed={dimmedIndices.includes(index)} onClick={gameStarted ? undefined : handleSelectedSkillClick} disableTooltip={!gameStarted} iconMode={iconMode} />)}</div>
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
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleStartGame} style={{ padding: '10px 60px', fontSize: '20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', boxShadow: '0 0 15px rgba(40, 167, 69, 0.5)', fontWeight: 'bold' }}>戦闘開始</button>
                {showDebugBattleButton && (
                  <button onClick={handleDebugWin} style={{ padding: '10px 24px', fontSize: '18px', backgroundColor: '#1565c0', color: 'white', border: '1px solid #64b5f6', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>[DEBUG] 勝利</button>
                )}
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
            {rewardSelectionOverlay}
            {showChapter2VictoryPanel && !showRewardSelection && !isChapter2FinalBattle && (
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
        {!gameStarted && rewardSelectionOverlay}
      </div>
      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', paddingBottom: isMobile && !gameStarted && selectedPlayerSkills.length > 0 ? '240px' : '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', overflow: 'hidden', borderLeft: '1px solid #333', visibility: (isLoungeMode || showStoryModal) ? 'hidden' : 'visible', display: (isLoungeMode || showStoryModal) ? 'none' : 'flex', flexDirection: 'column', color: '#eee' }}>
        {(() => {
          const logHeading = !gameStarted ? 'BOSS' : (logComplete ? 'ゲームログ' : 'BOSS');
          return !(isMobile && logHeading === 'BOSS') ? (
            <h2 style={{ color: '#61dafb' }}>
              {logHeading}
            </h2>
          ) : null;
        })()}
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
            <p style={{ textAlign: 'left', whiteSpace: 'pre-wrap', padding: '0 10px', lineHeight: isMobile ? 1.5 : 1.8 }}>
              {stageProcessor.getBossDescription(stageContext).replace(/\\n/g, '\n')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameChapter2;
