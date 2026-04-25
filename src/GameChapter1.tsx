import React from 'react';
import SkillCard from './components/SkillCard';
import AnimatedRichLog from './components/AnimatedRichLog';
import Kamishibai from './components/Kamishibai';
import AudioManager from './utils/audioManager';
import { GameProps, BattleResult } from './types/GameProps';
import { StageMode } from './components/AnimatedRichLog';
import { STAGE_DATA, getAvailableSkillsUntilStage, getSkillByName } from './stageData';
import { SkillDetail } from './skillsData';

const getSkillStrengthTip = (skill: SkillDetail): string => {
  const strengthTips: { [abbr: string]: string } = {
    "防": "守りを一気に固められるので、強い一撃を受けても崩れにくくなります。ボスの大技を受ける時に頼れる守備札です。",
    "硬": "大事なスキルの身代わりになります。主力の攻撃や迎撃のすぐ右に置くと、編成の要を守れます。",
    "盾": "攻撃や補助を使いながら防壁も得られます。攻めるターンを守りの準備にも変えられるのが強みです。",
    "剣": "攻撃スキルを多く積むほど威力が伸びます。攻撃寄りの編成で、後ろのLVに置くと決定力を作りやすいです。",
    "交": "攻撃してきた相手のスキルへ反撃できます。相手の主力攻撃を受け止めながら壊せるのが魅力です。",
    "強": "直前の攻撃スキルを素直に強くします。分かりやすく火力を足せるので、主力攻撃の右に置くと扱いやすいです。",
    "怒": "ラウンドが進むほど大きな一撃になります。長引く相手や守りが厚い相手を押し切る切り札になります。",
    "裏": "後ろに置いた攻撃や補助を先に使えるようになります。強いスキルを後ろのLVで使いたい時に編成の幅が広がります。",
    "反": "直前の攻撃を迎撃として構えられます。攻撃カードを守りにも使えるようになり、相手の攻めを逆利用できます。",
    "呪": "相手に忘却を与えて、放っておいてもスキルを空白化できます。硬い相手や長期戦でじわじわ効きます。",
    "疫": "相手の先頭スキルを疫病に変えて、行動の流れを崩せます。厄介な先頭スキル対策として便利です。",
    "隠": "偶数ラウンドに高めの打点を通せます。毎ターン動かない代わりに、相手の速度計算をずらしやすい攻撃札です。",
    "先": "狙ったラウンドで先攻を取りやすくなります。先に動いて相手の主力を壊したいボス戦で強力です。",
    "逆": "壊されることを火力に変えられます。守り切るより、壊されながら反撃する編成で光ります。",
    "覚": "攻撃と迎撃のダメージと速度をまとめて底上げできます。短期決戦にも迎撃主体にも合う万能バフです。",
    "雷": "リミテッドですが2点をすぐ出せます。ここぞという場面で相手の重要スキルをまとめて削る役に向いています。",
    "封": "相手に複数の悪い状態をまとめて押し付けます。強い行動を遅らせたり弱めたりする妨害札です。",
    "連": "攻撃フェイズを増やせるので、攻めの手数が大きく伸びます。火力札と合わせると勝ち筋を一気に太くできます。",
    "紫": "速度が高く、先に1点を通しやすい攻撃です。自分にスタンが付くので、決めたい相手を先に壊す用途に向きます。",
    "影": "相手の先頭付近をまとめて狙えます。同名スキルが並ぶ敵や、厄介な先頭スキルを処理したい時に刺さります。",
    "玉": "速い攻撃を受けた時ほど反撃が大きくなります。高速アタッカーへの迎撃として頼りになります。",
    "錬": "直前の攻撃が迎撃に止められにくくなります。相手の迎撃を突破して本命の攻撃を通したい時に使えます。",
    "無": "狙ったラウンドの攻撃ダメージを防げます。敵の大技タイミングに合わせると、一気に生存力が上がります。",
    "燐": "悪い状態を毎ラウンド掃除できます。毒・忘却・スタンなどに苦しむ相手への安定札です。"
  };

  return strengthTips[skill.abbr] || "編成の選択肢を広げられます。敵のスキルと見比べて、攻めに使うか守りに使うか試してみましょう。";
};

