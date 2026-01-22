import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ref, onValue, push, onDisconnect, set, serverTimestamp } from "firebase/database";
import { database } from "./firebase";
import { Game } from './Game';
import { ALL_SKILLS, getSkillByAbbr, SkillDetail, STATUS_DATA } from './skillsData';
import { STAGE_DATA, getAvailableSkillsUntilStage, getSkillByName } from './stageData';
import './App.css';

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
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

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

  useEffect(() => {
    if (showTooltip && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const margin = 20;
      const tooltipWidth = 220;

      if (rect.left < tooltipWidth / 2 + margin) {
        setTooltipPos('left');
      } else if (screenWidth - rect.right < tooltipWidth / 2 + margin) {
        setTooltipPos('right');
      } else {
        setTooltipPos('center');
      }
    }
  }, [showTooltip]);

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      bottom: '105%',
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
    return <img src={process.env.PUBLIC_URL + skill.icon} alt={skill.name} className="skill-icon" style={{ filter: isDimmed ? 'grayscale(100%)' : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' }} />;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  return (
    <div
      id={id}
      ref={cardRef}
      className={(isConnected ? 'synergy-active ' : '') + 'skill-card'}
      onClick={handleClick}
      onMouseEnter={() => !disableTooltip && setShowTooltip(true)}
      onMouseLeave={() => !disableTooltip && setShowTooltip(false)}
      style={{
        border: isConnected ? '3px solid #ffeb3b' : (isDimmed ? '3px solid #333' : (isSelected ? '3px solid gold' : '1px solid #444')),
        borderRadius: '8px',
        padding: '10px',
        margin: '5px',
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
      {showTooltip && (
        <div 
          style={getTooltipStyle()} 
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <strong>詳細情報</strong>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
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

type StageMode = 'MID' | 'BOSS';
type IconMode = 'ORIGINAL' | 'ABBR' | 'PHONE';

function App() {
  const [isTitle, setIsTitle] = useState(() => {
    const saved = localStorage.getItem('shiden_is_title');
    return saved === null ? true : saved === 'true';
  });
  const [activeUsers, setActiveUsers] = useState(0);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const midiPlayerRef = useRef<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const getSkillIconContent = (skill: SkillDetail, isDimmed?: boolean) => {
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
    return <img src={process.env.PUBLIC_URL + skill.icon} alt={skill.name} className="skill-icon" style={{ filter: isDimmed ? 'grayscale(100%)' : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' }} />;
  };
  const [availablePlayerCards, setAvailablePlayerCards] = useState<SkillDetail[]>([]);
  const [selectedPlayerSkills, setSelectedPlayerSkills] = useState<string[]>([]);
  const [connections, setConnections] = useState<{ fromId: string; toId: string }[]>([]);
  const [dimmedIndices, setDimmedIndices] = useState<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [logComplete, setLogComplete] = useState(false);

  // 所持スキル
  const [ownedSkillAbbrs, setOwnedSkillAbbrs] = useState<string[]>(() => {
    const saved = localStorage.getItem('shiden_owned_skills');
    return saved ? JSON.parse(saved) : ["一"];
  });

  const [rewardSelectionMode, setRewardSelectionMode] = useState<boolean>(false);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [bossClearRewardPending, setBossClearRewardPending] = useState<boolean>(false);

  // ステージ管理
  const [stageMode, setStageMode] = useState<StageMode>(() => {
    const saved = localStorage.getItem('shiden_stage_mode');
    return (saved as StageMode) || 'MID';
  });
  const [stageCycle, setStageCycle] = useState<number>(() => {
    const saved = localStorage.getItem('shiden_stage_cycle');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [bossSkills, setBossSkills] = useState<SkillDetail[]>([]);
  const [canGoToBoss, setCanGoToBoss] = useState<boolean>(false);

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [showLogForBattleIndex, setShowLogForBattleIndex] = useState<number>(-1);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [winRateDisplay, setWinRateDisplay] = useState<number | null>(null);
  const [stage10TrialActive, setStage10TrialActive] = useState(false);

  const [stageVictorySkills, setStageVictorySkills] = useState<{ [key: string]: string[] }>(() => {
    const saved = localStorage.getItem('shiden_stage_victory_skills');
    return saved ? JSON.parse(saved) : {};
  });

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
  }, [gameStarted, ownedSkillAbbrs]);

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

  const handlePlayerSkillSelectionClick = (abbr: string) => {
    if (selectedPlayerSkills.length < PLAYER_SKILL_COUNT) {
      setSelectedPlayerSkills([...selectedPlayerSkills, abbr]);
    }
  };

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
    localStorage.setItem('shiden_stage_mode', stageMode);
  }, [stageMode]);

  useEffect(() => {
    localStorage.setItem('shiden_is_title', isTitle.toString());
  }, [isTitle]);

  useEffect(() => {
    localStorage.setItem('shiden_bgm_enabled', bgmEnabled.toString());
    if (audioRef.current) {
      if (bgmEnabled) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [bgmEnabled]);

  useEffect(() => {
    localStorage.setItem('shiden_bgm_volume', bgmVolume.toString());
    if (audioRef.current) {
      audioRef.current.volume = bgmVolume;
    }
  }, [bgmVolume]);

  useEffect(() => {
    const getBgmPath = () => {
      if (stageMode === 'BOSS') {
        if (stageCycle === 11) return '/audio/(t)月下の死闘.MID';
        if (stageCycle === 12) return '/audio/Knight_in_the_wind.MID';
      }
      return null;
    };

    const bgmPath = getBgmPath();
    
    // MIDI再生用の関数
    const setupMidiPlayer = async (url: string) => {
      const MidiPlayer = (window as any).MidiPlayer;
      const Soundfont = (window as any).Soundfont;
      if (!MidiPlayer || !Soundfont) return;

      // 前の再生を確実に止める
      if (midiPlayerRef.current) {
        midiPlayerRef.current.stop();
      }

      const ac = new AudioContext();
      // 高品質なSoundfontのURL
      const instrument = await Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_grand_piano-mp3.js');
      
      const player = new MidiPlayer.Player((event: any) => {
        if (event.name === 'Note on') {
          instrument.play(event.noteName, ac.currentTime, { gain: (event.velocity / 128) * bgmVolume });
        }
        // RPGツクール2000仕様のループ（CC#111 など）の簡易的なエミュレーションは
        // ライブラリの低レイヤ解析が必要なため、ここでは確実な「末尾から先頭へのループ」を保証する
      });

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        player.loadArrayBuffer(arrayBuffer);
        
        // ループ設定
        player.on('endOfFile', () => {
          player.skipToTick(0);
          player.play();
        });
        
        midiPlayerRef.current = player;
        if (bgmEnabled) player.play();
      } catch (e) {
        console.error("MIDI Load Error:", e);
      }
    };

    if (bgmPath) {
      const fullUrl = process.env.PUBLIC_URL + bgmPath;
      setupMidiPlayer(fullUrl).catch(console.error);
    } else {
      if (midiPlayerRef.current) {
        midiPlayerRef.current.stop();
        midiPlayerRef.current = null;
      }
    }

    return () => {
      if (midiPlayerRef.current) {
        midiPlayerRef.current.stop();
      }
    };
  }, [stageMode, stageCycle, bgmEnabled, bgmVolume]);

  const handleNewGame = () => {
    if (localStorage.getItem('shiden_stage_cycle') && !window.confirm('進捗をリセットして最初から始めますか？')) return;
    localStorage.removeItem('shiden_stage_cycle');
    localStorage.removeItem('shiden_owned_skills');
    // localStorage.removeItem('shiden_stage_victory_skills'); // クリア履歴は保持する
    localStorage.removeItem('shiden_stage_mode');
    localStorage.setItem('shiden_is_title', 'false');
    window.location.reload();
  };

  const handleContinue = () => {
    setIsTitle(false);
  };

  useEffect(() => {
    // アクティブユーザーの追跡
    const connectionsRef = ref(database, 'connections');
    const myConnectionRef = push(connectionsRef);

    // 接続状態の監視
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // 切断時に自動削除するよう設定
        onDisconnect(myConnectionRef).remove();
        // 接続を記録
        set(myConnectionRef, {
          lastActive: serverTimestamp()
        });
      }
    });

    // 合計接続数の監視
    onValue(connectionsRef, (snapshot) => {
      if (snapshot.exists()) {
        setActiveUsers(Object.keys(snapshot.val()).length);
      } else {
        setActiveUsers(0);
      }
    });

    setBattleResults([]);
    setLogComplete(false);
    setCanGoToBoss(false);
    setShowBossClearPanel(false);
    setSelectedPlayerSkills([]);

    // 画像のプリロード
    const imageUrls = [
      process.env.PUBLIC_URL + '/images/background/background.jpg',
      process.env.PUBLIC_URL + '/images/title/titlelogo.png'
    ];
    let loadedCount = 0;
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setIsAssetsLoaded(true);
        }
      };
      img.onerror = () => { // エラー時もカウントして進める
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setIsAssetsLoaded(true);
        }
      };
    });
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

  const handleStartGame = () => {
    if (selectedPlayerSkills.length === PLAYER_SKILL_COUNT) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const playerSkillsRaw = selectedPlayerSkills.join("");
      const results: BattleResult[] = [];
      const playerSkillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);

      const isStage11MID = stageMode === 'MID' && stageCycle === 11;
      const battleCount = isStage11MID ? 100 : (stageMode === 'BOSS' ? 1 : 10);
      
      for (let i = 0; i < battleCount; i++) {
        let currentComputerSkills: SkillDetail[];
        let enemyName = "コンピュータ";
        
        if (stageMode === 'MID') {
          const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
          const newSkills = currentStage.shopSkills.map(name => getSkillByName(name)).filter(Boolean) as SkillDetail[];
          const allPool = getAvailableSkillsUntilStage(stageCycle);
          const kuuhaku = getSkillByAbbr("空")!;
          
          const generateSmartEnemySkills = (): SkillDetail[] => {
            if (isStage11MID) {
                // 強力なスキル5つの敵を戦略的に生成
                const selected: (SkillDetail | null)[] = Array(5).fill(null);
                
                const geigekiPool = allPool.filter(s => s.type.includes("迎撃"));
                const attackPool = allPool.filter(s => s.type.includes("攻撃") && !s.name.startsWith("＋"));
                const plusPool = allPool.filter(s => s.name.startsWith("＋"));

                // 1. 左側(0,1)に迎撃を配置
                for (let k = 0; k < 2; k++) {
                  if (Math.random() > 0.3) {
                    selected[k] = geigekiPool[Math.floor(Math.random() * geigekiPool.length)];
                  }
                }

                // 2. 右側(2,3,4)に攻撃を優先配置
                for (let k = 2; k < 5; k++) {
                  if (selected[k] === null && Math.random() > 0.2) {
                    selected[k] = attackPool[Math.floor(Math.random() * attackPool.length)];
                  }
                }

                // 3. 攻撃スキルの後ろに ＋ を配置
                for (let k = 0; k < 4; k++) {
                  const current = selected[k];
                  if (current && (current.type.includes("攻撃") || (k < 2 && current.type.includes("迎撃")))) {
                    if (selected[k+1] === null && Math.random() > 0.4) {
                      // ＋硬は迎撃の後ろでもOK、他は攻撃の後ろ
                      const validPlus = plusPool.filter(s => {
                        if (s.name === "＋硬") return true;
                        return current.type.includes("攻撃");
                      });
                      if (validPlus.length > 0) {
                        selected[k+1] = validPlus[Math.floor(Math.random() * validPlus.length)];
                      }
                    }
                  }
                }

                // 4. 残りをランダムに埋める
                for (let k = 0; k < 5; k++) {
                  if (selected[k] === null) {
                    selected[k] = allPool[Math.floor(Math.random() * allPool.length)];
                  }
                }
                return selected as SkillDetail[];
            }
            if (stageCycle === 4) {
              const totalKuuhaku = Math.floor(Math.random() * 4) + 8;
              const geigekiPool = allPool.filter(s => s.type.includes("迎撃"));
              const chosenGeigeki = geigekiPool.length > 0 ? geigekiPool[Math.floor(Math.random() * geigekiPool.length)] : kuuhaku;
              const resultSkills = Array(totalKuuhaku).fill(kuuhaku);
              resultSkills.splice(Math.floor(Math.random() * resultSkills.length), 0, chosenGeigeki);
              return resultSkills;
            }
            
            const selected: SkillDetail[] = Array(4).fill(null);
            const newSkillMax = Math.floor(Math.random() * 3); // 0～2個
            let newSkillCount = 0;

            // 攻撃スキルの配置（3個目か4個目、つまりインデックス2か3）
            const attackPos = Math.random() > 0.5 ? 2 : 3;
            const attackPool = allPool.filter(s => s.type.includes("攻撃") && !s.name.startsWith("＋") && s.name !== "空白");
            selected[attackPos] = attackPool[Math.floor(Math.random() * attackPool.length)];

            // 残りの枠を埋める
            for (let j = 0; j < 4; j++) {
                if (selected[j] !== null) continue;

                const prev = j > 0 ? selected[j - 1] : null;
                const weightedPool: SkillDetail[] = [];
                
                allPool.forEach(s => {
                    if (s.name === "空白") return;
                    let weight = 1;
                    
                    // 新スキルの制限
                    const isNew = newSkills.some(ns => ns.abbr === s.abbr);
                    if (isNew) {
                        if (newSkillCount >= newSkillMax) weight = 0;
                        else weight = 5;
                    }

                    // 付帯スキルのシナジー
                    if (s.name.startsWith("＋") && prev) {
                        const canConnect = (s.name === "＋硬" || s.name === "＋速")
                            ? (prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃"))
                            : prev.type.includes("攻撃");
                        if (canConnect) weight = 10;
                        else weight = 0;
                    } else if (s.name.startsWith("＋")) {
                        weight = 0; // 1番目には置かない
                    }

                    for (let k = 0; k < weight; k++) weightedPool.push(s);
                });

                const picked = weightedPool.length > 0 
                    ? weightedPool[Math.floor(Math.random() * weightedPool.length)]
                    : kuuhaku;
                
                selected[j] = picked;
                if (newSkills.some(ns => ns.abbr === picked.abbr)) newSkillCount++;
            }

            if (stageCycle === 1) selected[Math.floor(Math.random() * 4)] = kuuhaku;
            return selected;
          };
          currentComputerSkills = generateSmartEnemySkills();
        } else {
          currentComputerSkills = [...bossSkills];
          const currentStage = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
          enemyName = currentStage.bossName;
          if (stageCycle === 10) {
            const playerDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
            const gekirin = getSkillByAbbr("逆")!;
            currentComputerSkills = [gekirin, gekirin, gekirin, ...playerDetails];
          }
        }

        const currentComputerSkillsRaw = currentComputerSkills.map(s => s.abbr).join("");
        const game = new Game(playerSkillsRaw + "／あなた", currentComputerSkillsRaw + "／" + enemyName);
        const winner = game.startGame();
        const gameLog = game.gameLog;
        
        let resultText = winner === 1 ? "Win!" : winner === 2 ? "Lose" : "Draw";

        results.push({
          playerSkills: playerSkillDetails,
          computerSkills: currentComputerSkills,
          winner: winner,
          resultText: resultText,
          gameLog: gameLog,
          battleInstance: game.battle,
        });
        if (stageMode === 'BOSS') break;
      }
      setBattleResults(results);
      setGameStarted(true);
      setShowLogForBattleIndex(0);

      const winCount = results.filter(r => r.winner === 1).length;
      const actualWinRate = Math.round((winCount / battleCount) * 100);

      if (isStage11MID) {
        setStage10TrialActive(true); // ステート名はそのまま再利用
        let currentRate = 0;
        const interval = setInterval(() => {
          currentRate += 1;
          setWinRateDisplay(currentRate);
          if (currentRate >= actualWinRate) {
            clearInterval(interval);
            setTimeout(() => {
                if (actualWinRate >= 80) {
                    setCanGoToBoss(true);
                    triggerVictoryConfetti();
                }
                setStage10TrialActive(false);
            }, 1000);
          }
        }, 30);
      }

      if (stageMode === 'MID' && !isStage11MID) {
        if (winCount === 10) {
          setCanGoToBoss(true);
          triggerVictoryConfetti();
        }
        if (getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
          setRewardSelectionMode(true);
        }
      } else {
        if (winCount >= 1) { 
          setCanGoToBoss(true);
          if (getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
            setBossClearRewardPending(true);
          } else {
            setBossClearRewardPending(false);
            setShowBossClearPanel(true);
          }
        } else {
          if (getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
            setRewardSelectionMode(true);
          }
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
        if (availableRewards.length > 0) {
          setRewardSelectionMode(true);
          setBossClearRewardPending(false);
          return;
        }
    }
    setStageMode('MID');
    const nextCycle = stageCycle + 1;
    setStageCycle(nextCycle);
    localStorage.setItem('shiden_stage_cycle', nextCycle.toString());
    setShowBossClearPanel(false);
    setCanGoToBoss(false);
    setLogComplete(false);
    setBattleResults([]);
    setGameStarted(false);
    setShowLogForBattleIndex(-1);
  };

  const AnimatedRichLog: React.FC<{ log: string; onComplete: () => void; immediate?: boolean; bossImage?: string; bossName?: string; battleInstance?: any }> = ({ log, onComplete, immediate, bossImage, bossName, battleInstance }) => {
    const rounds = log.split(/(?=【第\d+ラウンド】|【勝敗判定】)/).filter(r => r.trim() !== '');
    const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
    const [roundVisibleCounts, setRoundVisibleCounts] = useState<number[]>(new Array(rounds.length).fill(0));
    const [roundFinished, setRoundFinished] = useState<boolean[]>(new Array(rounds.length).fill(false));
    
    const [bossAnim, setBossAnim] = useState<'idle' | 'attack' | 'damage' | 'counter' | 'defeat'>('idle');
    const [popupDamage, setPopupDamage] = useState<{ value: string; type: 'player' | 'enemy' } | null>(null);
    const [activeSkillIcon, setActiveSkillIcon] = useState<{ icon: string; name: string; side: 'player' | 'enemy' } | null>(null);
    const [currentPc1Scar, setCurrentPc1Scar] = useState<number[]>(battleInstance?.pc1?.scar || []);
    const [currentPc2Scar, setCurrentPc2Scar] = useState<number[]>(battleInstance?.pc2?.scar || []);

    const scrollRef = useRef<HTMLDivElement>(null);
    const currentRoundLines = rounds[currentRoundIdx]?.split('\n').filter(line => !line.includes('====') && line.trim() !== '') || [];

    const lastProcessedLineIdx = useRef<number>(-1);
    const lastProcessedRoundIdx = useRef<number>(-1);

    useEffect(() => {
        if (!roundFinished[currentRoundIdx]) {
            const currentLineIdx = roundVisibleCounts[currentRoundIdx];
            if (currentLineIdx < currentRoundLines.length && (currentLineIdx !== lastProcessedLineIdx.current || currentRoundIdx !== lastProcessedRoundIdx.current)) {
                lastProcessedLineIdx.current = currentLineIdx;
                lastProcessedRoundIdx.current = currentRoundIdx;
                const line = currentRoundLines[currentLineIdx];

                // スキルの破壊をトレース (HPゲージへの反映)
                if (line.includes('破壊された')) {
                  if (line.includes('あなたの')) {
                    const m = line.match(/あなたの【.*?】(\d+)が破壊された/);
                    if (m) {
                        const idx = parseInt(m[1], 10) - 1;
                        setCurrentPc1Scar(prev => {
                            const next = [...prev];
                            next[idx] = 1;
                            return next;
                        });
                    }
                  } else if (line.includes(`${bossName}の`)) {
                    const m = line.match(new RegExp(`${bossName}の【.*?】(\\d+)が破壊された`));
                    if (m) {
                        const idx = parseInt(m[1], 10) - 1;
                        setCurrentPc2Scar(prev => {
                            const next = [...prev];
                            next[idx] = 1;
                            return next;
                        });
                    }
                  }
                }

                // スキル発動演出の特定
                const skillMatch = line.match(/(あなた|${bossName})の【(.*?)】が発動/);
                // 通常スキルの使用を特定 (末尾にLVなどの数字がついているもの、または弱撃0など)
                const useMatch = line.match(/(あなた|${bossName})の【(.*?)】(\d+)！/);
                
                if (skillMatch) {
                    const side = skillMatch[1] === 'あなた' ? 'player' : 'enemy';
                    const skillName = skillMatch[2];
                    const skillDetail = ALL_SKILLS.find(s => s.name === skillName);
                    // if (skillDetail && skillName !== "逆鱗") { // 逆鱗は破壊時に多数出る可能性があるので除外
                    //     setActiveSkillIcon({ icon: skillDetail.icon, name: skillName, side });
                    //     setTimeout(() => setActiveSkillIcon(null), 1200);
                    // }
                } else if (useMatch) {
                    const side = useMatch[1] === 'あなた' ? 'player' : 'enemy';
                    const skillName = useMatch[2];
                    const skillDetail = ALL_SKILLS.find(s => s.name === skillName);
                    // if (skillDetail) {
                    //     setActiveSkillIcon({ icon: skillDetail.icon, name: skillName, side });
                    //     setTimeout(() => setActiveSkillIcon(null), 1200);
                    // }
                }

                if (bossName) {
                    if (line.includes(`${bossName}の勝利`) || line.includes(`${bossName}が破壊された`)) setBossAnim('defeat');
                    else if (line.includes(`${bossName}の【`) && line.includes('が発動')) { setBossAnim('counter'); setTimeout(() => setBossAnim('idle'), 800); }
                    else if (line.includes(`${bossName}の攻撃フェイズ`)) { 
                        setBossAnim('attack'); 
                        setTimeout(() => setBossAnim('idle'), 800); 

                        // 敵の攻撃フェイズ開始時のアイコン表示 (最初の攻撃スキルを推測)
                        // const currentRoundText = rounds[currentRoundIdx];
                        // const enemySkillsPart = currentRoundText.split('\n').find(l => l.includes(`／${bossName}`));
                        // if (enemySkillsPart) {
                        //   const match = enemySkillsPart.match(/【(.*?)】/);
                        //   if (match) {
                        //     const skillName = match[1];
                        //     const skillDetail = ALL_SKILLS.find(s => s.name === skillName);
                        //     if (skillDetail) {
                        //       setActiveSkillIcon({ icon: skillDetail.icon, name: skillName, side: 'enemy' });
                        //       setTimeout(() => setActiveSkillIcon(null), 1200);
                        //     }
                        //   }
                        // }
                    }
                    else if (line.includes('あなたの攻撃フェイズ')) {
                        // プレイヤーの攻撃フェイズ開始時のアイコン表示
                        // const currentRoundText = rounds[currentRoundIdx];
                        // const playerSkillsPart = currentRoundText.split('\n').find(l => l.includes('／あなた'));
                        // if (playerSkillsPart) {
                        //   const match = playerSkillsPart.match(/【(.*?)】/);
                        //   if (match) {
                        //     const skillName = match[1];
                        //     const skillDetail = ALL_SKILLS.find(s => s.name === skillName);
                        //     if (skillDetail) {
                        //       setActiveSkillIcon({ icon: skillDetail.icon, name: skillName, side: 'player' });
                        //       setTimeout(() => setActiveSkillIcon(null), 1200);
                        //     }
                        //   }
                        // }
                    }
                    else if (line.includes(`${bossName}に`) && line.includes('のダメージ')) {
                        setBossAnim('damage');
                        setTimeout(() => setBossAnim('idle'), 800);
                    }
                    else if (line.includes(`${bossName}の【`) && line.includes('にダメージを与えた')) {
                        setBossAnim('damage');
                        setTimeout(() => setBossAnim('idle'), 800);
                    }
                }
            }
        }
    }, [roundVisibleCounts, currentRoundIdx, bossName, currentRoundLines, roundFinished]);

    useEffect(() => {
      if (immediate) {
        setRoundVisibleCounts(new Array(rounds.length).fill(100));
        setRoundFinished(new Array(rounds.length).fill(true));
        setCurrentRoundIdx(rounds.length - 1);
        onComplete();
        return;
      }
      if (rounds[currentRoundIdx]?.includes('勝敗判定')) {
          const nc = [...roundVisibleCounts]; nc[currentRoundIdx] = currentRoundLines.length; setRoundVisibleCounts(nc);
          const nf = [...roundFinished]; nf[currentRoundIdx] = true; setRoundFinished(nf);
          onComplete();
          return;
      }
      if (!roundFinished[currentRoundIdx]) {
        if (roundVisibleCounts[currentRoundIdx] < currentRoundLines.length) {
          const timer = setTimeout(() => {
            const nc = [...roundVisibleCounts]; nc[currentRoundIdx]++; setRoundVisibleCounts(nc);
          }, 400);
          return () => clearTimeout(timer);
        } else {
          const nf = [...roundFinished]; nf[currentRoundIdx] = true; setRoundFinished(nf);
          if (currentRoundIdx === rounds.length - 1) onComplete();
        }
      }
    }, [currentRoundIdx, roundVisibleCounts, roundFinished, currentRoundLines, immediate, rounds.length, onComplete, rounds]);

    useEffect(() => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        const maxScroll = container.scrollHeight - container.clientHeight;
        const targetScroll = Math.min(maxScroll, container.scrollHeight - container.clientHeight * 0.6);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }, [roundVisibleCounts]);

    const goNext = () => {
      if (!roundFinished[currentRoundIdx]) {
        // SKIP処理: 現在のラウンドの全ての行を処理したことにする
        const fullLines = currentRoundLines;
        let newPc1Scar = [...currentPc1Scar];
        let newPc2Scar = [...currentPc2Scar];

        fullLines.forEach(line => {
            if (line.includes('破壊された')) {
                if (line.includes('あなたの')) {
                    const m = line.match(/あなたの【.*?】(\d+)が破壊された/);
                    if (m) newPc1Scar[parseInt(m[1], 10) - 1] = 1;
                } else if (line.includes(`${bossName}の`)) {
                    const m = line.match(new RegExp(`${bossName}の【.*?】(\\d+)が破壊された`));
                    if (m) newPc2Scar[parseInt(m[1], 10) - 1] = 1;
                }
            }
        });
        setCurrentPc1Scar(newPc1Scar);
        setCurrentPc2Scar(newPc2Scar);

        const nc = [...roundVisibleCounts]; nc[currentRoundIdx] = currentRoundLines.length; setRoundVisibleCounts(nc);
        const nf = [...roundFinished]; nf[currentRoundIdx] = true; setRoundFinished(nf);
        if (currentRoundIdx === rounds.length - 1) onComplete();
      } else if (currentRoundIdx < rounds.length - 1) {
        setCurrentRoundIdx(prev => prev + 1);
      }
    };
    const goBack = () => { if (currentRoundIdx > 0) setCurrentRoundIdx(prev => prev - 1); };

    const renderGauge = (player: any, scars: number[], color: string) => {
      if (!player) return null;
      const totalSkills = player.getSkillsLength();
      const brokenSkills = scars.filter((s: number) => s === 1).length;
      const currentSkills = totalSkills - brokenSkills;
      const percentage = Math.max(0, (currentSkills / totalSkills) * 100);
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.8))', width: '80px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: '#fff', textShadow: '0 0 4px #000, 1px 1px 2px #000', textAlign: 'center', width: '100%', wordBreak: 'break-all', height: '2.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
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

    return (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#000', border: '4px double #fff', borderRadius: '4px', overflow: 'hidden' }}>
        {bossImage && (
          <div className="boss-stage-area sticky-boss-area" style={{ 
            height: '240px', minHeight: '240px', display: 'flex', justifyContent: 'center', alignItems: 'center', 
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/background/${stageCycle}.${stageCycle === 8 ? 'png' : 'jpg'})`,
            paddingTop: '10px', position: 'relative', overflow: 'hidden', flexShrink: 0
          }}>
            {/* 背景を暗くするオーバーレイ */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', zIndex: 2 }} />
            
            <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 30px', boxSizing: 'border-box' }}>
              <div style={{ zIndex: 10, position: 'relative' }}>
                {battleInstance && renderGauge(battleInstance.pc2, currentPc2Scar, '#ff5252')}
              </div>
              
              <img 
                src={process.env.PUBLIC_URL + bossImage} 
                alt={bossName} 
                className={`boss-battle-image boss-anim-${bossAnim}${ [4, 8, 12].includes(stageCycle) ? ' is-large' : ''}`} 
                style={{ 
                    position: [4, 8, 12].includes(stageCycle) ? 'absolute' : 'relative',
                    left: [4, 8, 12].includes(stageCycle) ? '50%' : 'auto',
                    height: [4, 8, 12].includes(stageCycle) ? '235px' : '200px', 
                    width: [4, 8, 12].includes(stageCycle) ? '100%' : 'auto',
                    maxWidth: [4, 8, 12].includes(stageCycle) ? 'none' : '60%',
                    objectFit: 'contain', 
                    filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.9)) drop-shadow(0 0 5px rgba(255,255,255,0.2))',
                    zIndex: 5,
                    transform: [4, 8, 12].includes(stageCycle) ? 'translateX(-50%)' : 'none'
                }} 
              />
              
              <div style={{ zIndex: 10, position: 'relative' }}>
                {battleInstance && renderGauge(battleInstance.pc1, currentPc1Scar, '#2196f3')}
              </div>
            </div>
            
            {bossAnim === 'damage' && <div className="damage-flash" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.5)', zIndex: 10 }} />}
            {popupDamage && <div className={`damage-popup type-${popupDamage.type}`} key={Math.random()} style={{ position: 'absolute', top: '50%', left: popupDamage.type === 'enemy' ? '50%' : '30%', transform: 'translate(-50%, -50%)', fontSize: '32px', fontWeight: 'bold', color: '#ff0', textShadow: '2px 2px 0 #000', zIndex: 20 }}>{popupDamage.value}</div>}
            
            {activeSkillIcon && (
              <div key={Math.random()} className={`skill-activation-overlay side-${activeSkillIcon.side}`} style={{
                position: 'absolute',
                top: '50%',
                left: activeSkillIcon.side === 'player' ? '70%' : '30%',
                transform: 'translate(-50%, -50%)',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'skillPopIn 1.2s ease-out forwards'
              }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: '5px', borderRadius: '5px', border: '2px solid #fff', boxShadow: '0 0 15px #fff' }}>
                  <img src={process.env.PUBLIC_URL + activeSkillIcon.icon} alt={activeSkillIcon.name} style={{ width: '60px', height: '60px', display: 'block' }} />
                </div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginTop: '5px', textShadow: '0 0 5px #000, 2px 2px 2px #000', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px' }}>{activeSkillIcon.name}</div>
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,50,0.9)', borderTop: '2px solid #fff', padding: '10px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '0 5px' }}>
            <button disabled={currentRoundIdx === 0} onClick={goBack} style={{ padding: '5px 15px', background: '#000', color: '#fff', border: '1px solid #fff', borderRadius: '0', cursor: 'pointer', opacity: currentRoundIdx === 0 ? 0.3 : 1, fontFamily: 'monospace' }}>{'<'}</button>
            <button disabled={roundFinished[currentRoundIdx] && currentRoundIdx === rounds.length - 1} onClick={goNext} style={{ padding: '5px 15px', background: '#000', color: '#fff', border: '1px solid #fff', borderRadius: '0', cursor: 'pointer', opacity: (roundFinished[currentRoundIdx] && currentRoundIdx === rounds.length - 1) ? 0.3 : 1, fontFamily: 'monospace' }}>{!roundFinished[currentRoundIdx] ? 'SKIP' : '>'}</button>
          </div>
          <div ref={scrollRef} className="rich-log-modern" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', marginTop: '0', scrollbarWidth: 'none' }}>
            {currentRoundLines.slice(0, roundVisibleCounts[currentRoundIdx]).map((line, i) => {
              let style: React.CSSProperties = { marginBottom: '12px', opacity: 0, transform: 'translateY(10px)', animation: 'slideUp 0.3s forwards' };
              if (line.includes('VS')) {
                const [p1, p2] = line.split('VS');
                return (
                  <div key={i} className="battle-start-header" style={{ margin: '30px 0', textAlign: 'center', animation: 'zoomIn 0.8s forwards', background: 'linear-gradient(90deg, transparent, rgba(255,82,82,0.2), transparent)', padding: '20px 0', borderTop: '2px solid #ff5252', borderBottom: '2px solid #ff5252', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '10px' }}>BATTLE START</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'nowrap' }}>
                      <span className="battle-start-player-name" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{p1.trim()}</span>
                      <span className="battle-start-vs" style={{ fontSize: '2.5rem', fontWeight: 'black', color: '#ff5252', fontStyle: 'italic' }}>VS</span>
                      <span className="battle-start-enemy-name" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff5252', textShadow: '0 0 10px rgba(255,82,82,0.5)', whiteSpace: 'nowrap' }}>{p2.trim()}</span>
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
            <div style={{ height: '100px' }} />
          </div>
        </div>
      </div>
    );
  };

  const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];

  useEffect(() => {
    if (gameStarted && battleResults.length > 0) {
      const winCount = battleResults.filter(r => r.winner === 1).length;
      const isVictory = stageMode === 'BOSS' ? winCount >= 1 : winCount === 10;
      
      if (isVictory) {
          setStageVictorySkills(prev => {
              const next = { ...prev, [`${stageMode}_${stageCycle}`]: selectedPlayerSkills };
              localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(next));
              return next;
          });
          if (stageMode === 'BOSS' && logComplete) { setShowBossClearPanel(true); triggerVictoryConfetti(); }
      }
    }
  }, [gameStarted, stageMode, battleResults, stageCycle, selectedPlayerSkills, logComplete]);

  if (isTitle) {
    if (!isAssetsLoaded) {
      return (
        <div className="TitleScreenContainer" style={{ backgroundColor: '#000' }} />
      );
    }

    const hasSaveData = !!localStorage.getItem('shiden_stage_cycle');

    return (
      <div className="TitleScreenContainer">
        <div className="TitleBackgroundEffect"></div>
        <div className="TitleContent">
          <div className="TitleLogoWrapper">
            <img src={process.env.PUBLIC_URL + '/images/title/titlelogo.png'} alt="紫電一閃" className="TitleLogo" />
          </div>
          <div className="TitleMenu">
            <button className="TitleButton neon-blue" onClick={handleNewGame}>NEW GAME</button>
            <button className="TitleButton neon-gold" onClick={handleContinue} disabled={!hasSaveData}>CONTINUE</button>
          </div>
          <div className="TitleFooter">
            <div style={{ marginBottom: '5px', color: '#00d2ff', fontSize: '0.9rem', textShadow: '0 0 5px rgba(0,210,255,0.5)' }}>
              Active Users: {activeUsers}
            </div>
            © 2026 Shiden-Game
            <div 
              onDoubleClick={() => setShowAdmin(true)} 
              style={{ position: 'fixed', bottom: 0, left: 0, width: '50px', height: '50px', opacity: 0, cursor: 'default' }} 
            />
          </div>
        </div>
        {showAdmin && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#1a1a1a', border: '2px solid #ff5252', padding: '20px', borderRadius: '10px', zIndex: 10000, boxShadow: '0 0 20px #000' }}>
            <h2 style={{ color: '#ff5252', marginTop: 0 }}>管理者パネル</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                <button key={n} onClick={() => {
                  setStageCycle(n);
                  setStageMode('MID');
                  localStorage.setItem('shiden_stage_cycle', n.toString());
                  localStorage.setItem('shiden_stage_mode', 'MID');
                  setIsTitle(false);
                  setShowAdmin(false);
                }} style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>Stage {n}</button>
              ))}
            </div>
            <button onClick={() => setShowAdmin(false)} style={{ width: '100%', padding: '10px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>閉じる</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="AppContainer" style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#eee' }}>
      <div className={`MainGameArea stage-${stageCycle}`} style={{ flex: 2, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', backgroundColor: 'rgba(10, 10, 10, 0.7)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px 40px', border: '2px solid #555', borderRadius: '15px', background: '#1a1a1a', position: 'relative', width: '100%', maxWidth: '800px', boxSizing: 'border-box' }}>
          <button onClick={() => setIsTitle(true)} style={{ position: 'absolute', left: '10px', top: '10px', padding: '5px 10px', fontSize: '10px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer' }}>TITLE</button>
          <h1 style={{ margin: 0, color: stageMode === 'MID' ? '#4fc3f7' : '#ff5252', fontSize: '1.5rem' }}>{stageMode === 'MID' ? `${currentStageInfo.no}. ${currentStageInfo.name}` : `VS ${currentStageInfo.bossName}`}</h1>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.9rem' }}>{stageMode === 'MID' ? (stageCycle === 11 ? '100人の敵を倒せ！(勝率80%で通過)' : '10戦全勝してボスに挑め！') : '敵の構成を見て対策を練れ！'}</p>
          <div style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 10 }}>
            <button 
              onClick={() => setShowSettings(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888' }}
              title="設定"
            >
              ⚙️
            </button>
          </div>
        </div>

        {!gameStarted && stageMode === 'MID' && (
          <div style={{ width: '100%', maxWidth: '800px', height: '200px', marginBottom: '20px', backgroundImage: `url(${process.env.PUBLIC_URL}/images/background/${stageCycle}.${stageCycle === 8 ? 'png' : 'jpg'})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '10px', border: '2px solid #4fc3f7', boxSizing: 'border-box' }} />
        )}

        {((stageMode === 'BOSS' && !gameStarted && !battleResults[0]?.winner) || (stageMode === 'MID' && !gameStarted && stageVictorySkills[`${stageMode}_${stageCycle}`]?.length > 0)) && (
          <div className="BossSkillPreview" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '20px', border: `2px solid ${stageMode === 'BOSS' ? '#ff5252' : '#4fc3f7'}`, borderRadius: '10px', background: stageMode === 'BOSS' ? '#2c0a0a' : '#0a1a2c', boxSizing: 'border-box' }}>
            {stageMode === 'BOSS' && (
              <>
                <h2 style={{ color: '#ff5252', textAlign: 'center', margin: '0 0 10px 0', fontSize: '1.2rem' }}>BOSS SKILLS DISCLOSED</h2>
                <div className="boss-skill-grid">{bossSkills.map((skill, index) => <div key={`boss-${index}`} className="boss-skill-card-wrapper"><SkillCard skill={skill} isSelected={false} disableTooltip={true} /></div>)}</div>
              </>
            )}
            {stageVictorySkills[`${stageMode}_${stageCycle}`] && stageVictorySkills[`${stageMode}_${stageCycle}`].length > 0 && (
              <div style={{ marginTop: stageMode === 'BOSS' ? '20px' : '0', borderTop: stageMode === 'BOSS' ? '1px dashed #ff5252' : 'none', paddingTop: stageMode === 'BOSS' ? '15px' : '0' }}>
                <h3 style={{ color: '#ffd700', fontSize: '1rem', textAlign: 'center', marginTop: '5px', marginBottom: '10px' }}>戦いの記憶</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {getSkillCardsFromAbbrs(stageVictorySkills[`${stageMode}_${stageCycle}`]).map((skill, idx) => (
                    <img key={idx} src={process.env.PUBLIC_URL + skill.icon} alt={skill.name} title={skill.name} style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid #ffd700' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedPlayerSkills.length > 0 && (
          <div className="SelectedSkillsPanel" ref={panelRef} style={{ position: 'relative', marginBottom: '20px', width: '100%', maxWidth: '800px', padding: '15px 0px 15px 0px', border: '1px solid #333', borderRadius: '10px', background: '#121212' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
              <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur" /><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffeb3b" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter></defs>
              {lineCoords.map((coord, idx) => (
                <g key={idx}>
                  <line x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffeb3b" strokeWidth="20" strokeOpacity="0.5" filter="url(#glow)" />
                  <line x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffff00" strokeWidth="10" strokeOpacity="0.8" filter="url(#glow)" />
                  <line x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} stroke="#ffffff" strokeWidth="4" strokeDasharray="15 10" filter="url(#glow)"><animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" repeatCount="indefinite" /></line>
                </g>
              ))}
            </svg>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2 }}>{getSkillCardsFromAbbrs(selectedPlayerSkills).map((skill, index) => { const isConnected = connections.some(c => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`); const isDimmed = dimmedIndices.includes(index); return <SkillCard key={`${skill.abbr}-${index}`} id={`selected-skill-${index}`} skill={skill} isSelected={true} isConnected={isConnected} isDimmed={isDimmed} onClick={gameStarted ? undefined : handleSelectedSkillClick} iconMode={iconMode} />; })}</div>
          </div>
        )}

        {showSettings && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '2px solid #fff', padding: '30px', borderRadius: '10px', width: '400px', textAlign: 'center' }}>
              <h2 style={{ color: '#4fc3f7', marginBottom: '20px' }}>設定</h2>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '10px' }}>オーディオ設定</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: '#222', padding: '15px', borderRadius: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>BGM再生</span>
                    <button 
                      onClick={() => setBgmEnabled(!bgmEnabled)} 
                      style={{ padding: '5px 15px', background: bgmEnabled ? '#28a745' : '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {bgmEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div style={{ width: '100%', marginTop: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.8rem', marginBottom: '5px' }}>
                      <span>音量</span>
                      <span>{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={bgmVolume} 
                      onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '15px' }}>アイコン表示モード</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setIconMode('ORIGINAL')} style={{ padding: '10px', background: iconMode === 'ORIGINAL' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>元のアイコン</button>
                  <button onClick={() => setIconMode('ABBR')} style={{ padding: '10px', background: iconMode === 'ABBR' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>スキルの略字</button>
                  <button onClick={() => setIconMode('PHONE')} style={{ padding: '10px', background: iconMode === 'PHONE' ? '#4fc3f7' : '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>電話番号風 (0-9, A-Z)</button>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ padding: '10px 30px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>閉じる</button>
            </div>
          </div>
        )}

        {!gameStarted && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div className="PlayerSkillSelection" style={{ marginBottom: '20px', width: '100%', padding: '15px 0px 15px 0px', border: '1px solid #333', borderRadius: '10px', background: '#121212' }}>
              <h2 style={{ padding: '0px 0px 0px 20px', color: '#4fc3f7' }}>所持スキルから編成してください</h2>
              <div className= "skill-card-grid">{availablePlayerCards.map((skill) => <SkillCard key={skill.abbr} skill={skill} isSelected={selectedPlayerSkills.some(s => s === skill.abbr)} onClick={handlePlayerSkillSelectionClick} iconMode={iconMode} />)}</div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-around', width: '100%' }}><button onClick={handleStartGame} disabled={selectedPlayerSkills.length !== PLAYER_SKILL_COUNT} style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: selectedPlayerSkills.length === PLAYER_SKILL_COUNT ? '#28a745' : '#cccccc', color: 'white', border: 'none', borderRadius: '5px' }}>戦闘開始</button></div>
            </div>
          </div>
        )}

        {gameStarted && (logComplete || stageMode === 'MID') && (
          <div className="ResultsOverview" style={{ marginTop: '0px', width: '100%', maxWidth: '800px' }}>
            {stageCycle === 11 && stageMode === 'MID' && winRateDisplay !== null && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '30px', background: '#000', border: '3px solid #ff5252', borderRadius: '15px', boxShadow: '0 0 20px rgba(255,82,82,0.5)' }}>
                <h2 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '1rem' }}>WIN RATE</h2>
                <div style={{ fontSize: '5rem', fontWeight: 'bold', color: winRateDisplay >= 70 ? '#66bb6a' : '#ff5252', textShadow: `0 0 15px ${winRateDisplay >= 70 ? '#66bb6a' : '#ff5252'}`, fontFamily: 'monospace' }}>
                  {winRateDisplay}%
                </div>
                {!stage10TrialActive && (
                  <div style={{ marginTop: '10px', fontSize: '1.5rem', fontWeight: 'bold', color: winRateDisplay >= 80 ? '#66bb6a' : '#ff5252' }}>
                    {winRateDisplay >= 80 ? 'SUCCESS - TARGET REACHED' : 'FAILED - 80% REQUIRED'}
                  </div>
                )}
              </div>
            )}
            {rewardSelectionMode && (
              <div className="RewardSelection" style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#1a1a00', border: '2px solid #ffd700', borderRadius: '10px' }}>
                <h2 style={{ color: '#ffd700', margin: '0 0 15px 0' }}>{battleResults.every(r => r.winner === 1) ? '全員倒した！' : '修行するぞ！'}スキルを1つ選んでください</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>{getAvailableSkillsUntilStage(stageCycle).map(skill => { if (ownedSkillAbbrs.includes(skill.abbr)) return null; return <div key={skill.abbr} onClick={() => handleRewardSelection(skill.abbr)} style={{ cursor: 'pointer' }}><SkillCard skill={skill} isSelected={selectedRewards.includes(skill.abbr)} iconMode={iconMode} /></div>; })}</div>
                <button disabled={selectedRewards.length === 0} onClick={confirmRewards} style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>スキルを獲得する</button>
                <div style={{ marginTop: '15px' }}><button onClick={() => { setSelectedRewards([]); setRewardSelectionMode(false); if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle(); }} style={{ padding: '8px 20px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>報酬を受け取らない</button></div>
              </div>
            )}
            {(canGoToBoss && (stageMode === 'MID' || showBossClearPanel)) && !rewardSelectionMode && !stage10TrialActive && (
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#2e7d32', borderRadius: '10px' }}>
                <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>{stageMode === 'MID' ? 'ボスへの道が開かれた！' : <>{currentStageInfo.bossName}撃破！<br />素晴らしいです！！</>}</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <button onClick={stageMode === 'MID' ? goToBossStage : clearBossAndNextCycle} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: '#fff', color: '#2e7d32', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>{stageMode === 'MID' ? 'ボスステージへ進む' : '次のステージへ進む'}</button>
                    {stageMode === 'BOSS' && stageCycle === 12 && (
                        <button onClick={async () => {
                            try {
                                const response = await fetch(`${process.env.PUBLIC_URL}/story/epilogue.txt`);
                                if (response.ok) {
                                    const text = await response.text();
                                    setStoryContent(text);
                                    setShowEpilogue(true);
                                }
                            } catch (e) {
                                console.error("Epilogue fetch error:", e);
                            }
                        }} style={{ padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: '#ffd700', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>エピローグ</button>
                    )}
                </div>
              </div>
            )}
            <div className="battle-results-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{battleResults.map((battle, index) => (<div key={index} className="battle-result-item" onClick={() => setShowLogForBattleIndex(index)} style={{ padding: '10px', border: `1px solid ${showLogForBattleIndex === index ? '#61dafb' : '#444'}`, borderRadius: '5px', backgroundColor: showLogForBattleIndex === index ? '#263238' : '#1e1e1e', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '10px', color: '#eee' }}><span style={{ marginRight: '10px', fontWeight: 'bold', flexShrink: 0, minWidth: '80px', color: battle.resultText === 'Win!' ? '#66bb6a' : battle.resultText === 'Lose' ? '#ef5350' : '#eee' }}>{battle.resultText}</span><div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1 }}>{battle.computerSkills.map((skill, skillIndex) => (<img key={skillIndex} src={process.env.PUBLIC_URL + skill.icon} alt={skill.name} style={{ width: '30px', height: '30px', borderRadius: '3px' }} />))}</div></div>))}</div>
            {(battleResults.length > 0 && !rewardSelectionMode && !showBossClearPanel && !stage10TrialActive && (battleResults.some(r => r.winner === 2) || (stageMode === 'MID' && !canGoToBoss))) && (<div style={{ marginTop: '20px', textAlign: 'center' }}><div style={{ color: '#ff5252', marginBottom: '10px', fontWeight: 'bold' }}>{battleResults.every(r => r.winner === 2) ? "次こそは！" : "再挑戦しましょう。"}</div><button onClick={handleResetGame} style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>再挑戦</button></div>)}
          </div>
        )}
      </div>

      <div className="GameLogFrame" style={{ flex: 1, padding: '20px', backgroundColor: 'rgba(26, 26, 26, 0.85)', color: '#f8f8f2', overflowY: 'hidden', borderLeft: '1px solid #333' }}>
        <h2 style={{ color: stageMode === 'BOSS' ? '#ff5252' : '#61dafb' }}>{showEpilogue ? 'エピローグ' : (storyContent && !gameStarted ? 'ストーリー' : (stageMode === 'BOSS' ? (logComplete && battleResults[0]?.winner === 1 ? '戦闘ログ' : 'BOSS') : 'ゲームログ'))}</h2>
        {showLogForBattleIndex !== -1 && battleResults[showLogForBattleIndex] && !showEpilogue ? (
          stageMode === 'BOSS' ? (<AnimatedRichLog log={battleResults[showLogForBattleIndex].gameLog} onComplete={() => setLogComplete(true)} immediate={false} bossImage={currentStageInfo.bossImage} bossName={currentStageInfo.bossName} battleInstance={battleResults[showLogForBattleIndex].battleInstance} />) : (<div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{battleResults[showLogForBattleIndex].gameLog}</pre></div>)
        ) : (
          storyContent ? (
            <div className="story-area" style={{ overflowY: 'auto', height: 'calc(100% - 60px)', padding: '10px', animation: 'fadeIn 1s ease-in' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'serif', fontSize: '1.1rem', lineHeight: '1.8' }}>{storyContent}</pre>
              {showEpilogue && (
                <button 
                    onClick={() => {
                        setIsTitle(true);
                        setShowEpilogue(false);
                        setStoryContent(null);
                    }}
                    style={{ marginTop: '30px', padding: '10px 20px', background: '#00d2ff', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                >
                    タイトルへ戻る
                </button>
              )}
            </div>
          ) : (
            stageMode === 'BOSS' && !showEpilogue ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                <img 
                    src={process.env.PUBLIC_URL + currentStageInfo.bossImage} 
                    alt={currentStageInfo.bossName} 
                    style={{ width: '100%', maxWidth: stageCycle === 12 ? '100%' : '150px', borderRadius: '10px', marginBottom: '20px' }} 
                />
                <h3 style={{ color: '#ff5252', fontSize: '1.5rem', marginBottom: '10px' }}>{currentStageInfo.bossName}</h3>
                <p style={{ lineHeight: '1.6', color: '#eee', textAlign: 'left', background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px' }}>{currentStageInfo.bossDescription}</p>
                </div>
            ) : ("ログがありません。")
          )
        )}
      </div>
    </div>
  );
}

export default App;
