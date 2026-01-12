import React, { useState, useEffect } from 'react';
import { Game } from './Game';
import { ALL_SKILLS, getSkillByAbbr, SkillDetail } from './skillsData'; // SkillDetailをインポート
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

const SkillCard: React.FC<SkillCardProps> = ({ skill, isSelected, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false); // ツールチップ表示状態

  const handleClick = () => {
    if (onClick) {
      onClick(skill.abbr);
    }
  };

  const formattedDescription = skill.description.split("\n").map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < skill.description.split("\n").length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)} // マウスエンターでツールチップ表示
      onMouseLeave={() => setShowTooltip(false)} // マウスリーブでツールチップ非表示
      style={{
        border: isSelected ? '3px solid gold' : '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        margin: '5px',
        cursor: onClick ? 'pointer' : 'default', // Only clickable if onClick is provided
        backgroundColor: isSelected ? '#fffacd' : 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100px',
        boxShadow: isSelected ? '0 0 10px rgba(255,215,0,0.7)' : '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative', // ツールチップの絶対位置指定の基準
      }}
    >
      <img src={skill.icon} alt={skill.name} style={{ width: '50px', height: '50px', marginBottom: '5px' }} />
      <span>{skill.name}</span>
      {showTooltip && ( // ツールチップ表示条件
        <div
          style={{
            position: 'absolute',
            bottom: '100%', // カードの上に表示
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            whiteSpace: 'normal', // 自動改行を許可
            zIndex: 1000,
            textAlign: 'left',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            minWidth: '200px', // ツールチップの最小幅を設定
          }}
        >
          <strong>種別:</strong> <span style={{ color: '#61dafb' }}>{skill.type}</span><br />
          <strong>速度:</strong> <span style={{ color: '#61dafb' }}>{skill.speed}</span><br />
          {formattedDescription}
        </div>
      )}
    </div>
  );
};

function App() {
  const [availablePlayerCards, setAvailablePlayerCards] = useState<SkillDetail[]>([]); // 型をSkillDetail[]に変更
  const [selectedPlayerSkills, setSelectedPlayerSkills] = useState<string[]>([]);
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

  // ゲーム開始時またはリセット時にスキルカードを生成
  useEffect(() => {
    if (!gameStarted) {
      setAvailablePlayerCards(drawRandomSkills(SKILL_DRAW_COUNT));
      setSelectedPlayerSkills([]);
      setBattleResults([]);
      setShowLogForBattleIndex(-1);
      // コンピュータのスキルもここでランダムに選んでセット
      const computerSkillAbbrs = drawRandomSkills(PLAYER_SKILL_COUNT).map(s => s.abbr).join("");
      setComputerSkillsRaw(computerSkillAbbrs);
    }
  }, [gameStarted]);

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

  const handleStartGame = () => {
    if (selectedPlayerSkills.length === PLAYER_SKILL_COUNT) {
      const playerSkillsRaw = selectedPlayerSkills.join("");
      const results: BattleResult[] = [];
      const playerSkillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills); // プレイヤーのスキル詳細を取得

      for (let i = 0; i < 10; i++) {
        const currentComputerSkills = drawRandomSkills(PLAYER_SKILL_COUNT); // SkillDetail[] を取得
        const currentComputerSkillsRaw = currentComputerSkills.map(s => s.abbr).join(""); // abbrの文字列を生成
        
        const game = new Game(playerSkillsRaw, currentComputerSkillsRaw);
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
      }
      setBattleResults(results);
      setGameStarted(true);
      setShowLogForBattleIndex(0); // 結果リスト表示にリセット
    } else {
      alert(`スキルを${PLAYER_SKILL_COUNT}枚選択してください。`);
    }
  };

  const handleResetGame = () => {
    setGameStarted(false);
    setBattleResults([]);
    setShowLogForBattleIndex(-1);
  };

  const getSkillCardsFromAbbrs = (abbrs: string[]) => {
    // スキル詳細情報を含むSkillDetail型を返すように変更
    return abbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
  };

  return (
    <div className="AppContainer" style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', background: '#e0f2f7' }}>
      
      <div className="MainGameArea" style={{ flex: 2, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* 選択中のスキルパネル */}
        <div className="SelectedSkillsPanel" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '15px', border: '1px solid #c8e6c9', borderRadius: '10px', background: '#e8f5e9', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2e7d32' }}>選択中のスキル ({selectedPlayerSkills.length}/{PLAYER_SKILL_COUNT})</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill, index) => (
              <SkillCard 
                key={`${skill.abbr}-${index}`} // 重複選択を考慮してindexもkeyに含める
                skill={skill}
                isSelected={true}
                onClick={handleSelectedSkillClick} // クリックで選択解除可能
              />
            ))}
          </div>
        </div>

        {!gameStarted ? (
          <div className="PlayerSkillSelection" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '15px', border: '1px solid #b3e5fc', borderRadius: '10px', background: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#0277bd' }}>プレイヤーに提示されたスキル</h2>
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
        ) : (
          null
        )}

        {gameStarted && ( // ゲームが開始されたら結果一覧とリセットボタンを表示
          <div className="ResultsOverview" style={{ marginTop: '0px', width: '100%', maxWidth: '800px' }}>
            {/* <h2 style={{ color: '#01579b', textAlign: 'center' }}>戦闘結果一覧</h2> */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {battleResults.map((battle, index) => (
                <div
                  key={index}
                  onClick={() => setShowLogForBattleIndex(index)}
                  style={{
                    padding: '10px',
                    border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#ccc'}`, // 選択中の結果を強調
                    borderRadius: '5px',
                    backgroundColor: showLogForBattleIndex === index ? '#e0f7fa' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <span style={{ marginRight: '10px', fontWeight: 'bold', color: battle.resultText === '勝利' ? 'green' : battle.resultText === '敗北' ? 'red' : 'inherit' }}>
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
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                onClick={handleResetGame}
                style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                ゲームリセット
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: '#282c34', color: '#f8f8f2', overflowY: 'auto', borderLeft: '1px solid #61dafb', boxShadow: "-2px 0 5px rgba(0,0,0,0.2)" }}>
        <h2 style={{ color: '#61dafb' }}>ゲームログ</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
          {showLogForBattleIndex !== -1 && battleResults[showLogForBattleIndex]
            ? battleResults[showLogForBattleIndex].gameLog
            : "ログがありません。"}
        </pre>
      </div>
    </div>
  );
}

export default App;