const GameChapter1: React.FC<GameProps> = (props) => {
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
    setShowEpilogue,
    handleResetGame,
    handleStartGame,
    handleDebugWin,
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
    isRewardConfirming,
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
    bgmEnabled,
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
    onEpilogueComplete
  } = props;

  // 敵のスキル数に応じたスケール計算
  const enemySkills = React.useMemo(() => stageProcessor.getEnemySkills(0, stageContext), [stageProcessor, stageContext]);
  const skillCount = enemySkills.length;
  const bossSkillScale = isMobile ? 'none' : 
                         skillCount === 7 ? 'scale(0.9)' :
                         skillCount === 8 ? 'scale(0.8)' :
                         skillCount >= 9 ? 'scale(0.7)' : 'none';
  const showDebugBattleButton = process.env.NODE_ENV !== 'production';
  const stageSkillTip = React.useMemo(() => {
    if (stageCycle < 4) return null;
    const currentStage = STAGE_DATA.find(stage => stage.no === stageCycle);
    const stageSkills = (currentStage?.shopSkills || [])
      .map(name => getSkillByName(name))
      .filter(Boolean) as SkillDetail[];

    if (stageSkills.length === 0) return null;

    const skill = stageSkills[Math.floor(Math.random() * stageSkills.length)];
    return `このステージで得られる【${skill.name}】の強み: ${getSkillStrengthTip(skill)}`;
  }, [stageCycle]);

  const beginnerTips = React.useMemo(() => {
    if (gameStarted || stageMode === 'KENJU' || stageMode === 'DENEI') return [];

    if (stageCycle === 1 && stageMode === 'MID') {
      return [
        '同じスキルは複数回選べます。最初は【一閃】を5回選ぶだけでも戦えます。',
        'スキルは左からLV1、LV2と数えます。後ろに置くほど強くなるスキルがあります。'
      ];
    }

    if (stageCycle === 2 && stageMode === 'MID') {
      return [
        'ここからは、攻撃スキルだけだと苦しくなります。',
        '【搦手】や【崩技】などの迎撃スキルを混ぜると、相手の攻撃を止めながら反撃できます。'
      ];
    }

    if (stageCycle >= 3 && stageCycle <= 4 && stageMode === 'MID') {
      const tips = [
        '【＋速】【＋硬】などの付帯スキルは、基本的に一つ左のスキルを強化します。',
        'シナジーのあるスキル同士は、黄色い線でつながります。'
      ];
      //if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    if (stageCycle == 4 && stageMode === 'MID' && stageSkillTip) {
      const tips = [
        '第1章では、勝敗の結果にかかわらず、それまで登場したスキルを取得することができます。',
        'スキルを取り逃して今後手に入らないということはありませんので、ご安心ください。'
      ];
      //if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    if (stageCycle == 5 && stageMode === 'MID' && stageSkillTip) {
      const tips = [
        '新しいスキルは、勝敗の結果にかかわらず、それまで登場したスキルを取得することができます。',
        '優しすぎると思われた方、あなたはゲームというジャンルそのものに特に精通しています。'
      ];
      //if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    if (stageCycle >= 6 && stageCycle >= 6 && stageMode === 'MID' && stageSkillTip) {
      return [
        'ここからは、ボスがぐっと強くなります。必ず弱点がありますので、敵をよく観察してみましょう。'
      ];
    }

    if (stageMode === 'BOSS' && stageCycle <= 3) {
      return [
        'ボス戦では編成を組み直せます。敵のスキルを見てから選び直しましょう。',
        '相手のスキルに合わせて、迎撃・付帯スキルの位置を調整してから挑みましょう。'
      ];
    }

    return [];
  }, [gameStarted, stageMode, stageCycle, stageSkillTip]);
  const defeatTips = React.useMemo(() => {
    if (stageMode === 'BOSS') {
      if (stageCycle <= 3) {
        return [
          '再挑戦すると編成画面に戻ります。ボスの公開スキルを見て、迎撃スキルの位置を変えてみましょう。',
          '相手より速い迎撃スキルがあると、攻撃を止めながら反撃できます。'
        ];
      }
      const tips = [
        '再挑戦すると編成画面に戻ります。MIDで使った編成にこだわらず、ボス専用に組み直して大丈夫です。',
        '公開されている敵スキルのうち、先頭の行動や大きな攻撃を止めるカードを優先して置いてみましょう。'
      ];
      if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    if (stageCycle === 1) {
      return [
        'スキルは同じものを何度も選べます。まずは【一閃】を5つ並べて、5枚編成に慣れてみましょう。'
      ];
    }

    if (stageCycle === 2) {
      return [
        '攻撃だけで押し切れない時は、【搦手】や【崩技】を混ぜて相手の攻撃を受け止めてみましょう。'
      ];
    }

    if (stageCycle >= 3 && stageCycle <= 4) {
      const tips = [
        '【＋速】【＋硬】はすぐ左のスキルを助けます。黄色い線が出る置き方にすると、働きが見えやすくなります。',
        '負けた相手の結果を開いて、どの攻撃を止められなかったか確認してみましょう。'
      ];
      if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    if (stageCycle === 11) {
      const tips = [
        'ここは100戦の勝率80%以上で突破です。少し勝つ編成より、迎撃と防御を混ぜた安定編成を探しましょう。',
        '勝率が足りない時は、連続で倒されている相手のスキルを結果一覧から確認すると調整しやすいです。'
      ];
      if (stageSkillTip) tips.push(stageSkillTip);
      return tips;
    }

    const tips = [
      '負けた相手の結果を開くと敵スキルを確認できます。よく負ける相手に合わせて、迎撃や付帯の位置を変えてみましょう。',
      'MID用の安定編成とボス用の対策編成は別物です。ボス前では遠慮なく組み直しましょう。'
    ];
    if (stageSkillTip) tips.push(stageSkillTip);
    return tips;
  }, [stageMode, stageCycle, stageSkillTip]);

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
                同じスキルを何度も選ぶことができます。最初は【一閃】を5つ並べるだけでも大丈夫です。<br /><br />
                次のステージからは【搦手】や【崩技】などの迎撃スキルが頼りになります。相手の攻撃を受け止めながら、こちらの勝ち筋を作っていきましょう。<br /><br />
                【＋速】【＋硬】などの付帯スキルは、基本的にすぐ左のスキルを助けます。選択中に黄色い線が出たら、つながりを確認してみてください。<br /><br />
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
              <button className="TitleButton neon-gold" onClick={onEpilogueComplete}>エンドロールへ</button>
            </div>
          </div>
        </div>
      )}

      <div ref={mainGameAreaRef} className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', display: (isLoungeMode || showEpilogue) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)', position: 'relative', color: '#eee' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: isMobile ? '10px 76px 10px 58px' : '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => { handleResetGame(); setIsTitle(true); setKenjuBoss(null); localStorage.setItem('shiden_is_title', 'true');}} style={{ position: 'absolute', left: isMobile ? '6px' : '10px', top: isMobile ? '8px' : '10px', padding: isMobile ? '4px 7px' : '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', zIndex: 11 }}>TITLE</button>
          <h1 style={{ margin: isMobile ? '0' : '0 20px', color: (stageMode === 'MID' || stageMode === 'KENJU' || stageMode === 'DENEI') ? '#4fc3f7' : '#ff5252', fontSize: window.innerWidth < 600 ? '1.2rem' : '1.5rem', wordBreak: 'break-all' }}>
              {stageProcessor.getStageTitle(stageContext)}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.8rem' }}>{stageProcessor.getStageDescription(stageContext)}</p>
          <div style={{ position: 'absolute', right: isMobile ? '4px' : '5px', top: isMobile ? '7px' : '10px', display: 'flex', gap: isMobile ? '1px' : '5px', zIndex: 11 }}>
            <button onClick={() => setShowRule(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: '#888', padding: '0px' }} title="ルール">📖</button>
            <button onClick={() => AudioManager.getInstance().setMute(bgmEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: bgmEnabled ? '#888' : '#ffcc66', padding: isMobile ? '0px' : '2px' }} title={bgmEnabled ? '音声をミュート' : 'ミュート解除'}>{bgmEnabled ? '🔊' : '🔇'}</button>
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '18px', color: '#888', padding: isMobile ? '0px' : '2px' }} title="設定">⚙️</button>
          </div>
        </div>

        {beginnerTips.length > 0 && (
          <div style={{ width: '100%', maxWidth: '800px', marginBottom: '16px', padding: '14px 16px', border: '1px solid #4fc3f7', borderRadius: '8px', background: 'rgba(0, 24, 36, 0.88)', boxSizing: 'border-box', color: '#e7f7ff' }}>
            <div style={{ color: '#4fc3f7', fontWeight: 'bold', marginBottom: '8px' }}>攻略メモ</div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
              {beginnerTips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

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
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill: SkillDetail, index: number) => <SkillCard key={index} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={connections.some((c: { fromId: string; toId: string }) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)} isDimmed={dimmedIndices.includes(index)} onClick={gameStarted ? undefined : handleSelectedSkillClick} disableTooltip={!gameStarted} iconMode={iconMode} />)}</div>
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
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleStartGame} style={{ padding: '10px 60px', fontSize: '20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', boxShadow: '0 0 15px rgba(40, 167, 69, 0.5)', fontWeight: 'bold' }}>戦闘開始</button>
                {showDebugBattleButton && (
                  <button onClick={handleDebugWin} style={{ padding: '10px 24px', fontSize: '18px', backgroundColor: '#1565c0', color: 'white', border: '1px solid #64b5f6', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>[DEBUG] 勝利</button>
                )}
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
                <button disabled={selectedRewards.length === 0 || isRewardConfirming} onClick={() => confirmRewards()} style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>スキルを獲得する</button>
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
                    {defeatTips.length > 0 && (
                      <div style={{ maxWidth: '760px', margin: '0 auto 14px auto', padding: '12px 14px', border: '1px solid #8a3b3b', borderRadius: '8px', background: 'rgba(60, 10, 10, 0.78)', color: '#ffecec', textAlign: 'left', boxSizing: 'border-box' }}>
                        <div style={{ color: '#ffb3b3', fontWeight: 'bold', marginBottom: '6px' }}>見直しポイント</div>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                          {defeatTips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
