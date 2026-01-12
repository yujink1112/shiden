import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Game } from './Game';
import { ALL_SKILLS, getSkillByAbbr, SkillDetail, STATUS_DATA } from './skillsData'; // SkillDetailをインポート
import { STAGE_DATA, getAvailableSkillsUntilStage, getSkillByName } from './stageData';
import './App.css';

interface SkillCardProps {
  skill: SkillDetail; // SkillDetailを使用するように変更
  isSelected?: boolean; // Optional for computer's public display
  onClick?: (abbr: string) => void; // Optional for computer's public display
}

interface BattleResult {
  playerSkills: SkillDetail[]; // プレイヤーが選択したスキル詳細の配列
  computerSkills: SkillDetail[]; // コンピュータが選択したスキル詳細の配列
  winner: number; // 勝者 (1: プレイヤー1, 2: プレイヤー2, 3: 引き分け)
  resultText: string; // バトルの結果テキスト（勝利、敗北、引き分け）
  gameLog: string; // ゲームのログ詳細
}


const SkillCard: React.FC<SkillCardProps & { id?: string; isConnected?: boolean; isDimmed?: boolean }> = ({ skill, isSelected, onClick, id, isConnected, isDimmed }) => {
  const [showTooltip, setShowTooltip] = useState(false); // ツールチップ表示状態
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const handleClick = () => {
    if (onClick) {
      onClick(skill.abbr);
    }
  };

  const renderFormattedDescription = (text: string) => {
    // 状態異常名（スタン、覚悟など）を抽出してタグ化
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

  return (
    <div
      id={id}
      className={(isConnected ? 'synergy-active ' : '') + 'skill-card'}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)} // マウスエンターでツールチップ表示
      onMouseLeave={() => setShowTooltip(false)} // マウスリーブでツールチップ非表示
      style={{
        border: isConnected ? '3px solid #ffeb3b' : (isDimmed ? '3px solid #333' : (isSelected ? '3px solid gold' : '1px solid #444')),
        borderRadius: '8px',
        padding: '10px',
        margin: '5px',
        cursor: onClick ? 'pointer' : 'default', // Only clickable if onClick is provided
        backgroundColor: isConnected ? '#4a4a00' : (isSelected ? '#333300' : '#1a1a1a'),
        color: isDimmed ? '#666' : '#eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100px',
        boxShadow: isConnected ? '0 0 20px #ffeb3b, inset 0 0 15px #ffeb3b' : (isDimmed ? 'none' : (isSelected ? '0 0 10px rgba(255,215,0,0.7)' : '0 2px 4px rgba(0,0,0,0.3)')),
        position: 'relative', // ツールチップの絶対位置指定の基準
        transition: 'all 0.3s ease',
        filter: isDimmed ? 'grayscale(80%)' : 'none',
        opacity: isDimmed ? 0.7 : 1,
      }}
    >
      <img src={skill.icon} alt={skill.name} style={{ width: '50px', height: '50px', marginBottom: '5px', filter: isDimmed ? 'grayscale(100%)' : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' }} />
      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{skill.name}</span>
      {showTooltip && ( // ツールチップ表示条件
        <div
          style={{
            position: 'absolute',
            bottom: '105%', // カードの少し上に表示
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            whiteSpace: 'normal', // 自動改行を許可
            zIndex: 2000,
            textAlign: 'left',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            minWidth: '220px',
            maxWidth: '300px', // 幅を制限
            pointerEvents: 'auto', // 子要素のホバーを有効にする
            fontSize: '12px',
            lineHeight: '1.4',
            border: '1px solid #555',
          }}
        >
          <strong>種別:</strong> <span style={{ color: '#61dafb' }}>{skill.type}</span><br />
          <strong>速度:</strong> <span style={{ color: '#61dafb' }}>{skill.speed}</span><br />
          {renderFormattedDescription(skill.description)}

          {/* 二次ツールチップ: ステータス説明 */}
          {hoveredStatus && (
            <div style={{
              position: 'absolute',
              left: '105%',
              top: 0,
              backgroundColor: '#444',
              color: '#fff',
              padding: '10px',
              borderRadius: '5px',
              width: '200px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              zIndex: 2001,
              border: '1px solid #ffd700'
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

type StageMode = 'MID' | 'BOSS';

function App() {
  const [availablePlayerCards, setAvailablePlayerCards] = useState<SkillDetail[]>([]); // 型をSkillDetail[]に変更
  const [selectedPlayerSkills, setSelectedPlayerSkills] = useState<string[]>([]);
  const [connections, setConnections] = useState<{ fromId: string; toId: string }[]>([]);
  const [dimmedIndices, setDimmedIndices] = useState<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [logComplete, setLogComplete] = useState(false);

  // 所持スキル
  const [ownedSkillAbbrs, setOwnedSkillAbbrs] = useState<string[]>(() => {
    const saved = localStorage.getItem('shiden_owned_skills');
    // 初期スキルは「一閃」のみ
    return saved ? JSON.parse(saved) : ["一"];
  });

  const [rewardSelectionMode, setRewardSelectionMode] = useState<boolean>(false);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [bossClearRewardPending, setBossClearRewardPending] = useState<boolean>(false);

  // ステージ管理
  const [stageMode, setStageMode] = useState<StageMode>('MID');
  const [stageCycle, setStageCycle] = useState<number>(() => {
    const saved = localStorage.getItem('shiden_stage_cycle');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [bossSkills, setBossSkills] = useState<SkillDetail[]>([]);
  const [canGoToBoss, setCanGoToBoss] = useState<boolean>(false);

  const [computerSkillsRaw, setComputerSkillsRaw] = useState<string>("");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [showLogForBattleIndex, setShowLogForBattleIndex] = useState<number>(-1);
  const SKILL_DRAW_COUNT = 10; // プレイヤーに提示されるスキル数
  const PLAYER_SKILL_COUNT = 5; // プレイヤーが選択するスキル数

  // スキルをシャッフルして指定枚数選ぶヘルパー関数
  const drawRandomSkills = (count: number): SkillDetail[] => { // 戻り値の型をSkillDetail[]に変更
    const filteredSkills = ALL_SKILLS.filter(skill => skill.name !== "弱撃" && skill.name !== "空白");
    const shuffled = [...filteredSkills].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count) as SkillDetail[]; // 型アサーションを追加
  };

  // シナジーを考慮してスキルを選ぶ（コンピュータ用）
  const drawSmartSkills = (count: number): SkillDetail[] => {
    const selected: SkillDetail[] = [];
    const baseSkills = ALL_SKILLS.filter(skill => skill.name !== "弱撃" && skill.name !== "空白");

    for (let i = 0; i < count; i++) {
      let available = [...baseSkills];
      if (i === 0) {
        available = available.filter(s => !s.name.startsWith("＋"));
      } else {
        const prev = selected[i - 1];
        available = available.filter(s => {
          if (s.name.startsWith("＋")) {
            if (s.name === "＋硬" || s.name === "＋速") {
              return prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃");
            } else {
              return prev.type.includes("攻撃");
            }
          }
          return true;
        });
      }
      const chosen = available[Math.floor(Math.random() * available.length)];
      selected.push(chosen);
    }
    return selected;
  };

  // ゲーム開始時またはリセット時にスキルカードを生成
  useEffect(() => {
    if (!gameStarted) {
      // プレイヤーに提示されるカードを「所持スキル」から選ぶように変更
      const getAvailableOwnedSkills = () => {
        const owned = ownedSkillAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
        // skillsData.ts の ALL_SKILLS の順序でソート
        return owned.sort((a, b) => {
          const indexA = ALL_SKILLS.findIndex(s => s.abbr === a.abbr);
          const indexB = ALL_SKILLS.findIndex(s => s.abbr === b.abbr);
          return indexA - indexB;
        });
      };
      
      const available = getAvailableOwnedSkills();
      // 所持スキルが少なければ全て表示、多ければランダムに選ぶ
      // const available = owned.length <= SKILL_DRAW_COUNT ? owned : [...owned].sort(() => 0.5 - Math.random()).slice(0, SKILL_DRAW_COUNT);
      // 自動ソートの要件に基づき、提示されるカードもソート済みのものを使用
      setAvailablePlayerCards(available.length <= SKILL_DRAW_COUNT ? available : [...available].sort(() => 0.5 - Math.random()).slice(0, SKILL_DRAW_COUNT).sort((a, b) => {
          const indexA = ALL_SKILLS.findIndex(s => s.abbr === a.abbr);
          const indexB = ALL_SKILLS.findIndex(s => s.abbr === b.abbr);
          return indexA - indexB;
      }));
      
      setSelectedPlayerSkills([]);
      setBattleResults([]);
      setShowLogForBattleIndex(-1);
      setCanGoToBoss(false);
    }
  }, [gameStarted, ownedSkillAbbrs]);

  // ボススキルは stageCycle や stageMode が変わるたびに更新（gameStartedに関わらず）
  useEffect(() => {
    if (stageMode === 'BOSS') {
      const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
      const bossAbbrs = currentStage.bossSkillAbbrs.split("");
      const skills = bossAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
      setBossSkills(skills);
    } else {
      setBossSkills([]);
    }
  }, [stageMode, stageCycle]);

  // プレイヤーが提示されたスキルを選択する際のハンドラ（重複選択を許可）
  const handlePlayerSkillSelectionClick = (abbr: string) => {
    if (selectedPlayerSkills.length < PLAYER_SKILL_COUNT) {
      setSelectedPlayerSkills([...selectedPlayerSkills, abbr]);
    }
  };

  // 選択中のスキルをクリックして解除する際のハンドラ
  const handleSelectedSkillClick = (abbr: string) => {
    // 選択解除は重複を考慮せず、最初に見つかったものを削除
    const index = selectedPlayerSkills.indexOf(abbr);
    if (index > -1) {
      const newSelectedSkills = [...selectedPlayerSkills];
      newSelectedSkills.splice(index, 1);
      setSelectedPlayerSkills(newSelectedSkills);
    }
  };

  // 永続化
  useEffect(() => {
    localStorage.setItem('shiden_owned_skills', JSON.stringify(ownedSkillAbbrs));
  }, [ownedSkillAbbrs]);

  // 中間ステージでの通算勝利数（無限稼ぎ防止用）
  const [midStageWinCount, setMidStageWinCount] = useState<number>(0);

  // 初期化 (ページ読み込み時に内部データをリセット)
  useEffect(() => {
    setBattleResults([]);
    setLogComplete(false);
    setCanGoToBoss(false);
    setShowBossClearPanel(false);
    setComputerSkillsRaw("");
    setSelectedPlayerSkills([]);
  }, []);

  // 接続線と暗転表示を更新する
  useEffect(() => {
    const newConnections: { fromId: string; toId: string }[] = [];
    const newDimmedIndices: number[] = [];
    const skillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);

    for (let i = 0; i < skillDetails.length; i++) {
      const current = skillDetails[i];
      
      if (current.name.startsWith("＋")) {
        if (i > 0) {
          const prev = skillDetails[i - 1];
          
          // シナジー判定
          let hasSynergy = false;
          if (current.name === "＋硬" || current.name === "＋速") {
            // ＋硬, ＋速は攻撃・補助・迎撃すべてとシナジー
            hasSynergy = prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃");
          } else {
            // それ以外は攻撃のみ
            hasSynergy = prev.type.includes("攻撃");
          }

          if (hasSynergy) {
            newConnections.push({
              fromId: `selected-skill-${i - 1}`,
              toId: `selected-skill-${i}`
            });
          } else {
            // シナジーがない＋スキルは暗くする
            newDimmedIndices.push(i);
          }
        } else {
          // 先頭の＋スキルは暗くする
          newDimmedIndices.push(i);
        }
      }
    }
    setConnections(newConnections);
    setDimmedIndices(newDimmedIndices);
  }, [selectedPlayerSkills]);

  // SVGのパスを計算するためのヘルパー
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
    const positions = [
      { x: 0.8, y: 0.8 },
      { x: 0.2, y: 0.9 },
      { x: 0.5, y: 0.95 },
    ];
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

  const handleStartGame = () => {
    if (selectedPlayerSkills.length === PLAYER_SKILL_COUNT) {
      const playerSkillsRaw = selectedPlayerSkills.join("");
      const results: BattleResult[] = [];
      const playerSkillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
      const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];

      // 10戦行う (ボス戦は1戦だが、UI共通化のため10戦のループを回す。ボス戦時は全て同じ敵構成)
      const battleCount = 10;
      for (let i = 0; i < battleCount; i++) {
        let currentComputerSkills: SkillDetail[];
        let enemyName = "コンピュータ";
        
        if (stageMode === 'MID') {
          // 中間ステージ：敵のスキルは基本4つまで
          const enemyPool = getAvailableSkillsUntilStage(stageCycle);
          const kuuhaku = getSkillByAbbr("空")!;
          
          const drawEnemySkills = (baseCount: number): SkillDetail[] => {
            let count = baseCount;
            let forceKuuhakuCount = 0;

            // 特殊ステージロジック
            if (stageCycle === 1) {
              // 1~2個を空白に
              forceKuuhakuCount = Math.floor(Math.random() * 2) + 1;
            } else if (stageCycle === 3) {
              // 空白8~11個 + 迎撃1個
              const totalKuuhaku = Math.floor(Math.random() * 4) + 8;
              const geigekiPool = enemyPool.filter(s => s.type.includes("迎撃"));
              const chosenGeigeki = geigekiPool.length > 0 ? geigekiPool[Math.floor(Math.random() * geigekiPool.length)] : kuuhaku;
              const resultSkills = Array(totalKuuhaku).fill(kuuhaku);
              resultSkills.splice(Math.floor(Math.random() * resultSkills.length), 0, chosenGeigeki);
              return resultSkills;
            } else if (stageCycle === 4) {
              // 0~1個を空白に
              forceKuuhakuCount = Math.floor(Math.random() * 2);
            }

            const selected: SkillDetail[] = [];
            const effectiveCount = count - forceKuuhakuCount;

            // 有効なスキルを先に選ぶ
            for (let j = 0; j < effectiveCount; j++) {
                let available = [...enemyPool];
                if (j === 0) {
                    available = available.filter(s => !s.name.startsWith("＋"));
                } else {
                    const prev = selected[j-1];
                    available = available.filter(s => {
                        if (s.name.startsWith("＋")) {
                            if (s.name === "＋硬" || s.name === "＋速") {
                                return prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃");
                            } else {
                                return prev.type.includes("攻撃");
                            }
                        }
                        return true;
                    });
                }
                if (available.length === 0) available = [getSkillByName("一閃")!];
                const chosen = available[Math.floor(Math.random() * available.length)];
                selected.push(chosen);
            }

            // 空白を混ぜてシャッフル
            for (let j = 0; j < forceKuuhakuCount; j++) {
              selected.push(kuuhaku);
            }
            return [...selected].sort(() => 0.5 - Math.random());
          };
          
          currentComputerSkills = drawEnemySkills(4);
        } else {
          // ボスステージ
          currentComputerSkills = [...bossSkills];
          enemyName = currentStage.bossName;
          if (stageCycle === 7) {
            const playerDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
            const gekirin = getSkillByAbbr("逆")!;
            currentComputerSkills = [gekirin, gekirin, gekirin, ...playerDetails];
          }
        }

        const currentComputerSkillsRaw = currentComputerSkills.map(s => s.abbr).join("");
        // プレイヤー名を「あなた」、敵の名前を設定
        const game = new Game(playerSkillsRaw + "／あなた", currentComputerSkillsRaw + "／" + enemyName);
        const winner = game.startGame(); // Game.tsから勝者を取得
        const gameLog = game.gameLog; // Game.tsからログを取得
        
        let resultText = "";
        if (winner === 1) { // winnerプロパティを使用
          resultText = "勝利";
        } else if (winner === 2) { // winnerプロパティを使用
          resultText = "敗北";
        } else if (winner === 3) { // winnerプロパティを使用
          resultText = "引き分け";
        } else {
          resultText = "ゲーム結果不明";
        }

        results.push({
          playerSkills: playerSkillDetails, // プレイヤーのスキル詳細を保存
          computerSkills: currentComputerSkills, // コンピュータのスキル詳細を保存
          winner: winner, // 勝者を保存
          resultText: resultText,
          gameLog: gameLog,
        });

        // ボス戦の場合は1回で終了
        if (stageMode === 'BOSS') break;
      }
      setBattleResults(results);
      setGameStarted(true);
      setShowLogForBattleIndex(0); // 結果リスト表示にリセット

      const winCount = results.filter(r => r.winner === 1).length;

      if (stageMode === 'MID') {
        if (midStageWinCount + winCount >= 10) { // 今回の勝利を含めて10勝以上
          setCanGoToBoss(true);
          if (winCount === 10) triggerVictoryConfetti();
        }
        setMidStageWinCount(prev => prev + winCount);
        setRewardSelectionMode(true); // クリア、失敗に関わらず報酬選択へ
      } else {
        // ボス戦判定
        if (winCount >= 1) { 
          setCanGoToBoss(true); // 次のサイクルへ
          setBossClearRewardPending(true);
        } else {
          // ボス戦敗北時も救済
          setRewardSelectionMode(true);
        }
      }
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

  const goToBossStage = () => {
    setStageMode('BOSS');
    handleResetGame();
  };

  const handleRewardSelection = (abbr: string) => {
    if (selectedRewards.includes(abbr)) {
      setSelectedRewards([]);
    } else {
      setSelectedRewards([abbr]); // 常に1つ
    }
  };

  const confirmRewards = () => {
    setOwnedSkillAbbrs(prev => [...prev, ...selectedRewards]);
    setSelectedRewards([]);
    setRewardSelectionMode(false);
  };

  const clearBossAndNextCycle = () => {
    if (bossClearRewardPending) {
        const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
        const newSkills = currentStage.shopSkills.map(name => getSkillByName(name)?.abbr).filter(Boolean) as string[];
        const uniqueNewSkills = newSkills.filter(abbr => !ownedSkillAbbrs.includes(abbr));
        setOwnedSkillAbbrs(prev => [...prev, ...uniqueNewSkills]);
        setBossClearRewardPending(false);
    }

    setStageMode('MID');
    setMidStageWinCount(0); // サイクル移行時にリセット
    const nextCycle = stageCycle + 1;
    setStageCycle(nextCycle);
    localStorage.setItem('shiden_stage_cycle', nextCycle.toString());
    
    // ボス戦の状態を確実にリセット
    setShowBossClearPanel(false);
    setCanGoToBoss(false);
    setLogComplete(false);
    setBattleResults([]);
    setGameStarted(false);
    setShowLogForBattleIndex(-1);
  };

  const getSkillCardsFromAbbrs = (abbrs: string[]) => {
    // スキル詳細情報を含むSkillDetail型を返すように変更
    return abbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
  };

  const AnimatedRichLog: React.FC<{ log: string; onComplete: () => void; immediate?: boolean }> = ({ log, onComplete, immediate }) => {
    // ログをラウンドごとに分割 (冒頭の不要な行を削除)
    const cleanedLog = log.replace(/^[\s\S]*?(?=【第1ラウンド】)/, '');
    const rounds = cleanedLog.split(/(?=【第\d+ラウンド】|【勝敗判定】)/).filter(r => r.trim() !== '');
    const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
    const [roundVisibleCounts, setRoundVisibleCounts] = useState<number[]>(new Array(rounds.length).fill(0));
    const [roundFinished, setRoundFinished] = useState<boolean[]>(new Array(rounds.length).fill(false));
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const currentRoundLines = rounds[currentRoundIdx].split('\n').filter(line => !line.includes('====') && line.trim() !== '');

    useEffect(() => {
      if (immediate) {
        setRoundVisibleCounts(new Array(rounds.length).fill(100));
        setRoundFinished(new Array(rounds.length).fill(true));
        setCurrentRoundIdx(rounds.length - 1);
        onComplete();
        return;
      }

      // 勝敗判定は常に即時
      if (rounds[currentRoundIdx].includes('勝敗判定')) {
          const newCounts = [...roundVisibleCounts];
          newCounts[currentRoundIdx] = currentRoundLines.length;
          setRoundVisibleCounts(newCounts);
          const newFinished = [...roundFinished];
          newFinished[currentRoundIdx] = true;
          setRoundFinished(newFinished);
          onComplete();
          return;
      }

      // 現在のラウンドが未完了ならアニメーション
      if (!roundFinished[currentRoundIdx]) {
        if (roundVisibleCounts[currentRoundIdx] < currentRoundLines.length) {
          const timer = setTimeout(() => {
            const newCounts = [...roundVisibleCounts];
            newCounts[currentRoundIdx]++;
            setRoundVisibleCounts(newCounts);
          }, 150);
          return () => clearTimeout(timer);
        } else {
          const newFinished = [...roundFinished];
          newFinished[currentRoundIdx] = true;
          setRoundFinished(newFinished);
          if (currentRoundIdx === rounds.length - 1) onComplete();
        }
      }
    }, [currentRoundIdx, roundVisibleCounts, roundFinished, currentRoundLines.length, immediate, rounds.length, onComplete, rounds]);

    useEffect(() => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        // 基本は中央付近、ただし最後の方は一番下まで行くように
        const maxScroll = container.scrollHeight - container.clientHeight;
        const targetScroll = Math.min(maxScroll, container.scrollHeight - container.clientHeight * 0.6);
        
        container.scrollTo({ 
          top: targetScroll, 
          behavior: 'smooth' 
        });
      }
    }, [roundVisibleCounts]);

    const goNext = () => {
      if (currentRoundIdx < rounds.length - 1) {
        setCurrentRoundIdx(prev => prev + 1);
      }
    };

    const goBack = () => {
      if (currentRoundIdx > 0) {
        setCurrentRoundIdx(prev => prev - 1);
      }
    };

    return (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '0 5px' }}>
          <button 
            disabled={currentRoundIdx === 0}
            onClick={goBack}
            style={{ padding: '5px 15px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', opacity: currentRoundIdx === 0 ? 0.3 : 1 }}
          >
            ← 前のラウンド
          </button>
          <button 
            disabled={!roundFinished[currentRoundIdx] || currentRoundIdx === rounds.length - 1}
            onClick={goNext}
            style={{ padding: '5px 15px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', opacity: (!roundFinished[currentRoundIdx] || currentRoundIdx === rounds.length - 1) ? 0.3 : 1 }}
          >
            次へ進む →
          </button>
        </div>

        <div ref={scrollRef} className="rich-log-modern" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          {currentRoundLines.slice(0, roundVisibleCounts[currentRoundIdx]).map((line, i) => {
            let className = "log-line";
            let style: React.CSSProperties = { marginBottom: '12px', opacity: 0, transform: 'translateY(10px)', animation: 'slideUp 0.3s forwards' };
            
            if (line.includes('ラウンド') || line.includes('勝敗判定')) {
              style = { ...style, color: '#61dafb', fontSize: '1.2em', borderBottom: '1px solid #333', paddingBottom: '8px', marginTop: '10px' };
            } else if (line.includes('フェイズ')) {
              style = { ...style, color: '#81c784', fontWeight: 'bold', marginTop: '15px' };
            } else if (line.includes('ダメージ') || line.includes('破壊')) {
              style = { ...style, color: '#ff5252', paddingLeft: '10px', borderLeft: '2px solid #ff5252' };
            } else if (line.includes('発動') || line.includes('効果')) {
              style = { ...style, color: '#ffd54f', fontStyle: 'italic' };
            }

            return (
              <div key={i} className={className} style={style}>
                {line}
              </div>
            );
          })}
          {/* 末尾の余白 */}
          <div style={{ height: '100px' }} />
        </div>
      </div>
    );
  };

  const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];

  const [showBossClearPanel, setShowBossClearPanel] = useState(false);

  // ボス戦ログ完了後の紙吹雪
  useEffect(() => {
    if (logComplete && stageMode === 'BOSS' && battleResults.length > 0) {
        if (battleResults[0].winner === 1) {
            const timer = setTimeout(() => {
              triggerVictoryConfetti();
              setShowBossClearPanel(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }
  }, [logComplete, stageMode, battleResults]);

  return (
    <div className="AppContainer" style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', background: '#0a0a0a', color: '#eee' }}>
      <div className="MainGameArea" style={{ flex: 2, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        
        {/* ステージ情報ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', boxShadow: '0 0 10px rgba(0,0,0,0.5)', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box' }}>
          <h1 style={{ margin: 0, color: stageMode === 'MID' ? '#4fc3f7' : '#ff5252', fontSize: '1.5rem' }}>
            {stageMode === 'MID' ? `${currentStageInfo.no}. ${currentStageInfo.name}` : `決戦: ${currentStageInfo.bossName}`}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.9rem' }}>
            {stageMode === 'MID' ? '10戦全勝してボスに挑め！' : '敵の構成を見て対策を練れ！ (1戦勝利でクリア)'}
          </p>
          <button 
            onClick={() => {
              if (window.confirm('進捗をリセットして最初から始めますか？')) {
                localStorage.removeItem('shiden_stage_cycle');
                localStorage.removeItem('shiden_owned_skills');
                window.location.reload();
              }
            }}
            style={{ position: 'absolute', right: '10px', top: '10px', padding: '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer' }}
          >
            RESET
          </button>
        </div>

        {stageMode === 'BOSS' && !gameStarted && !battleResults[0]?.winner && (
          <div className="BossSkillPreview" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '10px', border: '2px solid #ff5252', borderRadius: '10px', background: '#2c0a0a', boxShadow: '0 0 20px rgba(255,82,82,0.3)', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#ff5252', textAlign: 'center', margin: '0 0 10px 0', fontSize: '1.2rem' }}>BOSS SKILLS DISCLOSED</h2>
            <div className="boss-skill-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px' }}>
              {bossSkills.map((skill, index) => (
                <div key={`boss-${index}`} style={{ transform: 'scale(0.8)', width: '100px', flex: '0 0 auto', marginBottom: '5px' }}>
                  <SkillCard 
                    skill={skill}
                    isSelected={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 選択中のスキルパネル */}
        {selectedPlayerSkills.length > 0 && (
        <div 
          className="SelectedSkillsPanel" 
          ref={panelRef}
          style={{ position: 'relative', marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '15px', border: '1px solid #333', borderRadius: '10px', background: '#121212', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
        >
          
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
            <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffeb3b" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            </defs>
            {lineCoords.map((coord, idx) => (
              <g key={idx}>
                {/* 外側の太い光 */}
                <line 
                  x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2}
                  stroke="#ffeb3b"
                  strokeWidth="20"
                  strokeOpacity="0.5"
                  filter="url(#glow)"
                />
                {/* 中間の光 */}
                <line 
                  x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2}
                  stroke="#ffff00"
                  strokeWidth="10"
                  strokeOpacity="0.8"
                  filter="url(#glow)"
                />
                {/* 内側のメイン線 */}
                <line 
                  x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2}
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeDasharray="15 10"
                  filter="url(#glow)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="50"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </line>
              </g>
            ))}
          </svg>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            {getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill, index) => {
              const isConnected = connections.some(c => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`);
              const isDimmed = dimmedIndices.includes(index);
              return (
                <SkillCard 
                  key={`${skill.abbr}-${index}`}
                  id={`selected-skill-${index}`}
                  skill={skill}
                  isSelected={true}
                  isConnected={isConnected}
                  isDimmed={isDimmed}
                  onClick={gameStarted ? undefined : handleSelectedSkillClick} // ゲーム開始後はクリック無効化
                />
              );
            })}
          </div>
        </div>
        )}

        {!gameStarted ? (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div className="PlayerSkillSelection" style={{ marginBottom: '20px', width: '100%', padding: '15px', border: '1px solid #333', borderRadius: '10px', background: '#121212', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
              <h2 style={{ color: '#4fc3f7' }}>所持スキルから編成してください</h2>
              <div className= "skill-card-grid">
                {availablePlayerCards.map((skill) => (
                  <SkillCard 
                    key={skill.abbr}
                    skill={skill}
                    isSelected={selectedPlayerSkills.some(s => s === skill.abbr)}
                    onClick={handlePlayerSkillSelectionClick}
                  />
                ))}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                <button 
                  onClick={handleStartGame}
                  disabled={selectedPlayerSkills.length !== PLAYER_SKILL_COUNT}
                  style={{
                    padding: '10px 20px', fontSize: '18px', cursor: 'pointer',
                    backgroundColor: selectedPlayerSkills.length === PLAYER_SKILL_COUNT ? '#28a745' : '#cccccc',
                    color: 'white', border: 'none', borderRadius: '5px'
                  }}
                >
                  ゲーム開始
                </button>
              </div>
            </div>
          </div>
        ) : (
          null
        )}

        {gameStarted && (logComplete || stageMode === 'MID') && ( // ゲームが開始されたら結果一覧とリセットボタンを表示
          <div className="ResultsOverview" style={{ marginTop: '0px', width: '100%', maxWidth: '800px' }}>
            
            {rewardSelectionMode && (
              <div className="RewardSelection" style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#1a1a00', border: '2px solid #ffd700', borderRadius: '10px' }}>
                <h2 style={{ color: '#ffd700', margin: '0 0 15px 0' }}>{battleResults.some(r => r.winner === 1) ? '勝利報酬！' : '救済報酬！'}スキルを1つ選んでください</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                  {currentStageInfo.shopSkills.map(name => {
                    const skill = getSkillByName(name);
                    if (!skill) return null;
                    const alreadyOwned = ownedSkillAbbrs.includes(skill.abbr);
                    const isSelected = selectedRewards.includes(skill.abbr);
                    return (
                      <div 
                        key={name} 
                        onClick={() => !alreadyOwned && handleRewardSelection(skill.abbr)}
                        style={{ opacity: alreadyOwned ? 0.5 : 1, cursor: alreadyOwned ? 'default' : 'pointer' }}
                      >
                        <SkillCard skill={skill} isSelected={isSelected} />
                        {alreadyOwned && <div style={{ fontSize: '10px', color: '#aaa' }}>獲得済み</div>}
                      </div>
                    );
                  })}
                </div>
                <button 
                  disabled={selectedRewards.length === 0}
                  onClick={confirmRewards}
                  style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
                >
                  スキルを獲得する
                </button>
                <div style={{ marginTop: '15px' }}>
                    <button 
                        onClick={() => {
                            setSelectedRewards([]);
                            setRewardSelectionMode(false);
                        }}
                        style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        報酬を受け取らずに閉じる
                    </button>
                </div>
              </div>
            )}

            {(canGoToBoss && (stageMode === 'MID' || showBossClearPanel)) && !rewardSelectionMode && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px', animation: 'slideUp 0.5s ease' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>
                  {stageMode === 'MID' ? '10戦全勝！ボスへの道が開かれた！' : `祝！${currentStageInfo.bossName}撃破！全スキル獲得！`}
                </h2>
                <button 
                  onClick={stageMode === 'MID' ? goToBossStage : clearBossAndNextCycle}
                  style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
                >
                  {stageMode === 'MID' ? 'ボスステージへ進む' : '次のサイクルへ進む'}
                </button>
              </div>
            )}

            {/* <h2 style={{ color: '#01579b', textAlign: 'center' }}>戦闘結果一覧</h2> */}
            {(stageMode === 'MID' || showBossClearPanel || battleResults.length > 0) && (
            <div className="battle-results-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {battleResults.map((battle, index) => (
                <div
                  key={index}
                  className="battle-result-item"
                  onClick={() => setShowLogForBattleIndex(index)}
                  style={{
                    padding: '10px',
                    border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#444'}`, // 選択中の結果を強調
                    borderRadius: '5px',
                    backgroundColor: showLogForBattleIndex === index ? '#263238' : '#1e1e1e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    marginBottom: '10px',
                    color: '#eee',
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <span style={{ marginRight: '10px', fontWeight: 'bold', color: battle.resultText === '勝利' ? '#66bb6a' : battle.resultText === '敗北' ? '#ef5350' : '#eee' }}>
                    戦闘 {index + 1}: {battle.resultText}
                  </span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {battle.computerSkills.map((skill, skillIndex) => (
                      <img
                        key={skillIndex}
                        src={skill.icon}
                        alt={skill.name}
                        style={{ width: '30px', height: '30px', borderRadius: '3px' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            )}
            {(battleResults.length > 0 && !rewardSelectionMode && !showBossClearPanel && (battleResults.some(r => r.winner === 2) || (stageMode === 'MID' && !canGoToBoss))) && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>
                  {battleResults.every(r => r.winner === 2) ? "全敗... 次こそは！" : "目標未達成。再挑戦しましょう。"}
                </div>
                <button 
                  onClick={handleResetGame}
                  style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                  再挑戦
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: '#1a1a1a', color: '#f8f8f2', overflowY: 'hidden', borderLeft: '1px solid #333', boxShadow: "-2px 0 5px rgba(0,0,0,0.5)" }}>
        <h2 style={{ color: '#61dafb' }}>{stageMode === 'BOSS' ? '決戦記録' : 'ゲームログ'}</h2>
        {showLogForBattleIndex !== -1 && battleResults[showLogForBattleIndex] ? (
          stageMode === 'BOSS' ? (
            <AnimatedRichLog 
              log={battleResults[showLogForBattleIndex].gameLog} 
              onComplete={() => setLogComplete(true)} 
              immediate={battleResults[showLogForBattleIndex].winner === 1}
            />
          ) : (
            <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {battleResults[showLogForBattleIndex].gameLog}
              </pre>
            </div>
          )
        ) : (
          "ログがありません。"
        )}
      </div>
    </div>
  );
}

export default App;
