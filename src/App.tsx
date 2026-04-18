import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ref, onValue, push, onDisconnect, set, update, serverTimestamp, query, limitToLast, get, orderByChild } from "firebase/database";
import { database, auth, googleProvider, recordAccess, getStorageUrl, saveUserSkills, loadUserSkills, resetUserSkills } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, deleteUser } from "firebase/auth";
import { Game } from './Game';
import { ALL_SKILLS, getSkillByAbbr, SkillDetail, STATUS_DATA } from './skillsData';
import { STAGE_DATA, setStageData, getAvailableSkillsUntilStage, getSkillByName, KENJU_DATA, setKenjuData, StageProcessor } from './stageData';
import { Lounge } from './Lounge';
import type { UserProfile } from './Lounge';
import { Rule } from './Rule';
import { MidStageProcessor, BossStageProcessor, KenjuStageProcessor, Stage11MidStageProcessor } from './stageProcessors';
import Lifuku from './Lifuku';
import LegalInfo from './LegalInfo';
import Kamishibai from './components/Kamishibai';
import { parseStoryText, StoryAssets } from './types/storyParser';
import { Chapter2StageFlow, Chapter2FlowStep } from './types/chapter2';
import StoryCanvas from './components/StoryCanvas';
import AudioManager from './utils/audioManager';
import AnimatedRichLog, { StageMode } from './components/AnimatedRichLog';
import SkillCard, { IconMode } from './components/SkillCard';
import GameChapter1 from './GameChapter1';
import GameChapter2 from './GameChapter2';
import StoryTitle from './components/StoryTitle';
import { GameProps, BattleResult } from './types/GameProps';
import './App.css';

// 2026/1/31 Ver 1.0リリース　やったー

const CHAPTER1_INITIAL_SKILLS = ["一"];
//const CHAPTER2_INITIAL_SKILLS = ["一", "刺", "果", "雷", "呪", "覚", "防", "影", "交", "搦", "崩", "疫", "強", "硬", "速", "逆", "裏", "先"];
const CHAPTER2_INITIAL_SKILLS = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const STORY_CANVAS_STATE_KEY = 'shiden_story_canvas_state';
const CHAPTER2_CLAIMED_REWARD_STEPS_KEY = 'shiden_chapter2_claimed_reward_steps';
const CHAPTER2_OWNED_SKILLS_KEY = 'shiden_chapter2_owned_skills';

type StoryCanvasState = {
  kind: 'story' | 'storyUrl' | 'credits';
  stageCycle?: number;
  flowIndex?: number;
  id?: string;
};

function App() {
  const [stagesLoaded, setStagesLoaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ current: 0, total: 0 });
  const [chapter2Flows, setChapter2Flows] = useState<Chapter2StageFlow[]>([]);
  const loadingImageUrl = getStorageUrl('/images/title/sailing_loop_32x32_fixed.gif');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stagesRes, kenjuRes, flowRes] = await Promise.all([
          fetch(`${process.env.PUBLIC_URL}/data/stages.json`),
          fetch(`${process.env.PUBLIC_URL}/data/kenju.json`),
          fetch(`${process.env.PUBLIC_URL}/data/chapter2_flow.json`)
        ]);

        let stagesData: any[] = [];
        let kenjuData: any[] = [];

        if (stagesRes.ok) {
          stagesData = await stagesRes.json();
          setStageData(stagesData);
        }

        if (kenjuRes.ok) {
          kenjuData = await kenjuRes.json();
          setKenjuData(kenjuData);
        }

        if (flowRes.ok) {
          const flowData = await flowRes.json();
          setChapter2Flows(flowData);
        }

        // プリロード対象の画像URLを収集
        const imageUrls = new Set<string>();
        
        // ステージ背景とボス画像
        stagesData.forEach(s => {
          if (s.no) imageUrls.add(getStorageUrl(`/images/background/${s.no}.jpg`));
          if (s.bossImage) imageUrls.add(getStorageUrl(s.bossImage));
        });

        // 剣獣背景とボス画像
        kenjuData.forEach(k => {
          if (k.background) imageUrls.add(getStorageUrl(k.background));
          if (k.image) imageUrls.add(k.image.startsWith('/') ? getStorageUrl(k.image) : k.image);
        });

        // スキルアイコン (ALL_SKILLSから収集)
        ALL_SKILLS.forEach(skill => {
            if (skill.icon) imageUrls.add(getStorageUrl(`/images/icon/${skill.icon}`));
        });

        // 共通リソース
        imageUrls.add(getStorageUrl('/images/background/background.jpg'));
        imageUrls.add(getStorageUrl('/images/title/titlelogo.png'));
        imageUrls.add(getStorageUrl('/images/title/タイトルロゴ2.png'));
        imageUrls.add(getStorageUrl('/images/chapter/Chapter1.png'));
        imageUrls.add(getStorageUrl('/images/chapter/Chapter2.png'));
        imageUrls.add(getStorageUrl('/images/title/sailing_loop_32x32_fixed.gif'));

        const urlList = Array.from(imageUrls);
        setPreloadProgress({ current: 0, total: urlList.length });

        // 画像のプリロード
        let loadedCount = 0;
        const preloadImage = (url: string) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
              loadedCount++;
              setPreloadProgress({ current: loadedCount, total: urlList.length });
              resolve(url);
            };
            img.onerror = () => {
              loadedCount++;
              setPreloadProgress({ current: loadedCount, total: urlList.length });
              resolve(url);
            };
          });
        };

        await Promise.all(urlList.map(url => preloadImage(url)));

        setStagesLoaded(true);
      } catch (e) {
        console.error("Failed to load game data:", e);
      }
    };
    loadData();
  }, []);

  const [isTitle, setIsTitle] = useState(() => {
    const savedMode = localStorage.getItem('shiden_stage_mode');
    const loungeModes = ['LOUNGE', 'MYPAGE', 'PROFILE', 'RANKING', 'DELETE_ACCOUNT', 'ADMIN_ANALYTICS'];
    if (savedMode && loungeModes.includes(savedMode)) return false;
    
    // shiden_is_title のデフォルトを true にして、明示的に開始されるまでタイトルを維持
    const saved = localStorage.getItem('shiden_is_title');
    return saved === null ? true : saved === 'true';
  });

  // タイトルに戻った時にBGMを停止
  useEffect(() => {
    if (isTitle) {
      AudioManager.getInstance().stopBgm();
    }
  }, [isTitle]);

  const [user, setUser] = useState<User | null>(null);
  const [chapter2SkillsHydrated, setChapter2SkillsHydrated] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [isAdminDebugSkillsActive, setIsAdminDebugSkillsActive] = useState(false);
  const isAdmin = user?.uid === process.env.REACT_APP_ADMIN_UID;
  const getAllDebugSkillAbbrs = () => Array.from(new Set(ALL_SKILLS.map(skill => skill.abbr)));
  const isDebugAllSkillSet = (skills: string[] | undefined) => {
    if (!skills) return false;
    const skillSet = new Set(skills);
    return getAllDebugSkillAbbrs().every(abbr => skillSet.has(abbr));
  };
  const getRegularSkills = (skills: string[] | undefined, targetChapter: number) => {
    if (!skills || isDebugAllSkillSet(skills)) {
      return targetChapter === 2 ? CHAPTER2_INITIAL_SKILLS : CHAPTER1_INITIAL_SKILLS;
    }
    return skills;
  };
  const getStoredChapter1Skills = (stageNo: number) => {
    let saved: string[] = CHAPTER1_INITIAL_SKILLS;
    try {
      const parsed = JSON.parse(localStorage.getItem('shiden_owned_skills') || '["一"]');
      if (Array.isArray(parsed)) saved = parsed;
    } catch {
      saved = CHAPTER1_INITIAL_SKILLS;
    }
    const regularSkills = getRegularSkills(saved, 1);
    const chapter1SkillAbbrs = new Set(getAvailableSkillsUntilStage(stageNo).map(skill => skill.abbr));
    const filteredSkills = chapter1SkillAbbrs.size > 0
      ? regularSkills.filter(abbr => chapter1SkillAbbrs.has(abbr))
      : regularSkills;
    return filteredSkills.includes("一") ? filteredSkills : ["一", ...filteredSkills];
  };
  const getStoredChapter2Skills = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAPTER2_OWNED_SKILLS_KEY) || 'null');
      return Array.isArray(parsed) ? getRegularSkills(parsed, 2) : CHAPTER2_INITIAL_SKILLS;
    } catch {
      return CHAPTER2_INITIAL_SKILLS;
    }
  };
  const applyAdminDebugSkills = () => {
    setIsAdminDebugSkillsActive(true);
    setSelectedPlayerSkills([]);
  };

  // タイトル画面表示中（F5等）の進行状況最新同期
  useEffect(() => {
    if (isTitle && user) {
      const profileRef = ref(database, `profiles/${user.uid}`);
      get(profileRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const firebaseUpdatedAt = data.updatedAt || 0;
          const localUpdatedAt = parseInt(localStorage.getItem('shiden_updated_at') || '0', 10);
          
          if (firebaseUpdatedAt > localUpdatedAt) {
            let firebaseStageCycle = data.stageCycle || 1;
            if (firebaseStageCycle >= 13) firebaseStageCycle = 12;
            const firebaseStageMode = data.lastGameMode as StageMode;
            const firebaseCanGoToBoss = data.canGoToBoss || false;
            
            setStageCycle(firebaseStageCycle);
            localStorage.setItem('shiden_stage_cycle', firebaseStageCycle.toString());
            if (firebaseStageMode) {
              localStorage.setItem('shiden_last_game_mode', firebaseStageMode);
              localStorage.setItem('shiden_stage_mode', firebaseStageMode);
              setStageMode(firebaseStageMode);
            }
            setCanGoToBoss(firebaseCanGoToBoss);
            localStorage.setItem('shiden_can_go_to_boss', firebaseCanGoToBoss.toString());
            localStorage.setItem('shiden_updated_at', firebaseUpdatedAt.toString());
          }
        }
      });
    }
  }, [isTitle, !!user]);

  // 初回レンダリング時に本日の剣獣を初期化
  useEffect(() => {
    refreshKenju();
  }, []);
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

  // AudioManagerの状態を同期
  useEffect(() => {
    const manager = AudioManager.getInstance();
    const unsubscribe = manager.subscribe(() => {
      setBgmEnabled(!manager.isMutedStatus());
      setBgmVolume(manager.getVolume());
    });
    return () => unsubscribe();
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showRuleHint, setShowRuleHint] = useState(false);
  const [showClearStats, setShowClearStats] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [changelogData, setChangelogData] = useState<any[]>([]);
  const [showUpdateNotify, setShowUpdateNotify] = useState(false);
  const [hasChapter2Save, setHasChapter2Save] = useState(false);
  const [showStage1Tutorial, setShowStage1Tutorial] = useState(false);
  

  useEffect(() => {
    const loadChapter2Data = async () => {
      if (user) {
        const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
        const snapshot = await get(chapter2Ref);
        if (snapshot.exists()) {
          setHasChapter2Save(true);
          const data = snapshot.val();
          if (data.stageCycle) {
            setStageCycle(data.stageCycle);
            setChapterProgress(prev => ({ ...prev, 2: data.stageCycle }));
          }
          if (data.flowIndex !== undefined) setChapter2FlowIndex(data.flowIndex);
        }
      }
    };
    loadChapter2Data();
  }, [user]);

  // 章選択管理
  const [showChapterSelect, setShowChapterSelect] = useState<{ mode: 'NEW' | 'CONTINUE' } | null>(null);
  const [chapterProgress, setChapterProgress] = useState<{ [key: number]: number }>({
    1: parseInt(localStorage.getItem('shiden_chapter1_stage') || '1', 10),
    2: parseInt(localStorage.getItem('shiden_chapter2_stage') || '13', 10) // デフォルト13に修正（第2章開始ステージ）
  });

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
    const savedStage = localStorage.getItem('shiden_stage_cycle');
    const stageNo = savedStage ? parseInt(savedStage, 10) : 1;
    // 第2章の場合は Firebase からの読み込みを待つため、初期値として第2章の初期スキルをセット
    if (stageNo >= 13) {
      return getStoredChapter2Skills();
    }
    const saved = localStorage.getItem('shiden_owned_skills');
    if (saved) {
      const savedSkills = JSON.parse(saved);
      return isDebugAllSkillSet(savedSkills) ? CHAPTER1_INITIAL_SKILLS : savedSkills;
    }
    return ["一"];
  });

  const [lastActiveProfiles, setLastActiveProfiles] = useState<{[uid: string]: number}>({});
  const [kenjuBoss, setKenjuBoss] = useState<{name: string, title: string, description: string, background: string, image: string, skills: SkillDetail[]} | null>(null);
  const [currentKenjuBattle, setCurrentKenjuBattle] = useState<{name: string, title: string, description: string, background: string, image: string, skills: SkillDetail[], isCustom?: boolean, userName?: string} | null>(() => {
    const saved = localStorage.getItem('shiden_current_kenju_battle');
    return saved ? JSON.parse(saved) : null;
  });
  const [kenjuClears, setKenjuClears] = useState<number>(0);
  const [kenjuTrials, setKenjuTrials] = useState<number>(0);
  const [deneiClears, setDeneiClears] = useState<number>(0);
  const [deneiTrials, setDeneiTrials] = useState<number>(0);
  const [isKenjuClearedEver, setIsKenjuClearedEver] = useState<boolean>(false);
  const [allKenjuClearsData, setAllKenjuClearsData] = useState<any>(null);
  const [allDeneiStats, setAllDeneiStats] = useState<{ [uid: string]: { [kenjuName: string]: { clears: number, trials: number, likes: number, isLiked?: boolean } } }>({});
  const [anonymousVictories, setAnonymousVictories] = useState<{[visitorId: string]: {[stageKey: string]: string[]}}>({});
  const [isDeneiStatsLoaded, setIsDeneiStatsLoaded] = useState(false);
  const [isLoungeDataLoaded, setIsLoungeDataLoaded] = useState(false); // 新しい状態変数

  const [currentPage, setCurrentPage] = useState(1);

  const [rewardSelectionMode, setRewardSelectionMode] = useState<boolean>(false);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [bossClearRewardPending, setBossClearRewardPending] = useState<boolean>(false);
  const [claimedRewardSteps, setClaimedRewardSteps] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAPTER2_CLAIMED_REWARD_STEPS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isRewardConfirming, setIsRewardConfirming] = useState(false);
  const rewardConfirmingRef = useRef(false);

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

  const [chapter2FlowIndex, setChapter2FlowIndex] = useState<number>(() => {
    const saved = localStorage.getItem('shiden_chapter2_flow_index');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Determine which chapter component to render
  const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
  const isChapter2 = (currentStage?.chapter && currentStage.chapter >= 2) || stageCycle >= 13;
  const chapter = isChapter2 ? 2 : 1;

  const saveStoryCanvasState = (state: StoryCanvasState) => {
    localStorage.setItem(STORY_CANVAS_STATE_KEY, JSON.stringify(state));
  };

  const clearStoryCanvasState = () => {
    localStorage.removeItem(STORY_CANVAS_STATE_KEY);
  };

  const getRewardStepKey = (stageNo: number = stageCycle, flowIndex: number = chapter2FlowIndex) => `${stageNo}:${flowIndex}`;

  const saveClaimedRewardSteps = (steps: string[]) => {
    const uniqueSteps = Array.from(new Set(steps));
    setClaimedRewardSteps(uniqueSteps);
    localStorage.setItem(CHAPTER2_CLAIMED_REWARD_STEPS_KEY, JSON.stringify(uniqueSteps));
    return uniqueSteps;
  };

  useEffect(() => {
    localStorage.setItem('shiden_chapter2_flow_index', chapter2FlowIndex.toString());
    if (isChapter2) {
      if (user) {
        const flowIndexRef = ref(database, `profiles/${user.uid}/chapter2/flowIndex`);
        set(flowIndexRef, chapter2FlowIndex);
      }
    }
  }, [chapter2FlowIndex, isChapter2, user]);

  // 互換性のための chapter2SubStage (フロー内の battle ステップに割り当てられる subStage)
  const chapter2SubStage = React.useMemo(() => {
    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    if (!flow) return 1;
    const step = flow.flow[chapter2FlowIndex];
    return step?.subStage || 1;
  }, [chapter2Flows, stageCycle, chapter2FlowIndex]);

  // 第2章の次のステップへ進む
  const moveToNextStep = async (currentFlow?: Chapter2StageFlow, currentIndex?: number, ignoreTitle: boolean = false): Promise<void> => {
    // 遷移開始時に一旦ストーリーモーダルを閉じる状態にする
    setShowStoryModal(false);
    
    const flow = currentFlow || chapter2Flows.find(f => f.stageNo === stageCycle);
    if (!flow) return;
    
    const nextIndex = (currentIndex !== undefined ? currentIndex : chapter2FlowIndex) + 1;
    if (nextIndex < flow.flow.length) {
      const nextStep = flow.flow[nextIndex];
      
      if (nextStep.type === 'story') {
        // 第2章でかつ "-1" で終わるストーリー（第1節）の場合、タイトルを表示
        if (!ignoreTitle && nextStep.id?.endsWith('-1')) {
          setChapter2FlowIndex(nextIndex); // インデックスだけ進めておく
          setShowChapterTitle(true);
          return; 
        }
        const data = await loadV2Story(nextStep.id!);
        if (data) {
          setChapter2FlowIndex(nextIndex);
          setStoryContentV2(data);
          saveStoryCanvasState({ kind: 'story', stageCycle, flowIndex: nextIndex, id: nextStep.id });
          setShowStoryModal(true);
        } else {
          // ストーリーが無い場合はさらに次へ
          return moveToNextStep(flow, nextIndex);
        }
      } else if (nextStep.type === 'title') {
        setChapter2FlowIndex(nextIndex);
        setShowChapter2Title(true);
        AudioManager.getInstance().playBgm("海賊の意志");
      } else if (nextStep.type === 'reward') {
        clearStoryCanvasState();
        setChapter2FlowIndex(nextIndex);
        const rewardStepKey = getRewardStepKey(stageCycle, nextIndex);
        if (claimedRewardSteps.includes(rewardStepKey)) {
          setSelectedRewards([]);
          setRewardSelectionMode(false);
          return moveToNextStep(flow, nextIndex);
        }
        setSelectedRewards([]); // 報酬選択前にリセット
        if (nextStep.skill) {
          setSelectedRewards([nextStep.skill]);
        }
        setRewardSelectionMode(true);
        // 大ボス撃破後のステップならクリアパネルも出す
        if (flow.flow[nextIndex - 1]?.subStage === 2) {
          setShowBossClearPanel(true);
        }
      } else if (nextStep.type === 'battle') {
        clearStoryCanvasState();
        setChapter2FlowIndex(nextIndex);
        setStageMode('BOSS');
        handleResetGame();
      } else if (nextStep.type === 'credits') {
        setChapter2FlowIndex(nextIndex);
        setCreditsUrl(nextStep.id || '/data/credits.json');
        saveStoryCanvasState({ kind: 'credits', stageCycle, flowIndex: nextIndex, id: nextStep.id || '/data/credits.json' });
        setShowStoryModal(true);
      }
    } else {
      // ステージクリア、次のサイクルへ
      clearStoryCanvasState();
      clearBossAndNextCycle();
    }
  };
  const stageProcessor = React.useMemo<StageProcessor>(() => {
    // console.log(`[StageProcessor] Creating processor for Mode: ${stageMode}, Cycle: ${stageCycle}`);
    if (stageMode === 'KENJU' || stageMode === 'DENEI') return new KenjuStageProcessor();
    if (stageMode === 'BOSS') return new BossStageProcessor();
    if (stageMode === 'MID') {
      if (stageCycle === 11) return new Stage11MidStageProcessor();
      const currentStage = (STAGE_DATA || []).find(s => s.no === stageCycle);
      if (currentStage?.chapter && currentStage.chapter >= 2) {
        return new BossStageProcessor(); // 第2章は中間ステージもボス戦の挙動にする
      }
      return new MidStageProcessor();
    }
    return new MidStageProcessor();
  }, [stageMode, stageCycle, stagesLoaded]);


  const [bossSkills, setBossSkills] = useState<SkillDetail[]>([]);
  const [canGoToBoss, setCanGoToBoss] = useState<boolean>(() => {
    const saved = localStorage.getItem('shiden_can_go_to_boss');
    return saved === 'true';
  });

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [showLogForBattleIndex, setShowLogForBattleIndex] = useState<number>(-1);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [storyContentV2, setStoryContentV2] = useState<any[] | null>(null);
  const [storyUrl, setStoryUrl] = useState<string | null>(null);
  const [creditsUrl, setCreditsUrl] = useState<string | null>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showChapterTitle, setShowChapterTitle] = useState(false);
  const [isStoryTransitioning, setIsStoryTransitioning] = useState(false);
  const [isAdminTitlePreview, setIsAdminTitlePreview] = useState(false);
  const [showChapter2Title, setShowChapter2Title] = useState(false);
  const [isTitleFadingOut, setIsTitleFadingOut] = useState(false);
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
    chapter,
    stageCycle,
    kenjuBoss: (stageMode === 'DENEI' || stageMode === 'KENJU') ? (currentKenjuBattle || kenjuBoss || undefined) : undefined,
    selectedPlayerSkills,
    midEnemyData,
    userName: myProfile?.displayName,
    chapter2SubStage
  }), [stageCycle, stageMode, currentKenjuBattle, kenjuBoss, selectedPlayerSkills, midEnemyData, myProfile, chapter2SubStage, chapter]);

  const lastSavedVictoryRef = useRef<string>("");

const PLAYER_SKILL_COUNT = 5;

  const getSkillCardsFromAbbrs = (abbrs: string[]) => {
    return abbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
  };

  const loadV2Story = async (filenameBase: string) => {
    try {
      // story_assets.json も読み込む
      const assetsResponse = await fetch('/data/story_assets.json');
      const assets: StoryAssets = await assetsResponse.json();

      let response = await fetch(`story/v2/${filenameBase}.txt`);
      if (response.ok) {
        const text = await response.text();
        return parseStoryText(text, assets);
      }
    } catch (e) {
      console.error("Story load error:", e);
    }
    return null;
  };

  const restoredStoryCanvasRef = useRef(false);

  useEffect(() => {
    if (restoredStoryCanvasRef.current || !stagesLoaded || chapter2Flows.length === 0) return;
    restoredStoryCanvasRef.current = true;

    const saved = localStorage.getItem(STORY_CANVAS_STATE_KEY);
    if (!saved) return;

    const restoreStoryCanvas = async () => {
      try {
        const state = JSON.parse(saved) as StoryCanvasState;
        if (!state.kind) return;

        if (state.stageCycle) {
          setStageCycle(state.stageCycle);
          localStorage.setItem('shiden_stage_cycle', state.stageCycle.toString());
          if (state.stageCycle >= 13) setStageMode('BOSS');
        }
        if (state.flowIndex !== undefined) {
          setChapter2FlowIndex(state.flowIndex);
          localStorage.setItem('shiden_chapter2_flow_index', state.flowIndex.toString());
        }

        setGameStarted(false);
        setIsTitle(false);
        setStoryContent(null);

        if (state.kind === 'storyUrl' && state.id) {
          setStoryUrl(state.id);
          setCreditsUrl(null);
          setStoryContentV2(null);
          setShowStoryModal(true);
          return;
        }

        if (state.kind === 'credits') {
          const flow = chapter2Flows.find(f => f.stageNo === state.stageCycle);
          const step = state.flowIndex !== undefined ? flow?.flow[state.flowIndex] : undefined;
          setStoryUrl(null);
          setCreditsUrl(state.id || step?.id || '/data/credits.json');
          setStoryContentV2(null);
          setShowStoryModal(true);
          return;
        }

        const flow = chapter2Flows.find(f => f.stageNo === state.stageCycle);
        const step = state.flowIndex !== undefined ? flow?.flow[state.flowIndex] : undefined;
        const storyId = state.id || step?.id;
        if (storyId) {
          const data = await loadV2Story(storyId);
          if (data) {
            setStoryUrl(null);
            setCreditsUrl(null);
            setStoryContentV2(data);
            setShowStoryModal(true);
            return;
          }
        }

        clearStoryCanvasState();
      } catch (e) {
        console.error("Story restore error:", e);
        clearStoryCanvasState();
      }
    };

    restoreStoryCanvas();
  }, [chapter2Flows, stagesLoaded]);

  useEffect(() => {
    const fetchStory = async () => {
      if (stageMode === 'MID' && !gameStarted) {
        // ストーリー表示の条件判定を整理
        const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
        if (stageCycle >= 13 && !isAdmin && !currentStage?.chapter) {
           // 未実装ステージなどのガード
           setStoryContent(null);
           setStoryContentV2(null);
           return;
        }

        // オープニング表示中（storyUrlがセットされている）ならfetchをスキップ
        if (storyUrl) {
            setStoryContent(null);
            setStoryContentV2(null);
            return;
        }

        try {
          if (currentStage?.chapter && currentStage.chapter >= 2) {
            // 第2章以降 (JSONフローに基づく)
            const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
            const step = flow?.flow[chapter2FlowIndex];
            if (step?.type === 'story') {
              const data = await loadV2Story(step.id!);
              if (data) {
                setStoryContentV2(data);
                setStoryContent(null);
              } else {
                setStoryContentV2(null);
              }
            } else {
              setStoryContentV2(null);
            }
          } else {
            // 第1章（Stage 1-12）
            const response = await fetch(`${process.env.PUBLIC_URL}/story/${stageCycle}.txt`);
            if (response.ok) {
              const text = await response.text();
              setStoryContent(text);
              setStoryContentV2(null);
            }
          }
        } catch (e) {
          console.error("Story fetch error:", e);
        }
      } else {
        // ゲーム中や他のモードではストーリーデータをクリア
        if (!storyUrl && !showStoryModal && !localStorage.getItem(STORY_CANVAS_STATE_KEY)) { // オープニング・StoryCanvas表示中以外
            setStoryContent(null);
            setStoryContentV2(null);
        }
      }
    };
    fetchStory().then(() => {
      // ストーリーが読み込まれたらモーダルを表示
      if (!gameStarted && !showStoryModal) {
        const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
        const shouldOpenStoryCanvas = storyUrl || (!!storyContentV2 && !!currentStage?.chapter && currentStage.chapter >= 2);
        if (shouldOpenStoryCanvas) {
          const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
          const step = flow?.flow[chapter2FlowIndex];
          if (storyUrl) {
            saveStoryCanvasState({ kind: 'storyUrl', stageCycle, flowIndex: chapter2FlowIndex, id: storyUrl });
          } else if (step?.type === 'story' && step.id) {
            saveStoryCanvasState({ kind: 'story', stageCycle, flowIndex: chapter2FlowIndex, id: step.id });
          }
          setShowStoryModal(true);
        }
        // 第1章のテキストストーリー (storyContent) はモーダルを自動表示せず、サイドバー（復活）に任せる
      }
    });

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
      const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle);
      const isChapter2 = currentStageInfo?.chapter === 2;
      const getAvailableOwnedSkills = () => {
        let skillAbbrs = isAdminDebugSkillsActive ? getAllDebugSkillAbbrs() : ownedSkillAbbrs;
        if (!isChapter2 && !isAdminDebugSkillsActive) {
          const availableChapter1SkillAbbrs = new Set(getAvailableSkillsUntilStage(stageCycle).map(skill => skill.abbr));
          skillAbbrs = skillAbbrs.filter(abbr => abbr === "一" || availableChapter1SkillAbbrs.has(abbr));
        }
        const owned = skillAbbrs.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
        return owned.sort((a, b) => {
          // 神業スキルを最優先
          if (a.kamiwaza === 1 && b.kamiwaza !== 1) return -1;
          if (a.kamiwaza !== 1 && b.kamiwaza === 1) return 1;

          const indexA = ALL_SKILLS.findIndex(s => s.abbr === a.abbr);
          const indexB = ALL_SKILLS.findIndex(s => s.abbr === b.abbr);
          return indexA - indexB;
        });
      };
      
      const available = getAvailableOwnedSkills();
      setAvailablePlayerCards(available);

      if (!isChapter2) {
        setShowLogForBattleIndex(-1);
        setCanGoToBoss(false);
      }
    }
  }, [gameStarted, ownedSkillAbbrs, isAdminDebugSkillsActive, stageCycle, stageMode, chapter2FlowIndex]);

  useEffect(() => {
    if (!isChapter2 || chapter2Flows.length === 0 || showStoryModal || showChapterTitle || showChapter2Title || isStoryTransitioning) return;

    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    const currentStep = flow?.flow[chapter2FlowIndex];
    if (currentStep?.type === 'reward' && claimedRewardSteps.includes(getRewardStepKey())) {
      setSelectedRewards([]);
      setRewardSelectionMode(false);
      if (user) {
        update(ref(database, `profiles/${user.uid}/chapter2`), {
          ownedSkills: ownedSkillAbbrs,
          claimedRewardSteps,
          flowIndex: chapter2FlowIndex,
          lastUpdated: serverTimestamp()
        });
      }
      moveToNextStep();
    }
  }, [isChapter2, chapter2Flows, stageCycle, chapter2FlowIndex, claimedRewardSteps, showStoryModal, showChapterTitle, showChapter2Title, isStoryTransitioning, user, ownedSkillAbbrs]);

  useEffect(() => {
    if (stageMode === 'BOSS' && stagesLoaded) {
      const currentStage = (STAGE_DATA || []).find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
      if (!currentStage) return;
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
    if (isChapter2) {
      if (user && !chapter2SkillsHydrated) return;
      localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(ownedSkillAbbrs));
      if (user) {
        saveUserSkills(user.uid, ownedSkillAbbrs);
      }
    } else {
      localStorage.setItem('shiden_owned_skills', JSON.stringify(ownedSkillAbbrs));
    }
  }, [ownedSkillAbbrs, isChapter2, user, chapter2SkillsHydrated]);

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
    if (isChapter2) {
      if (user) {
        const bossRef = ref(database, `profiles/${user.uid}/chapter2/canGoToBoss`);
        set(bossRef, canGoToBoss);
      }
    } else {
      localStorage.setItem('shiden_can_go_to_boss', canGoToBoss.toString());
    }
  }, [canGoToBoss, isChapter2, user]);

  useEffect(() => {
    localStorage.setItem('shiden_use_rich_log', useRichLog.toString());
  }, [useRichLog]);

  useEffect(() => {
    // LIFUKUモード中はタイトル復帰フラグを上書きしない（リロード時にタイトルに戻るようにする）
    if (stageMode !== 'LIFUKU') {
      localStorage.setItem('shiden_is_title', isTitle.toString());
    }
  }, [isTitle, stageMode]);

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
      
      // サインアウト時にローカルの進行状況をクリア（別ユーザでのログイン時に混ざらないように）
      localStorage.removeItem('shiden_stage_cycle');
      localStorage.removeItem('shiden_owned_skills');
      localStorage.removeItem('shiden_stage_mode');
      localStorage.removeItem('shiden_last_game_mode');
      localStorage.removeItem('shiden_can_go_to_boss');
      localStorage.removeItem('shiden_stage_victory_skills');
      localStorage.removeItem('shiden_updated_at');
      localStorage.removeItem('shiden_medals');
      localStorage.removeItem('shiden_uid');
      
      setStageMode('MID');
      setIsTitle(true);
      
      // リロードして状態を完全に初期化
      window.location.reload();
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
    const kenjuBase = (KENJU_DATA || [])[index % KENJU_DATA.length] || (KENJU_DATA || [])[0];
    if (!kenjuBase) return null;
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
    if (!kenju) return;
    console.log("Daily Kenju Generated:", kenju);
    setKenjuBoss(kenju as any);

    // クリア人数データを購読
    const kenjuClearsRootRef = ref(database, `kenjuClears`);
    const unsubClears = onValue(kenjuClearsRootRef, (snapshot) => {
      setAllKenjuClearsData(snapshot.val());
    });

    const trialsRef = ref(database, `kenjuTrials/${new Date().toLocaleDateString().replace(/\//g, '-')}/${kenju.name}`);
    const unsubTrials = onValue(trialsRef, (snapshot) => {
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

    const interval = setInterval(fetchChangelogAndCheckVersion, 1000 * 60 * 60);

    return () => {
      unsubClears();
      unsubTrials();
      clearInterval(interval);
    };
  }, []);

  // ロード完了後に本日の剣獣を初期化
  useEffect(() => {
    if (stagesLoaded) {
      const cleanup = refreshKenju();
      return cleanup;
    }
  }, [stagesLoaded, refreshKenju]);

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
    if (!user) {
      return;
    }
    // 1. まず現在のプロフィールを特定 (myProfileがあればそれを使う、なければ取得)
    const profileRef = ref(database, `profiles/${user.uid}`);
    let currentProfile = myProfile;
    if (!currentProfile || currentProfile.uid !== user.uid) {
      const snapshot = await get(profileRef);
      currentProfile = snapshot.val();
    }
    
    if (!currentProfile) {
      return;
    }
    const currentHighscore = currentProfile.lifukuHighscore || 0;
    if (score > currentHighscore || (currentHighscore === 0 && score > 0)) {
      const updatedProfile = {
        ...currentProfile,
        uid: user.uid,
        lifukuHighscore: score,
        lastActive: Date.now()
      };


      // 2. 楽観的UI更新: allProfiles を即座に更新してランキングに反映させる
      setAllProfiles(prev => {
        const index = prev.findIndex(p => p.uid === user.uid);
        if (index !== -1) {
          const next = [...prev];
          next[index] = updatedProfile;
          return next;
        }
        return [...prev, updatedProfile];
      });

      // 3. 非同期でDBに保存 (awaitせずにUIを優先させる)
      set(profileRef, updatedProfile).catch(err => {
        console.error("Failed to save highscore:", err);
      });
    }
  };

  const handleNewGame = async () => {
    //if (localStorage.getItem('shiden_stage_cycle') && !window.confirm('進捗をリセットして最初から始めますか？')) return;
    
    setIsAdminDebugSkillsActive(false);
    setShowChapterSelect({ mode: 'NEW' });
    
    // const now = Date.now();
    
    // // 1. まず LocalStorage を同期的に更新し、後続の onValue 発火時に備える
    // localStorage.setItem('shiden_stage_cycle', '1');
    // localStorage.setItem('shiden_owned_skills', JSON.stringify(["一"]));
    // localStorage.setItem('shiden_stage_mode', 'MID');
    // localStorage.setItem('shiden_last_game_mode', 'MID');
    // localStorage.setItem('shiden_can_go_to_boss', 'false');
    // localStorage.setItem('shiden_stage_victory_skills', JSON.stringify({}));
    // localStorage.setItem('shiden_medals', JSON.stringify([]));
    // localStorage.setItem('shiden_is_title', 'false');
    // localStorage.setItem('shiden_updated_at', now.toString());
    
    // // 2. Firebase を一括更新する（原子性を確保し、中途半端な状態での onValue 発火を防ぐ）
    // if (user) {
    //   try {
    //     await update(ref(database, `profiles/${user.uid}`), {
    //       stageCycle: 1,
    //       ownedSkills: ["一"],
    //       lastGameMode: 'MID',
    //       canGoToBoss: false,
    //       victorySkills: null,
    //       medals: [],
    //       updatedAt: now
    //     });
    //   } catch (err) {
    //     console.error("Firebase reset failed:", err);
    //   }
    // }

    // // 3. React 状態を更新
    // setIsTitle(false);
    // setStageMode('MID');
    // setStageCycle(1);
    // setOwnedSkillAbbrs(["一"]);
    // setStageVictorySkills({});
    // setCanGoToBoss(false);
    
    // // 4. 少し待ってからリロードして状態を完全にクリア
    // setTimeout(() => {
    //     window.location.reload();
    // }, 150);
  };

  const handleContinue = async () => {
    setIsAdminDebugSkillsActive(false);
    if (user) {
      const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
      const snapshot = await get(chapter2Ref);
      if (snapshot.exists()) {
        setHasChapter2Save(true);
        const data = snapshot.val();
        if (data.stageCycle) {
          setChapterProgress(prev => ({ ...prev, 2: data.stageCycle }));
        }
        if (data.flowIndex !== undefined) setChapter2FlowIndex(data.flowIndex);
      } else {
        setHasChapter2Save(false);
      }
    }
    setShowChapterSelect({ mode: 'CONTINUE' });
  };

  const backToTitle = () => {
    // タイトルに戻る際に最新の状態を同期するためにUpdatedAtを更新
    if (user) {
      const now = Date.now();
      localStorage.setItem('shiden_updated_at', now.toString());
      set(ref(database, `profiles/${user.uid}/updatedAt`), now);
    }
    setIsAdminDebugSkillsActive(false);
    setIsTitle(true);
    setStageMode(getLastGameMode());
  };

  const handleChapterSelect = async (chapter: number, isNewGame: boolean = false) => {
    setIsAdminDebugSkillsActive(false);
    // 第2章はログイン必須
    if (chapter === 2 && !user) {
      alert("第2章をプレイするにはユーザー登録（ログイン）が必要です。タイトル画面の「修行・交流（ログイン）」から登録を行ってください。");
      setStageMode('LOUNGE');
      setIsTitle(false);
      setShowChapterSelect(null);
      return;
    }

    let stage = isNewGame ? (chapter === 2 ? 13 : 1) : (chapterProgress[chapter] || (chapter === 2 ? 13 : 1));
    let flowIndex = 0;
    
    if (isNewGame) {
      if (chapter === 1) {
        localStorage.removeItem('shiden_chapter1_stage');
        setChapterProgress(prev => ({ ...prev, 1: 1 }));
      } else {
        localStorage.removeItem('shiden_chapter2_stage');
        localStorage.removeItem('shiden_chapter2_flow_index');
        setChapter2SkillsHydrated(false);
        setChapterProgress(prev => ({ ...prev, 2: 13 }));
        setChapter2FlowIndex(0);

        // 第2章のデータをFirebaseにもリセット
        if (user) {
          const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
          await set(chapter2Ref, {
            stageCycle: 13,
            flowIndex: 0,
            claimedRewardSteps: [],
            lastUpdated: serverTimestamp()
          });
          await resetUserSkills(user.uid, CHAPTER2_INITIAL_SKILLS);
        }
        saveClaimedRewardSteps([]);
        localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(CHAPTER2_INITIAL_SKILLS));
        setChapter2SkillsHydrated(true);
      }
      // NEW GAME時は所持スキルもリセット
      const initialSkills = chapter === 2 ? CHAPTER2_INITIAL_SKILLS : CHAPTER1_INITIAL_SKILLS;
      setOwnedSkillAbbrs(initialSkills);
      if (chapter === 1) {
        localStorage.setItem('shiden_owned_skills', JSON.stringify(initialSkills));
      }
    } else if (chapter === 1) {
      const chapter1Skills = getStoredChapter1Skills(stage);
      setOwnedSkillAbbrs(chapter1Skills);
      localStorage.setItem('shiden_owned_skills', JSON.stringify(chapter1Skills));
      setStoryContentV2(null);
      setStoryUrl(null);
      setShowStoryModal(false);
      setSelectedPlayerSkills([]);
    } else if (chapter === 2 && user) {
      setChapter2SkillsHydrated(false);
      // 続きからの場合、Firebaseからデータをロードして反映させる
      const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
      const snapshot = await get(chapter2Ref);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.stageCycle) stage = data.stageCycle;
        if (data.flowIndex !== undefined) {
          flowIndex = data.flowIndex;
          
          // 戦闘または報酬ステップから再開する場合、その直前のストーリーまで遡る
          const flow = chapter2Flows.find(f => f.stageNo === stage);
          if (flow && (flow.flow[flowIndex]?.type === 'battle' || flow.flow[flowIndex]?.type === 'reward')) {
            for (let i = flowIndex - 1; i >= 0; i--) {
              if (flow.flow[i].type === 'story') {
                flowIndex = i;
                break;
              }
              // タイトルや報酬ステップで止まるのもありだが、ユーザーは Story と言っているので story を探す
            }
          }

          // story ステップから再開する場合、事前にストーリーデータをロードしてモーダルを表示
          if (flow && flow.flow[flowIndex]?.type === 'story') {
            const data = await loadV2Story(flow.flow[flowIndex].id!);
            if (data) {
              setStoryContentV2(data);
              saveStoryCanvasState({ kind: 'story', stageCycle: stage, flowIndex, id: flow.flow[flowIndex].id });
              setShowStoryModal(true);
            }
          }
        }
        
        const dbSkills = await loadUserSkills(user.uid);
        const localChapter2Skills = getStoredChapter2Skills();
        const loadedSkills = dbSkills
          ? getRegularSkills(dbSkills, 2)
          : data.ownedSkills
            ? getRegularSkills(data.ownedSkills, 2)
            : CHAPTER2_INITIAL_SKILLS;
        const mergedSkills = Array.from(new Set([...loadedSkills, ...localChapter2Skills]));
        setOwnedSkillAbbrs(mergedSkills);
        localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(mergedSkills));
        setChapter2SkillsHydrated(true);
        if (Array.isArray(data.claimedRewardSteps)) {
          saveClaimedRewardSteps([...claimedRewardSteps, ...data.claimedRewardSteps]);
        }
        
        setStageCycle(stage);
        setChapter2FlowIndex(flowIndex);
      } else {
        setChapter2SkillsHydrated(true);
      }
    }

    setStageCycle(stage);
    if (chapter === 2) {
      // CONTINUEの場合は保存された flowIndex を使う。NEW GAME の場合は 0。
      setChapter2FlowIndex(isNewGame ? 0 : flowIndex);
      setStageMode('BOSS');
    } else {
      setStageMode('MID');
    }
    // 章選択時にはまだタイトル画面の状態を維持し、ストーリー終了後に false にする
    setShowChapterSelect(null);
    
    // NEW GAME時、または初回の開始時
    if (isNewGame && chapter === 2) {
      // 第2章の新規開始時のみオープニングを流す
      setStoryContent(null);
      setStoryContentV2(null);
      setStoryUrl('story/v2/opening.txt');
      saveStoryCanvasState({ kind: 'storyUrl', stageCycle: stage, flowIndex: 0, id: 'story/v2/opening.txt' });
      setShowStoryModal(true);
    } else if (isNewGame && chapter === 1) {
        // 第1章の開始時はテキストストーリーを読み込んでサイドバーに表示し、StoryCanvasは出さない
        const fetchFirstStory = async () => {
          try {
            const response = await fetch(`${process.env.PUBLIC_URL}/story/1.txt`);
            if (response.ok) {
              const text = await response.text();
              setStoryContent(text);
              setStoryContentV2(null);
              setStoryUrl(null);
              setShowStoryModal(false);
              setIsTitle(false);
            }
          } catch (e) {
            console.error("First story fetch error:", e);
            setIsTitle(false);
          }
        };
        fetchFirstStory();
    } else {
      // ストーリーがない場合は即座にタイトルを抜ける
      setIsTitle(false);
    }
  };

  useEffect(() => {
    if (allKenjuClearsData && kenjuBoss) {
      const uniqueUids = new Set<string>();
      let isClearedEver = false;
      const currentUid = user?.uid;

      // allKenjuClearsData は { [date]: { [kenjuName]: { [uid]: timestamp } } } という構造
      Object.values(allKenjuClearsData).forEach((dateData: any) => {
        if (dateData && (dateData as any)[kenjuBoss.name]) {
          Object.keys((dateData as any)[kenjuBoss.name]).forEach(uid => {
            uniqueUids.add(uid);
            if (currentUid && uid === currentUid) {
              isClearedEver = true;
            }
          });
        }
      });
      setKenjuClears(uniqueUids.size);
      setIsKenjuClearedEver(isClearedEver);
    } else {
      setKenjuClears(0);
      setIsKenjuClearedEver(false);
    }
  }, [allKenjuClearsData, kenjuBoss, user]);

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

    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      if (authenticatedUser) {
        setChapter2SkillsHydrated(false);
        // ユーザ切り替え検知：現在の localStorage がログインしたユーザのものでない場合、
        // 以前のユーザのデータが混ざるのを防ぐため、一旦ローカルの最終更新時間を0にして
        // Firebase からの同期を強制する。
        const savedUid = localStorage.getItem('shiden_uid');
        if (savedUid !== authenticatedUser.uid) {
          localStorage.setItem('shiden_updated_at', '0');
          localStorage.setItem('shiden_uid', authenticatedUser.uid);
          localStorage.removeItem(CHAPTER2_OWNED_SKILLS_KEY);
          localStorage.removeItem(CHAPTER2_CLAIMED_REWARD_STEPS_KEY);
          setClaimedRewardSteps([]);
        }

        if (!authenticatedUser.emailVerified && authenticatedUser.providerData.some(p => p.providerId === 'password')) {
           setStageMode('VERIFY_EMAIL');
           setIsTitle(false);
        } else if (stageMode === 'VERIFY_EMAIL') {
           setStageMode('LOUNGE');
        }

        // 第2章の進捗をFirebaseからロード
        const loadChapter2Data = async () => {
          const chapter2Ref = ref(database, `profiles/${authenticatedUser.uid}/chapter2`);
          const snapshot = await get(chapter2Ref);
          if (snapshot.exists()) {
            const data = snapshot.val();
            // 現在が第2章なら、Firebaseのデータで状態を上書き
            // (章選択画面などで「続きから」を選んだ時や、ページリロード時の対応)
            const currentStage = STAGE_DATA.find(s => s.no === (data.stageCycle || stageCycle));
            const isTargetChapter2 = (currentStage?.chapter && currentStage.chapter >= 2) || (data.stageCycle || stageCycle) >= 13;
            
            if (isTargetChapter2) {
              if (data.stageCycle) setStageCycle(data.stageCycle);
              if (data.flowIndex !== undefined) setChapter2FlowIndex(data.flowIndex);
              const dbSkills = await loadUserSkills(authenticatedUser.uid);
              const localChapter2Skills = getStoredChapter2Skills();
              const loadedSkills = dbSkills
                ? getRegularSkills(dbSkills, 2)
                : data.ownedSkills
                  ? getRegularSkills(data.ownedSkills, 2)
                  : CHAPTER2_INITIAL_SKILLS;
              const mergedSkills = Array.from(new Set([...loadedSkills, ...localChapter2Skills]));
              setOwnedSkillAbbrs(mergedSkills);
              localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(mergedSkills));
              setChapter2SkillsHydrated(true);
              if (Array.isArray(data.claimedRewardSteps)) {
                saveClaimedRewardSteps([...claimedRewardSteps, ...data.claimedRewardSteps]);
              }
              if (data.canGoToBoss !== undefined) setCanGoToBoss(data.canGoToBoss);
              
              // 章別進捗も更新
              if (data.stageCycle) {
                setChapterProgress(prev => ({ ...prev, 2: data.stageCycle }));
              }
            }
          } else {
            setChapter2SkillsHydrated(true);
          }
        };
        loadChapter2Data();

        // if (authenticatedUser.uid === process.env.REACT_APP_ADMIN_UID) {
        //   setShowAdmin(true);
        // }
        const profileRef = ref(database, `profiles/${authenticatedUser.uid}`);
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setMyProfile(data);
            
            // 進行状況の同期ロジック
            // Firebase側にある最終更新日時を確認
            const firebaseUpdatedAt = data.updatedAt || 0;
            const localUpdatedAt = parseInt(localStorage.getItem('shiden_updated_at') || '0', 10);
            
              let firebaseStageCycle = data.stageCycle || 1;
              if (firebaseStageCycle >= 13) firebaseStageCycle = 12;

              const firebaseStageMode = data.lastGameMode as StageMode;
              const firebaseCanGoToBoss = data.canGoToBoss || false;

              // 1. 基本は「最終更新日時が新しい方」を採用する
              if (firebaseUpdatedAt > localUpdatedAt) {
                // Firebaseの方が新しい場合
                setStageCycle(firebaseStageCycle);
                localStorage.setItem('shiden_stage_cycle', firebaseStageCycle.toString());
                if (firebaseStageMode) {
                  localStorage.setItem('shiden_last_game_mode', firebaseStageMode);
                  localStorage.setItem('shiden_stage_mode', firebaseStageMode);
                  setStageMode(firebaseStageMode);
                }
                setCanGoToBoss(firebaseCanGoToBoss);
                localStorage.setItem('shiden_can_go_to_boss', firebaseCanGoToBoss.toString());
                localStorage.setItem('shiden_updated_at', firebaseUpdatedAt.toString());
              } else if (localUpdatedAt > firebaseUpdatedAt) {
                // ローカルの方が新しい場合、Firebaseを更新
                const localStageCycle = parseInt(localStorage.getItem('shiden_stage_cycle') || '1', 10);
                const localStageMode = (localStorage.getItem('shiden_last_game_mode') || 'MID') as StageMode;
                const localCanGoToBoss = localStorage.getItem('shiden_can_go_to_boss') === 'true';
                update(ref(database, `profiles/${authenticatedUser.uid}`), {
                  stageCycle: localStageCycle,
                  lastGameMode: localStageMode,
                  canGoToBoss: localCanGoToBoss,
                  updatedAt: localUpdatedAt
                });
              } else {
                // 日時が同じか、どちらも0（初回など）の場合は「より進んでいる方」を優先
                const localStageCycle = parseInt(localStorage.getItem('shiden_stage_cycle') || '1', 10);
                if (firebaseStageCycle > localStageCycle) {
                  setStageCycle(firebaseStageCycle);
                  localStorage.setItem('shiden_stage_cycle', firebaseStageCycle.toString());
                } else if (localStageCycle > firebaseStageCycle && localUpdatedAt > firebaseUpdatedAt) {
                  set(ref(database, `profiles/${authenticatedUser.uid}/stageCycle`), localStageCycle);
                }
              }

            // 所持スキルの同期
            // 第2章の所持スキルは profiles/{uid}/chapter2/ownedSkills で管理する。
            // ここで第1章用の ownedSkills を画面状態へ反映すると、リロード直後に第2章スキルを上書きしてしまう。
            const storedStageCycle = parseInt(localStorage.getItem('shiden_stage_cycle') || `${stageCycle}`, 10);
            const storedStageInfo = STAGE_DATA.find(s => s.no === storedStageCycle);
            const hasChapter2Context =
              storedStageCycle >= 13 ||
              (storedStageInfo?.chapter !== undefined && storedStageInfo.chapter >= 2);

            if (!hasChapter2Context) {
              const firebaseOwnedSkills = getRegularSkills(data.ownedSkills || ["一"], 1);
              const localOwnedSkills = getRegularSkills(JSON.parse(localStorage.getItem('shiden_owned_skills') || '["一"]'), 1);

              // 日時が同じか、どちらも0（初回など）の場合は和集合を取るが、
              // Firebaseの方が新しい場合はFirebaseのスキルセットで上書きする
              if (firebaseUpdatedAt > localUpdatedAt) {
                setOwnedSkillAbbrs(firebaseOwnedSkills);
                localStorage.setItem('shiden_owned_skills', JSON.stringify(firebaseOwnedSkills));
              } else if (localUpdatedAt > firebaseUpdatedAt) {
                // ローカルの方が新しい場合はFirebaseを更新
                const mergedSkills = Array.from(new Set([...firebaseOwnedSkills, ...localOwnedSkills]));
                if (mergedSkills.length > firebaseOwnedSkills.length) {
                  set(ref(database, `profiles/${authenticatedUser.uid}/ownedSkills`), mergedSkills);
                }
              } else {
                // 日時が同じ場合は和集合
                const mergedSkills = Array.from(new Set([...firebaseOwnedSkills, ...localOwnedSkills]));
                if (mergedSkills.length > firebaseOwnedSkills.length) {
                  set(ref(database, `profiles/${authenticatedUser.uid}/ownedSkills`), mergedSkills);
                }
                if (mergedSkills.length > localOwnedSkills.length) {
                  setOwnedSkillAbbrs(mergedSkills);
                  localStorage.setItem('shiden_owned_skills', JSON.stringify(mergedSkills));
                }
              }
            }

            // 称号(medals)の同期
            const firebaseMedals = data.medals || [];
            const localMedals = JSON.parse(localStorage.getItem('shiden_medals') || '[]');
            const mergedMedals = Array.from(new Set([...firebaseMedals, ...localMedals]));
            if (mergedMedals.length > firebaseMedals.length) {
              set(ref(database, `profiles/${authenticatedUser.uid}/medals`), mergedMedals);
            }
            if (mergedMedals.length > localMedals.length) {
              localStorage.setItem('shiden_medals', JSON.stringify(mergedMedals));
            }

            // Firebaseから取得した勝利スキルをセット
            const firebaseVictorySkills = data.victorySkills || {};
            setStageVictorySkills(firebaseVictorySkills);
            localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(firebaseVictorySkills));

            // ローカルストレージに未アップロードの勝利スキルがあればFirebaseにアップロード
            const localVictorySkills = JSON.parse(localStorage.getItem('shiden_stage_victory_skills') || '{}');
            let hasNewLocalSkills = false;
            for (const key in localVictorySkills) {
              if (!(firebaseVictorySkills as any)[key]) {
                const specificVictorySkillRef = ref(database, `profiles/${authenticatedUser.uid}/victorySkills/${key}`);
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
              uid: authenticatedUser.uid,
              displayName: authenticatedUser.displayName || "名無しの剣士",
              photoURL: authenticatedUser.photoURL || getStorageUrl("/images/icon/mon_215.gif"),
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
        // ログアウト時に第2章だった場合は、第1章の初期状態にリセット（ログイン必須のため）
        const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
        const isCurrentlyChapter2 = (currentStage?.chapter && currentStage.chapter >= 2) || stageCycle >= 13;
        if (isCurrentlyChapter2) {
          setStageCycle(1);
          setStageMode('MID');
          setIsTitle(true);
          setOwnedSkillAbbrs(CHAPTER1_INITIAL_SKILLS);
          setChapter2FlowIndex(0);
        }
      }
    });

    // 最近アクティブなユーザー100人を取得（これにより自分が更新された際もリストに含まれやすくなる）
    const profilesQuery = query(ref(database, 'profiles'), orderByChild('lastActive'), limitToLast(100));
    const unsubProfiles = onValue(profilesQuery, (snapshot) => {
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

    const updateDeneiStats = (clearsData: any, trialsData: any, likesData: any, currentUid: string | null) => {
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
            if (currentUid && likes[currentUid]) {
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
          updateDeneiStats(snap.val(), trialsSnap.val(), likesSnap.val(), auth.currentUser?.uid || null);
        });
      });
    });
    const unsubTrials = onValue(deneiTrialsRootRef, (snap) => {
      get(deneiClearsRootRef).then(clearsSnap => {
        get(deneiLikesRootRef).then(likesSnap => {
          updateDeneiStats(clearsSnap.val(), snap.val(), likesSnap.val(), auth.currentUser?.uid || null);
        });
      });
    });
    const unsubLikes = onValue(deneiLikesRootRef, (snap) => {
      get(deneiClearsRootRef).then(clearsSnap => {
        get(deneiTrialsRootRef).then(trialsSnap => {
          updateDeneiStats(clearsSnap.val(), trialsSnap.val(), snap.val(), auth.currentUser?.uid || null);
        });
      });
    });

    setBattleResults([]);
    setLogComplete(false);
    setCanGoToBoss(false);
    setShowBossClearPanel(false);
    setSelectedPlayerSkills([]);


    // 画像の事前読み込み
    const criticalImages = [
      getStorageUrl('/images/background/background.jpg'),
      getStorageUrl('/images/title/titlelogo.png')
    ];

    const skillIcons = ALL_SKILLS.map(s => getStorageUrl(s.icon));
    const statusIcons = STATUS_DATA.map(s => getStorageUrl(s.icon));
    const monsterImages = STAGE_DATA.map(s => getStorageUrl(s.bossImage));
    const kenjuImages = KENJU_DATA.map(k => getStorageUrl(k.image));
    const backgrounds = STAGE_DATA.map(s => getStorageUrl(`/images/background/${s.no}.jpg`));
    const kenjuBackgrounds = KENJU_DATA.map(k => getStorageUrl(k.background));

    const allImages = [...criticalImages, ...skillIcons, ...statusIcons, ...monsterImages, ...kenjuImages, ...backgrounds, ...kenjuBackgrounds];
    
    let loadedCount = 0;
    const totalToLoad = criticalImages.length; // タイトル表示にはクリティカルな画像のみを待つ

    allImages.forEach((url, index) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (index < totalToLoad) {
          loadedCount++;
          if (loadedCount === totalToLoad) setIsAssetsLoaded(true);
        }
      };
      img.onerror = () => {
        if (index < totalToLoad) {
          loadedCount++;
          if (loadedCount === totalToLoad) setIsAssetsLoaded(true);
        }
      };
    });

    return () => {
      unsubscribeAuth();
      unsubClears();
      unsubTrials();
      unsubLikes();
      unsubProfiles();
    };
  }, []);

  useEffect(() => {
    // 電影のクリア人数・挑戦回数を購読
    if (!stagesLoaded) return;
    let deneiTrialsUnsubscribe: (() => void) | null = null;
    let deneiClearsUnsubscribe: (() => void) | null = null;

    if (viewingProfile?.myKenju?.name && viewingProfile.uid) {
      const masterUid = viewingProfile.uid;
      const kenjuName = viewingProfile.myKenju.name;

      const deneiTrialsRef = ref(database, `deneiTrials/${masterUid}/${kenjuName}`);
      deneiTrialsUnsubscribe = onValue(deneiTrialsRef, (snapshot) => {
        if (snapshot.exists()) {
          setDeneiTrials(snapshot.size);
        } else {
          setDeneiTrials(0);
        }
      });

      const deneiClearsRef = ref(database, `deneiClears/${masterUid}/${kenjuName}`);
      deneiClearsUnsubscribe = onValue(deneiClearsRef, (snapshot) => {
        if (snapshot.exists()) {
          setDeneiClears(snapshot.size);
        } else {
          setDeneiClears(0);
        }
      });
    } else {
      setDeneiTrials(0);
      setDeneiClears(0);
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
          if (current.name === "＋硬" || current.name === "＋速" || current.name === "＋盾") {
            hasSynergy = prev.type.includes("攻撃") || prev.type.includes("補助") || prev.type.includes("迎撃");
          } else if (current.name === "＋反") {
            hasSynergy = prev.type.includes("攻撃"); // +反は攻撃スキルのみに反応
          } else if (current.name === "＋錬") {
            hasSynergy = prev.type.includes("攻撃"); // +錬は攻撃スキルのみに反応
          } else if (current.name === "＋強") {
            hasSynergy = prev.type.includes("攻撃"); // +強は攻撃スキルのみに反応
          } else {
            hasSynergy = false; // その他の＋スキルはデフォルトでシナジーなし
          }

          // 無条件でシナジーなしのスキル
          if (prev.name === "▽解") {
            hasSynergy = false;
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
      if (skill?.kamiwaza === 1 && selectedPlayerSkills.some(s => getSkillByAbbr(s)?.kamiwaza === 1)) {
        alert("「神業」カテゴリのスキルは編成に1つしか入れられません。");
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
          
          if (isMobile) {
            window.scrollTo({ top: 0 });
            if (mainGameAreaRef.current) mainGameAreaRef.current.scrollTop = 0;
          }

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
                        localStorage.setItem('shiden_can_go_to_boss', 'true');
                        triggerVictoryConfetti();
                    } else {
                        setCanGoToBoss(false);
                        localStorage.setItem('shiden_can_go_to_boss', 'false');
                    }
                    if (getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
                      setRewardSelectionMode(true);
                    }
                    setStage11TrialActive(false);
                }, 1000);
              }
            }, 30);
          } else {
            // 第2章の場合はMIDでも1勝で勝利とする
            const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle);
            const isChapter2 = currentStageInfo?.chapter === 2;
            const isVictory = (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) || isChapter2 ? winCount >= 1 : winCount === 10;
            const result = isVictory ? stageProcessor.onVictory(context) : stageProcessor.onFailure(context);
            
            if (isVictory) {
              // 第2章の処理
              const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle);
              const isChapter2 = currentStageInfo?.chapter === 2;

              if (isChapter2) {
                setCanGoToBoss(true);
              } else {
                setCanGoToBoss(true);
                localStorage.setItem('shiden_can_go_to_boss', 'true');
                if (stageMode === 'MID') {
                  triggerVictoryConfetti();
                  if (stageCycle === 1) {
                    setShowStage1Tutorial(true);
                  }
                }
              }
            }

            if (result.showReward && !isChapter2 && getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
              if ((result as any).pendingClear) setBossClearRewardPending(true);
              else setRewardSelectionMode(true);
            } else if (isVictory && (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) && !isChapter2) { // 第2章以外
              setShowBossClearPanel(true);
            }
          }
      };

      let winCountTotal = 0;
      for (let i = 0; i < battleCount; i++) {
        const enemyName = stageProcessor.getEnemyName(i, context);
        const currentComputerSkills = stageProcessor.getEnemySkills(i, context);
        const currentStageInfo = context.chapter2SubStage !== undefined && stageCycle >= 13
          ? STAGE_DATA.find(s => s.chapter === 2 && s.stage === stageCycle - 12 && s.battle === context.chapter2SubStage)
          : STAGE_DATA.find(s => s.no === stageCycle);
        const playerName = currentStageInfo?.chapter === 2 ? (currentStageInfo.playerName || "あなた") : "あなた";
        const game = new Game(selectedPlayerSkills.join("") + "／" + playerName, currentComputerSkills.map(s => s.abbr).join("") + "／" + enemyName);
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
    setSelectedPlayerSkills([]); // 選択中のスキルをリセット
  };

  const goToBossStage = async () => {
    const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
    if (currentStage?.chapter && currentStage.chapter >= 2) {
      const data = await loadV2Story(`${currentStage.chapter}-${currentStage.stage}-boss`);
      if (data) {
        setStoryContentV2(data);
        saveStoryCanvasState({ kind: 'story', stageCycle, flowIndex: chapter2FlowIndex, id: `${currentStage.chapter}-${currentStage.stage}-boss` });
        setShowStoryModal(true);
      }
    }
    const now = Date.now();
    setStageMode('BOSS');
    localStorage.setItem('shiden_stage_mode', 'BOSS');
    localStorage.setItem('shiden_last_game_mode', 'BOSS');
    localStorage.setItem('shiden_updated_at', now.toString());
    if (user) {
      update(ref(database, `profiles/${user.uid}`), {
        lastGameMode: 'BOSS',
        updatedAt: now
      });
    }

    handleResetGame();
  };

  const getStoredChapter2RewardChoices = (rewardStepKey: string): string[] | null => {
    try {
      const parsed = JSON.parse(localStorage.getItem('shiden_chapter2_reward_choices') || 'null');
      if (parsed?.key === rewardStepKey && Array.isArray(parsed?.choices)) return parsed.choices;
    } catch {
      return null;
    }
    return null;
  };

  const handleRewardSelection = (abbr: string) => {
    // 第2章の報酬選択（JSONフローに基づく）
    const stageInfo = STAGE_DATA.find(s => s.no === stageCycle);
    const isChapter2 = stageInfo?.chapter === 2;
    
    if (isChapter2) {
      const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
      const currentStep = flow?.flow[chapter2FlowIndex];

      if (currentStep?.skill) {
        return;
      }

      if (currentStep?.choices) {
        // 選択肢がある場合は1つだけ選択
        setSelectedRewards([abbr]);
      } else if (currentStep?.count) {
        // count 指定がある場合はその数まで選択
        if (selectedRewards.includes(abbr)) {
          setSelectedRewards(prev => prev.filter(a => a !== abbr));
        } else {
          if (selectedRewards.length < (currentStep.count || 1)) {
            setSelectedRewards(prev => [...prev, abbr]);
          }
        }
      } else if (chapter2SubStage === 2) { 
        // 互換性：大ボス撃破後の報酬（フローに count 指定がない場合）
        if (selectedRewards.includes(abbr)) {
          setSelectedRewards(prev => prev.filter(a => a !== abbr));
        } else {
          if (selectedRewards.length < 2) {
            setSelectedRewards(prev => [...prev, abbr]);
          }
        }
      } else {
        // デフォルト（1つ選択）
        if (selectedRewards.includes(abbr)) setSelectedRewards([]);
        else setSelectedRewards([abbr]);
      }
    } else {
      // 第1章などの通常の報酬選択（1つ選択）
      if (selectedRewards.includes(abbr)) setSelectedRewards([]);
      else setSelectedRewards([abbr]);
    }
  };

  const confirmRewards = async (rewardOverride?: string[]) => {
    if (rewardConfirmingRef.current) return;
    rewardConfirmingRef.current = true;
    setIsRewardConfirming(true);

    try {
      const stageInfo = STAGE_DATA.find(s => s.no === stageCycle);
      const isChapter2Reward = stageInfo?.chapter === 2;
      const flow = isChapter2Reward ? chapter2Flows.find(f => f.stageNo === stageCycle) : undefined;
      const currentStep = flow?.flow[chapter2FlowIndex];
      const rewardStepKey = getRewardStepKey();

      if (isChapter2Reward && currentStep?.type === 'reward') {
        if (claimedRewardSteps.includes(rewardStepKey)) {
          setSelectedRewards([]);
          setRewardSelectionMode(false);
          await moveToNextStep();
          return;
        }
      }

      let rewardsToClaim = rewardOverride ?? selectedRewards;
      if (isChapter2Reward && currentStep?.type === 'reward') {
        if (currentStep.skill) {
          rewardsToClaim = [currentStep.skill];
        } else if (currentStep.choices) {
          const validChoices = getStoredChapter2RewardChoices(rewardStepKey) || currentStep.choices;
          rewardsToClaim = rewardsToClaim.filter(abbr => validChoices.includes(abbr)).slice(0, 1);
        } else if (currentStep.count) {
          rewardsToClaim = rewardsToClaim.slice(0, currentStep.count);
        }
      }

      rewardsToClaim = Array.from(new Set(rewardsToClaim)).filter(abbr => !!getSkillByAbbr(abbr));
      if (rewardsToClaim.length === 0) return;

      const now = Date.now();
      const newOwnedSkills = Array.from(new Set([...ownedSkillAbbrs, ...rewardsToClaim]));
      const newClaimedSteps = isChapter2Reward && currentStep?.type === 'reward'
        ? saveClaimedRewardSteps([...claimedRewardSteps, rewardStepKey])
        : claimedRewardSteps;

      setOwnedSkillAbbrs(newOwnedSkills);
      localStorage.setItem('shiden_updated_at', now.toString());

      if (isChapter2Reward) {
        localStorage.removeItem('shiden_chapter2_reward_choices');
        localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(newOwnedSkills));
        if (user) {
          await update(ref(database, `profiles/${user.uid}/chapter2`), {
            ownedSkills: newOwnedSkills,
            claimedRewardSteps: newClaimedSteps,
            flowIndex: chapter2FlowIndex,
            lastUpdated: serverTimestamp()
          });
          await set(ref(database, `profiles/${user.uid}/updatedAt`), now);
        }
      } else {
        localStorage.setItem('shiden_owned_skills', JSON.stringify(newOwnedSkills));
        if (user) {
          await set(ref(database, `profiles/${user.uid}/ownedSkills`), newOwnedSkills);
          await set(ref(database, `profiles/${user.uid}/updatedAt`), now);
        }
      }

      setSelectedRewards([]);
      setRewardSelectionMode(false);

      if (isChapter2Reward) {
        await moveToNextStep();
        return;
      }

      if (stageMode === 'BOSS' && battleResults[0]?.winner === 1) clearBossAndNextCycle();
    } finally {
      rewardConfirmingRef.current = false;
      setIsRewardConfirming(false);
    }
  };

  const clearBossAndNextCycle = async () => {
    const stageInfo = STAGE_DATA.find(s => s.no === stageCycle);

    if (bossClearRewardPending) {
        const availableRewards = getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr));
        if (availableRewards.length > 0) { setRewardSelectionMode(true); setBossClearRewardPending(false); return; }
    }
    
    // 第2章のクリア時演出
    if (stageInfo?.chapter && stageInfo.chapter >= 2) {
       // subStage 3 (N-3) クリア時、または大ボスのみの場合のクリア時
       if (stageMode === 'MID' && chapter2SubStage === 3) {
          const data = await loadV2Story(`${stageInfo.chapter}-${stageInfo.stage}-clear`);
          if (data) {
            setStoryContentV2(data);
            saveStoryCanvasState({ kind: 'story', stageCycle, flowIndex: chapter2FlowIndex, id: `${stageInfo.chapter}-${stageInfo.stage}-clear` });
            setShowStoryModal(true);
          }
       } else if (stageMode === 'BOSS' && !stageInfo.chapter /* 第1章などはここ */) {
          // 第1章などの既存処理
       }
    }
    
    // 既存のBOSSクリア時の演出（第1章など）
    if (stageInfo?.chapter && stageInfo.chapter < 2 && stageMode === 'BOSS') {
       // ...
    }

    if (stageMode === 'KENJU' || stageMode === 'DENEI') {
      setStageMode('LOUNGE');
      handleResetGame();
      return;
    }
    if (stageCycle === 12) {
      setShowEpilogue(true);
      // Stage 12 クリア後は、CONTINUE で BOSS ステージに戻るようにする
      const now = Date.now();
      setStageMode('BOSS');
      localStorage.setItem('shiden_stage_mode', 'BOSS');
      localStorage.setItem('shiden_last_game_mode', 'BOSS');
      localStorage.setItem('shiden_updated_at', now.toString());
      if (user) {
        set(ref(database, `profiles/${user.uid}/lastGameMode`), 'BOSS');
        set(ref(database, `profiles/${user.uid}/updatedAt`), now);
      }
      return;
    }

    const nextCycle = stageCycle + 1;
    const nextStageInfo = STAGE_DATA.find(s => s.no === nextCycle);

    if (nextStageInfo?.chapter && nextStageInfo.chapter >= 2) {
      setStageMode('BOSS');
    } else {
      setStageMode('MID');
    }

    const now = Date.now();

    setStageCycle(nextCycle);
    setChapter2FlowIndex(0); // 第2章フローインデックスリセット
    
    if (isChapter2) {
      if (user) {
        const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
        set(chapter2Ref, {
          stageCycle: nextCycle,
          flowIndex: 0,
          ownedSkills: ownedSkillAbbrs,
          claimedRewardSteps,
          lastUpdated: serverTimestamp()
        });
      }
    }
    
    // 第1章・第2章に関わらず、初期表示の高速化のために localStorage にも保存しておく
    localStorage.setItem('shiden_stage_cycle', nextCycle.toString());

    // 章ごとの進捗も保存
    if (nextStageInfo?.chapter) {
      const chapterKey = `shiden_chapter${nextStageInfo.chapter}_stage`;
      if (nextStageInfo.chapter >= 2) {
        // 第2章以降はFirebaseに保存（上記で実施済み）
        setChapterProgress(prev => ({ ...prev, [nextStageInfo.chapter!]: nextCycle }));
      } else {
        localStorage.setItem(chapterKey, nextCycle.toString());
        setChapterProgress(prev => ({ ...prev, [nextStageInfo.chapter!]: nextCycle }));
      }
    } else if (nextCycle <= 12) {
      // 既存のステージ（1-12）は第1章扱いとする場合
      localStorage.setItem('shiden_chapter1_stage', nextCycle.toString());
      setChapterProgress(prev => ({ ...prev, 1: nextCycle }));
    }

    localStorage.setItem('shiden_stage_mode', 'MID');
    localStorage.setItem('shiden_last_game_mode', 'MID');
    localStorage.setItem('shiden_can_go_to_boss', 'false');
    localStorage.setItem('shiden_updated_at', now.toString());
    // Firebaseにも一括保存
    if (user) {
      update(ref(database, `profiles/${user.uid}`), {
        stageCycle: nextCycle,
        lastGameMode: 'MID',
        updatedAt: now
      });
    }
    setShowBossClearPanel(false);
    handleResetGame();
    setCanGoToBoss(false);
    setLogComplete(false);
    setBattleResults([]);
    setGameStarted(false);
    setShowLogForBattleIndex(-1);
    
    // 第2章なら次のステージの最初のステップを実行
    if (nextCycle >= 13) {
      const nextFlow = chapter2Flows.find(f => f.stageNo === nextCycle);
      if (nextFlow) {
        // 次のステージの 0 番目のステップを開始させるために currentIndex を -1 にする
        moveToNextStep(nextFlow, -1);
      }
    }
  };

  const handleBattleLogComplete = () => {
    setLogComplete(true);
    if (isMobile) {
      window.scrollTo({ top: 0 });
      if (mainGameAreaRef.current) mainGameAreaRef.current.scrollTop = 0;
    }
    // ボス戦、剣獣戦、または電影戦で勝利した場合のみ、紙吹雪とボス撃破パネルを表示
    const winCount = battleResults.filter(r => r.winner === 1).length;
    const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle);
    const isChapter2 = currentStageInfo?.chapter === 2;
    const currentChapter2Flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    const currentChapter2Step = currentChapter2Flow?.flow[chapter2FlowIndex];
    const isChapter2FinalBattle = stageCycle === 24 && (
        chapter2SubStage === 3 ||
        (currentChapter2Step?.type === 'battle' && currentChapter2Step.subStage === 3) ||
        chapter2FlowIndex === 6
    );
    const isVictory = (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI' || isChapter2) ? winCount >= 1 : winCount === 10;

    if (isVictory && (stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI' || isChapter2)) {
        if (!isChapter2FinalBattle) {
            triggerVictoryConfetti();
        }

        if (isChapter2) {
            // 第2章の場合、自動遷移はせず、GameChapter2 の「次へ進む」ボタンに任せる
            // 報酬はフローの type: "reward" ステップで行うため、ここでは何もしない
            return;
        }

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
    // BGMデータのロード
    AudioManager.getInstance().loadAudioData();
  }, []);

  // BGM制御
  useEffect(() => {
    const audioManager = AudioManager.getInstance();
    
    // 設定の同期
    audioManager.setVolume(bgmVolume);
    audioManager.setMute(!bgmEnabled);

    // シーンに応じたBGM再生
    const playSceneBgm = async () => {
      if (showStoryModal || showChapter2Title) return;
      
      if (showChapterTitle) {
        audioManager.stopBgm();
        return;
      }

      if (isTitle) {
        audioManager.stopBgm();
        return;
      }

      if (isLoungeMode) {
        audioManager.playBgm("Lounge");
        return;
      }

      if (stageMode === 'BOSS' || stageMode === 'MID' || stageMode === 'KENJU' || stageMode === 'DENEI') {
        
        // ステージごとのBGM指定を確認
        let currentStage = STAGE_DATA.find(s => s.no === stageCycle);
        
        // 第2章の場合はサブステージ（battle）に応じたデータを取得
        if (stageCycle >= 13) {
            const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
            const step = flow?.flow[chapter2FlowIndex];
            
            // バトル中以外は、playSceneBgm による自動BGM切り替えを行わない（フローの指定に任せる）
            if (step?.type !== 'battle') return;

            const subStage = step?.subStage;
            if (subStage !== undefined) {
                const chapterStage = stageCycle - 12;
                const info = STAGE_DATA.find(s => s.chapter === 2 && s.stage === chapterStage && s.battle === subStage);
                if (info) currentStage = info;
            }
        }
        
        const customBgm = currentStage?.bgm;
        if (customBgm && customBgm !== "BossBattle") {
            audioManager.playBgm(customBgm);
        } else {
            audioManager.playBgm("BossBattle");
        }
        return;
      }

    };

    playSceneBgm();

  }, [isTitle, stageMode, showStoryModal, bgmEnabled, bgmVolume, stageCycle, isLoungeMode, kenjuBoss, currentKenjuBattle, chapter2Flows, chapter2FlowIndex, gameStarted, stagesLoaded]);

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

          // 第1章の場合、または未ログインの場合はローカルストレージにも保存
          if (!isChapter2) {
            const localVictorySkills = JSON.parse(localStorage.getItem('shiden_stage_victory_skills') || '{}');
            const updatedLocalVictorySkills = { ...localVictorySkills, [saveKey]: selectedPlayerSkills };
            localStorage.setItem('shiden_stage_victory_skills', JSON.stringify(updatedLocalVictorySkills));
            setStageVictorySkills(updatedLocalVictorySkills);
          } else if (user) {
            // 第2章でログイン済みの場合はメモリ上のステートのみ更新（Firebaseへの保存は以下で行う）
            setStageVictorySkills(prev => ({ ...prev, [saveKey]: selectedPlayerSkills }));
          }
          

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
                
                // オプティミスティックUI更新 (人数は全体集計に任せるのが安全だが、即座の反映のため)
                setIsKenjuClearedEver(true);
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
        allProfiles={allProfiles}
        myProfile={myProfile}
        currentBoss={{ 
          name: currentStageInfo.bossName, 
          image: currentStageInfo.bossImage, 
          background: `/images/background/${currentStageInfo.no}.jpg` 
        }}
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
        isKenjuClearedEver={isKenjuClearedEver}
        deneiClears={deneiClears}
        deneiTrials={deneiTrials}
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
          const lastMode = getLastGameMode();
          setStageMode(lastMode);
          
          // 最新の進行状況を Firebase から再取得して同期
          if (user) {
            const profileRef = ref(database, `profiles/${user.uid}`);
            get(profileRef).then((snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.val();
                const firebaseUpdatedAt = data.updatedAt || 0;
                const localUpdatedAt = parseInt(localStorage.getItem('shiden_updated_at') || '0', 10);
                
                if (firebaseUpdatedAt > localUpdatedAt) {
                  let firebaseStageCycle = data.stageCycle || 1;
                  if (firebaseStageCycle >= 13) firebaseStageCycle = 12;
                  const firebaseStageMode = data.lastGameMode as StageMode;
                  const firebaseCanGoToBoss = data.canGoToBoss || false;
                  
                  setStageCycle(firebaseStageCycle);
                  localStorage.setItem('shiden_stage_cycle', firebaseStageCycle.toString());
                  if (firebaseStageMode) {
                    localStorage.setItem('shiden_last_game_mode', firebaseStageMode);
                    localStorage.setItem('shiden_stage_mode', firebaseStageMode);
                    setStageMode(firebaseStageMode);
                  }
                  setCanGoToBoss(firebaseCanGoToBoss);
                  localStorage.setItem('shiden_can_go_to_boss', firebaseCanGoToBoss.toString());
                  localStorage.setItem('shiden_updated_at', firebaseUpdatedAt.toString());
                }
              }
            });
          }
          
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
        loadingImageUrl={loadingImageUrl}
      />
    );
  }

  if (!stagesLoaded) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '20px' }}>
        <img src={loadingImageUrl} alt="Loading" style={{ width: '64px', height: '64px', imageRendering: 'pixelated' }} />
        <div style={{ color: '#fff' }}>Loading...</div>
      </div>
    );
  }

  if (isTitle) {
    if (!isAssetsLoaded || !stagesLoaded) return <div className="TitleScreenContainer" style={{ backgroundColor: '#000', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
    const hasSaveData = !!localStorage.getItem('shiden_stage_cycle');
    return (
      <div className="TitleScreenContainer" style={{
        height: '100dvh', // 動的ビューポート単位を使用
        overflowX: 'hidden',
        overflowY: 'hidden',
        padding: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '0' : '40px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'flex-start' : 'center',
        boxSizing: 'border-box',
        position: 'fixed', // スクロールを物理的に抑制
        top: 0,
        left: 0,
        width: '100%',
        backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
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
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '5px',
            animation: 'slideDown 0.5s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
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
            <div style={{ backgroundColor: '#ff5252', padding: '5px 15px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', maxWidth: '90%', lineHeight: '1.4' }}>
              【重要】複数の端末でゲームをする場合、最新の進捗状況を全ての端末で共有するように改善しました。よりクリアしたStageの多い端末で「今すぐ更新」ボタンを押すことを推奨します。
            </div>
          </div>
        )}
        <div className="TitleBackgroundEffect"></div>
        <div className="TitleContent" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '20px' : '10px', // スマホ版でも間隔を確保
          width: '100%',
          marginTop: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '5dvh' : '0'
        }}>
          <div className="TitleLogoWrapper" style={{ marginBottom: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '10px' : '20px' }}>
            <img
              src={getStorageUrl('/images/title/titlelogo.png')}
              alt="紫電一閃"
              className="TitleLogo"
              style={{ maxHeight: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '25vh' : 'auto' }} // ロゴを少し小さくして間隔を稼ぐ
            />
          </div>
          {user && (
            <div style={{ marginBottom: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '5px' : '10px', color: '#ffd700', fontSize: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '1.1rem' : '1.0rem', textShadow: '0 0 5px rgba(255, 215, 0, 0.5)', fontWeight: 'bold' }}>
                ユーザ名: {myProfile?.displayName || "名もなき人"}
            </div>
          )}
          <div className="TitleMenu" style={{
            gap: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '12px' : '12px'
          }}>
            {!showChapterSelect && (
              <>
                <button className="TitleButton neon-blue" onClick={handleNewGame}>NEW GAME</button>
                <button className="TitleButton neon-gold" onClick={handleContinue} disabled={!hasSaveData}>CONTINUE</button>
              </>
            )}
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

          <div style={{ margin: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '10px auto' : '40px auto 20px', display: 'none', maxWidth: '600px', background: 'rgba(0,0,0,0.7)', padding: '25px', borderRadius: '15px', border: '1px solid #444', textAlign: 'left', position: 'relative', zIndex: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#ffd700', fontSize: '1.2rem', marginTop: 0, marginBottom: '15px', borderLeft: '4px solid #ffd700', paddingLeft: '12px' }}>ゲーム紹介</h3>
            <p style={{ color: '#eee', fontSize: '0.95rem', lineHeight: '1.8', margin: 0 }}>
              「紫電一閃」は、スキルを組み合わせて戦う本格ターン制バトルゲームです。<br />
              全12ステージに立ちはだかる個性豊かなボスを撃破し、世界の果てに待つ真のエンディングを目指しましょう。<br /><br />
              オンライン要素も充実しており、「LOUNGE」では他のプレイヤーのプロフィールを閲覧したり、ユーザー自身が作成した強力なオリジナルボス「電影（でんえい）」に挑戦して腕を競い合うことができます。
            </p>
          </div>

          <div className="TitleFooter">
            <div style={{ textAlign: 'center', padding: '0px 0px 0px 10px', marginBottom: '10px', color: '#00d2ff', fontSize: '0.9rem' }}>{activeUsers}人がプレイ中です</div>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', marginLeft: '5px', marginBottom: '10px' }}> © 2026 Shiden Games </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.75rem', color: '#888', marginBottom: '10px' }}>
              <span style={{ cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }} onClick={() => setShowLegal(true)}>規約・運営情報</span>
              <a href="https://x.com/ShidenGames" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>お問い合わせ</a>
            </div>
            {isAdmin && false &&(
              <button className="TitleButton neon-purple" onClick={() => { setStageMode('ADMIN_ANALYTICS'); setIsTitle(false); }} style={{ marginTop: '10px' }}>Admin Analytics</button>
            )}
            <div onDoubleClick={() => setShowAdmin(true)} style={{ position: 'fixed', bottom: 0, left: 0, width: '50px', height: '50px', opacity: 0 }} />
          </div>
        </div>
        
        <div className="ChangelogTab" onClick={() => setShowChangelog(true)}>
          <span>更新履歴</span>
        </div>

        {showChapterSelect && (
          <div className="ChangelogModalOverlay" onClick={() => setShowChapterSelect(null)} style={{ zIndex: 11000 }}>
            <div className="ChangelogModal" onClick={(e) => e.stopPropagation()} style={{ 
              maxWidth: '800px', 
              width: '90%', 
              backgroundColor: '#000', 
              border: '2px solid #4fc3f7',
              padding: isMobile ? '10px' : '20px'
            }}>
              <div className="ChangelogHeader" style={{ background: '#4fc3f7', color: '#000', marginBottom: '20px' }}>
                <span style={{ fontWeight: 'bold' }}>{showChapterSelect.mode === 'NEW' ? 'NEW GAME - 章選択' : 'CONTINUE - 章選択'}</span>
                <button onClick={() => setShowChapterSelect(null)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                gap: '20px', 
                justifyContent: 'center',
                padding: '10px'
              }}>
                {/* 第1章 */}
                <div 
                  onClick={() => handleChapterSelect(1, showChapterSelect.mode === 'NEW')}
                  style={{ 
                    flex: 1,
                    cursor: 'pointer',
                    border: '1px solid #4fc3f7',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#1a1a1a',
                    transition: 'transform 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src={getStorageUrl('/images/chapter/Chapter1.png')} 
                    alt="Chapter 1" 
                    style={{ width: '100%', height: isMobile ? '150px' : '200px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ color: '#4fc3f7', fontSize: '1.2rem', fontWeight: 'bold' }}>第1章 ISLAND</div>
                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '5px' }}>
                      {showChapterSelect.mode === 'NEW' ? '最初から開始' : `現在進行中: Stage ${chapterProgress[1] || 1}`}
                    </div>
                  </div>
                </div>

                {/* 第2章 */}
                <div 
                  onClick={() => {
                    if (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) return;
                    handleChapterSelect(2, showChapterSelect.mode === 'NEW');
                  }}
                  style={{ 
                    flex: 1,
                    cursor: (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) ? 'default' : 'pointer',
                    border: (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) ? '1px solid #333' : '1px solid #ff5252',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#1a1a1a',
                    transition: 'transform 0.2s',
                    position: 'relative',
                    opacity: (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) ? 0.4 : 1,
                    filter: (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) ? 'grayscale(1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!(showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save)) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save)) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <img 
                    src={getStorageUrl('/images/chapter/Chapter2.png')} 
                    alt="Chapter 2" 
                    style={{ width: '100%', height: isMobile ? '150px' : '200px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ color: (showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save) ? '#666' : '#ff5252', fontSize: '1.2rem', fontWeight: 'bold' }}>第2章 FLAG</div>
                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '5px' }}>
                      {showChapterSelect.mode === 'NEW' ? '最初から開始' : 
                        !hasChapter2Save ? '未プレイ' : (() => {
                        const stage = chapterProgress[2] || 13;
                        const flow = chapter2Flows.find(f => f.stageNo === stage);
                        // 現在のインデックス以降で、最初に見つかる battle ステップを探す
                        const nextBattleStep = flow?.flow.slice(chapter2FlowIndex).find(s => s.type === 'battle');
                        const subStage = nextBattleStep?.subStage;
                        return `現在進行中: Stage ${stage - 12}${subStage ? `-${subStage}` : ''}`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                className="ChangelogCloseButton" 
                onClick={() => setShowChapterSelect(null)}
                style={{ marginTop: '20px' }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
        <div 
          onClick={() => setShowYoutubeModal(true)} 
          className="YoutubeTab"
        >
          <span style={{ fontSize: '0.8rem' }}></span>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#ff0000',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '8px solid #fff',
              marginLeft: '2px'
            }}></div>
          </div>
        </div>

        <div
            className="LifukuTab"
            onClick={() => { setStageMode('LIFUKU'); setIsTitle(false); }}
            style={{
              position: 'absolute',
              bottom: '100px', // 右下（更新履歴の近く）
              right: '-15px',
              backgroundColor: '#f06292',
              padding: '8px 35px 8px 15px',
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
                      {item.image && (
                        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                          <img
                            src={getStorageUrl(item.image)}
                            alt=""
                            style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #444' }}
                          />
                        </div>
                      )}
                      <div className="ChangelogText" style={{ whiteSpace: 'pre-wrap' }}>
                        {(Array.isArray(item.content) ? item.content.join('\n') : (item.content as string)).split(/(\*.*?\*)/g).map((part: string, i: number) => {
                          if (part.startsWith('*') && part.endsWith('*')) {
                            return <i key={i}>{part.slice(1, -1)}</i>;
                          }
                          return part;
                        })}
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

        {showYoutubeModal && (
          <div className="ChangelogModalOverlay" onClick={() => setShowYoutubeModal(false)}>
            <div className="ChangelogModal YoutubeModal" onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader">
                <span>プレイ動画</span>
                <button onClick={() => setShowYoutubeModal(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ padding: '20px', textAlign: 'center'}}>
                <p style={{ fontSize: '1rem', color: '#eee', lineHeight: '1.6', marginBottom: '20px', textAlign: 'left' }}>
                  Vtuber大饗ぬるさんによる初見プレイ動画です。プレイの参考にどうぞ。<br />
                  <span style={{ color: '#ffeb3b', fontWeight: 'bold', fontSize: '0.9em' }}>※Stage8ボス前までのプレイが公開されています。初見でプレイしたい方はそこまでクリアしてからご視聴ください。</span>
                </p>
                <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', background: '#000', borderRadius: '8px' }}>
                  <iframe 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    src="https://www.youtube.com/embed/fjtSx8UDoUc" 
                    title="YouTube video player" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <button className="ChangelogCloseButton" onClick={() => setShowYoutubeModal(false)}>閉じる</button>
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
                  まずは<strong style={{ color: '#00d2ff' }}>NEW GAME</strong>でプレイ！<br />
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

        {showSettings && (
          <div className="ChangelogModalOverlay" onClick={() => setShowSettings(false)} style={{ zIndex: 30000 }}>
            <div className="ChangelogModal" style={{ maxWidth: '400px', border: '2px solid #888', backgroundColor: '#222' }} onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader" style={{ background: '#444' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>設定</span>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>BGM</span>
                    <div 
                      onClick={() => {
                        const newState = !bgmEnabled;
                        setBgmEnabled(newState);
                        localStorage.setItem('shiden_bgm_enabled', String(newState));
                      }}
                      style={{
                        width: '50px',
                        height: '26px',
                        backgroundColor: bgmEnabled ? '#4caf50' : '#555',
                        borderRadius: '13px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '3px',
                        left: bgmEnabled ? '27px' : '3px',
                        transition: 'left 0.2s'
                      }} />
                    </div>
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>音量</span>
                    <span>{Math.round(bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBgmVolume(val);
                      localStorage.setItem('shiden_bgm_volume', String(val));
                    }}
                    style={{ width: '100%', cursor: 'pointer' }}
                    disabled={!bgmEnabled}
                  />
                </div>
              </div>
              <button className="ChangelogCloseButton" style={{ background: '#555', color: '#fff' }} onClick={() => setShowSettings(false)}>閉じる</button>
            </div>
          </div>
        )}

        {showRule && <Rule onClose={() => setShowRule(false)} />}
        {isAdmin && showAdmin && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#1a1a1a', border: '2px solid #ff5252', padding: '20px', borderRadius: '10px', zIndex: 10000, maxHeight: '80vh', overflowY: 'auto', width: '90%', maxWidth: '800px' }}>
            <h2 style={{ color: '#ff5252' }}>管理者パネル</h2>
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #444' }}>
              <h3 style={{ color: '#ffd700', marginTop: 0 }}>特殊シナリオ</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => {
                  setStoryUrl('story/v2/opening.txt');
                  setShowAdmin(false);
                  setIsAdminPreview(true);
                  setTimeout(() => setShowStoryModal(true), 50);
                }} style={{ background: '#4527a0' }}>オープニング (opening.txt)</button>
                <button onClick={() => {
                  setCreditsUrl('/data/credits.json');
                  setShowAdmin(false);
                  setIsAdminPreview(true);
                  setTimeout(() => setShowStoryModal(true), 50);
                }} style={{ background: '#2e7d32' }}>エンドロール (credits.json)</button>
              </div>
            </div>

            {/* 第1章 (Stage 1-12) */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#4fc3f7', borderBottom: '2px solid #4fc3f7', paddingBottom: '5px', marginBottom: '10px' }}>第1章 ISLAND</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                {STAGE_DATA.filter(s => s.no <= 12).map(s => (
                  <div key={s.no} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                    <div style={{ minWidth: '80px', fontWeight: 'bold', color: '#eee' }}>Stage {s.no}</div>
                    <button onClick={() => { applyAdminDebugSkills(); setStageCycle(s.no); setStageMode('MID'); localStorage.setItem('shiden_stage_cycle', s.no.toString()); setIsTitle(false); setShowAdmin(false); }} style={{ padding: '5px 10px', background: '#333', color: '#fff', border: '1px solid #555' }}>
                      開始
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 第2章 (Stage 13~) */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#ff5252', borderBottom: '2px solid #ff5252', paddingBottom: '5px', marginBottom: '10px' }}>第2章 FLAG (story/v2)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                {STAGE_DATA.filter(s => s.chapter === 2 && s.stage && s.battle === 1).map(s => {
                  const n = s.stage!;
                  const stageNo = n + 12;
                  const flow = chapter2Flows.find(f => f.stageNo === stageNo);
                  const battleSteps = flow?.flow
                    .map((step, index) => ({ step, index }))
                    .filter(({ step }) => step.type === 'battle') || [];
                  return (
                    <div key={s.no} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                      <div style={{ minWidth: '120px', fontWeight: 'bold', color: '#ff8a80' }}>第2章 No.{n}</div>
                      
                      <button onClick={() => { 
                        applyAdminDebugSkills();
                        setStageCycle(stageNo); 
                        setChapter2FlowIndex(0);
                        setStageMode('BOSS');
                        setIsTitle(false); 
                        setShowAdmin(false); 
                        if (flow) {
                          moveToNextStep(flow, -1);
                        }
                      }} style={{ padding: '5px 10px', background: '#e91e63', border: '1px solid #c2185b', fontWeight: 'bold' }}>
                        TEST
                      </button>

                      <button onClick={() => {
                        setStageCycle(stageNo);
                        setChapter2FlowIndex(0);
                        setStageMode('BOSS');
                        setGameStarted(false);
                        setShowStoryModal(false);
                        setShowChapter2Title(false);
                        setIsTitle(false);
                        setShowAdmin(false);
                        setIsAdminTitlePreview(true);
                        setShowChapterTitle(true);
                      }} style={{ padding: '5px 10px', background: '#6a1b9a', border: '1px solid #ab47bc', fontWeight: 'bold' }}>
                        TITLE
                      </button>

                      <div style={{ display: 'flex', gap: '5px' }}>
                        {battleSteps.map(({ step, index }) => {
                          const subStage = step.subStage || 1;
                          const label = subStage === 1 ? 'MID' : subStage === 2 ? 'BOSS' : `BATTLE ${subStage}`;
                          const background = subStage === 1 ? '#1a237e' : subStage === 2 ? '#b71c1c' : '#4a148c';
                          const border = subStage === 1 ? '#534bae' : subStage === 2 ? '#f05545' : '#7b1fa2';

                          return (
                            <button key={`${stageNo}-${subStage}`} onClick={() => {
                              applyAdminDebugSkills();
                              setChapter2FlowIndex(index);
                              setStageCycle(stageNo);
                              setStageMode('BOSS');
                              setGameStarted(false);
                              setCanGoToBoss(false);
                              setLogComplete(false);
                              setBattleResults([]);
                              setShowLogForBattleIndex(-1);
                              localStorage.setItem('shiden_stage_cycle', stageNo.toString());
                              localStorage.setItem('shiden_chapter2_flow_index', index.toString());
                              setIsTitle(false);
                              setShowAdmin(false);
                            }} style={{ padding: '5px 10px', background, border: `1px solid ${border}` }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ width: '1px', height: '20px', background: '#555', margin: '0 5px' }}></div>

                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={async () => {
                          const data = await loadV2Story(`${n}-1`);
                          if (data) { 
                            setStoryContentV2(data); 
                            setShowAdmin(false); 
                            setIsAdminPreview(true);
                            setTimeout(() => setShowStoryModal(true), 50);
                          }
                        }} style={{ fontSize: '10px', background: '#2e7d32' }}>Start ({n}-1)</button>

                        <button onClick={async () => {
                          const data = await loadV2Story(`${n}-2`);
                          if (data) { 
                            setStoryContentV2(data); 
                            setShowAdmin(false); 
                            setIsAdminPreview(true);
                            setTimeout(() => setShowStoryModal(true), 50);
                          }
                        }} style={{ fontSize: '10px', background: '#c62828' }}>Boss ({n}-2)</button>

                        <button onClick={async () => {
                          const data = await loadV2Story(`${n}-3`);
                          if (data) { 
                            setStoryContentV2(data); 
                            setShowAdmin(false); 
                            setIsAdminPreview(true);
                            setTimeout(() => setShowStoryModal(true), 50);
                          }
                        }} style={{ fontSize: '10px', background: '#1565c0' }}>Clear ({n}-3)</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setShowAdmin(false)} style={{ width: '100%', marginTop: '20px', padding: '10px' }}>閉じる</button>
          </div>
        )}

        {showStoryModal && (
          (isChapter2 || storyUrl || creditsUrl || (isAdmin && showAdmin === false)) ? (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 15000, backgroundColor: '#000' }}>
              <StoryCanvas
                script={storyContentV2 || undefined}
                scriptUrl={storyUrl || undefined}
                creditsUrl={creditsUrl || undefined}
                loadingImageUrl={loadingImageUrl}
                onOpenSettings={() => setShowSettings(true)}
                onToggleMute={() => AudioManager.getInstance().setMute(bgmEnabled)}
                isBgmEnabled={bgmEnabled}
                onEnd={() => {
                  const isOpening = !!storyUrl;
                  const isCredits = !!creditsUrl;
                  clearStoryCanvasState();
                  setShowStoryModal(false);
                  setStoryUrl(null);
                  setCreditsUrl(null);
                  setStoryContentV2(null);
                  setGameStarted(false);

                  if (isCredits) {
                    setIsAdminPreview(false);
                    setIsTitle(true);
                    return;
                  }
                  
                  if (isAdminPreview) {
                    setIsAdminPreview(false);
                    setIsTitle(true);
                  } else {
                    if (isTitle) setIsTitle(false);
                    const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
                    if (currentStage?.chapter === 2) {
                      if (isOpening) {
                        moveToNextStep(undefined, -1);
                      } else {
                        moveToNextStep();
                      }
                    }
                  }
                }}
              />
            </div>
          ) : null
        )}

        {showLegal && <LegalInfo onClose={() => setShowLegal(false)} />}
      </div>
    );
  }


  const gameProps: GameProps = {
    chapter,
    stageCycle,
    setStageCycle,
    stageMode,
    setStageMode,
    gameStarted,
    setGameStarted,
    battleResults,
    setBattleResults,
    showLogForBattleIndex,
    setShowLogForBattleIndex,
    logComplete,
    setLogComplete,
    useRichLog,
    setUseRichLog,
    stageProcessor,
    stageContext,
    isMobile,
    isLargeScreen,
    handleResetGame,
    handleStartGame,
    handleBattleLogComplete,
    triggerVictoryConfetti,
    getStorageUrl,
    selectedPlayerSkills,
    setSelectedPlayerSkills,
    availablePlayerCards,
    ownedSkillAbbrs: isAdminDebugSkillsActive ? getAllDebugSkillAbbrs() : ownedSkillAbbrs,
    setOwnedSkillAbbrs,
    storyContent,
    storyContentV2,
    setStoryContentV2,
    setShowStoryModal,
    showStoryModal,
    canGoToBoss,
    setCanGoToBoss,
    showBossClearPanel,
    setShowBossClearPanel,
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
    setIsTitle: (value: boolean) => {
      if (value) setIsAdminDebugSkillsActive(false);
      setIsTitle(value);
    },
    setShowRule,
    setShowSettings,
    bgmEnabled,
    setBgmEnabled,
    bgmVolume,
    setBgmVolume,
    showSettings,
    getSkillCardsFromAbbrs,
    getSkillByAbbr,
    handleSelectedSkillClick,
    handlePlayerSkillSelectionClick,
    winRateDisplay,
    stage11TrialActive,
    stageVictorySkills,
    PLAYER_SKILL_COUNT,
    ALL_SKILLS,
    user,
    myProfile,
    isLoungeMode,
    showEpilogue,
    setShowEpilogue,
    isAdmin,
    showAdmin,
    chapter2SubStage,
    chapter2FlowIndex,
    chapter2Flows,
    moveToNextStep,
    loadingImageUrl,
    showStage1Tutorial,
    setShowStage1Tutorial,
    epilogueContent,
    backToTitle
  };



  if (!stagesLoaded) {
    const progressPercent = preloadProgress.total > 0 
      ? Math.round((preloadProgress.current / preloadProgress.total) * 100) 
      : 0;

    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '20px' }}>
        <img src={loadingImageUrl} alt="Loading" style={{ width: '64px', height: '64px', imageRendering: 'pixelated' }} />
        <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading... {progressPercent}%</div>
        <div style={{ width: '200px', height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#00d2ff', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          {preloadProgress.current} / {preloadProgress.total} assets loaded
        </div>
      </div>
    );
  }

  const storyTitleStage = stageCycle >= 13 ? stageCycle - 12 : stageCycle;
  const storyTitleName = stageCycle >= 13
    ? STAGE_DATA.find(s => s.chapter === 2 && s.stage === storyTitleStage && s.battle === 1)?.name || ""
    : STAGE_DATA.find(s => s.no === stageCycle)?.name || "";
  const gameContent = isChapter2 ? <GameChapter2 {...gameProps} /> : <GameChapter1 {...gameProps} />;
  const shouldRenderStoryCanvas = showStoryModal && (isChapter2 || !!storyUrl || !!creditsUrl || (isAdmin && showAdmin === false));
  
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100dvh' }}>
      {!showChapter2Title && !shouldRenderStoryCanvas && !showChapterTitle && !isStoryTransitioning && gameContent}

      {showChapterTitle && (
        <StoryTitle 
          chapter={chapter}
          stage={storyTitleStage}
          title={storyTitleName}
          onComplete={async () => {
            setShowChapterTitle(false);
            if (isAdminTitlePreview) {
              setIsAdminTitlePreview(false);
              setIsTitle(true);
              return;
            }
            setIsStoryTransitioning(true);
            // タイトル表示後、改めて現在のステップ（ストーリー）を表示する
            // chapter2FlowIndex は既に更新済みなので、引数を調整
            await moveToNextStep(undefined, chapter2FlowIndex - 1, true);
            setIsStoryTransitioning(false);
          }}
        />
      )}

      {shouldRenderStoryCanvas && (
          (isChapter2 || storyUrl || creditsUrl || (isAdmin && showAdmin === false)) ? (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 15000, backgroundColor: '#000' }}>
              <StoryCanvas
                script={storyContentV2 || undefined}
                scriptUrl={storyUrl || undefined}
                creditsUrl={creditsUrl || undefined}
                loadingImageUrl={loadingImageUrl}
                onOpenSettings={() => setShowSettings(true)}
                onToggleMute={() => AudioManager.getInstance().setMute(bgmEnabled)}
                isBgmEnabled={bgmEnabled}
                onEnd={() => {
                  const isOpening = !!storyUrl;
                  const isCredits = !!creditsUrl;
                  clearStoryCanvasState();
                  setShowStoryModal(false);
                  setStoryUrl(null);
                  setCreditsUrl(null);
                  setStoryContentV2(null);
                  setGameStarted(false);

                  if (isCredits) {
                    setIsAdminPreview(false);
                    setIsTitle(true);
                    return;
                  }
                  
                  if (isAdminPreview) {
                    setIsAdminPreview(false);
                    setIsTitle(true);
                  } else {
                    if (isTitle) setIsTitle(false);
                    const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
                    if (currentStage?.chapter === 2) {
                      if (isOpening) {
                        moveToNextStep(undefined, -1);
                      } else {
                        moveToNextStep();
                      }
                    }
                  }
                }}
              />
            </div>
          ) : null
      )}

      {showChapter2Title && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            cursor: 'pointer',
            opacity: isTitleFadingOut ? 0 : 1,
            transition: 'opacity 3s ease-in-out',
            pointerEvents: isTitleFadingOut ? 'none' : 'auto',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none'
          }}
          onClick={() => {
            setIsTitleFadingOut(true);
            AudioManager.getInstance().fadeOutAndStop(3000);
            // 少し待ってから次へ（フェードアウトに合わせる）
            setTimeout(() => {
              setShowChapter2Title(false);
              setIsTitleFadingOut(false);
              moveToNextStep();
            }, 3000);
          }}
        >
            <img 
              src={getStorageUrl('/images/title/タイトルロゴ2.png')} 
              alt="Chapter 2 Title"
              style={{
                maxWidth: '90%',
                maxHeight: '80%',
                objectFit: 'contain',
                opacity: isTitleFadingOut ? 0 : 1,
                transition: 'opacity 3s ease-in-out'
              }}
            />
            <div style={{ 
                position: 'absolute', 
                bottom: '10%', 
                color: '#666', 
                fontSize: '0.8rem', 
                animation: 'fadeInTitle 5s ease-in',
                opacity: isTitleFadingOut ? 0 : 1,
                transition: 'opacity 3s ease-in-out'
            }}>- CLICK TO START -</div>
            <style>{`
              @keyframes fadeInTitle {
                0% { opacity: 0; }
                100% { opacity: 1; }
              }
            `}</style>
        </div>
      )}
      
      {showSettings && (
          <div className="ChangelogModalOverlay" onClick={() => setShowSettings(false)} style={{ zIndex: 30000 }}>
            <div className="ChangelogModal" style={{ maxWidth: '400px', border: '2px solid #888', backgroundColor: '#222' }} onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader" style={{ background: '#444' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>設定</span>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ padding: '20px', color: '#fff' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.1rem' }}>BGM</span>
                    <div 
                      onClick={() => {
                        AudioManager.getInstance().setMute(bgmEnabled);
                      }}
                      style={{
                        width: '50px',
                        height: '26px',
                        backgroundColor: bgmEnabled ? '#4caf50' : '#555',
                        borderRadius: '13px',
                        position: 'relative',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '3px',
                        left: bgmEnabled ? '27px' : '3px',
                        transition: 'left 0.2s'
                      }} />
                    </div>
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>音量</span>
                    <span>{Math.round(bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      AudioManager.getInstance().setVolume(val);
                    }}
                    style={{ width: '100%', cursor: 'pointer' }}
                    disabled={!bgmEnabled}
                  />
                </div>
              </div>
              <button className="ChangelogCloseButton" style={{ background: '#555', color: '#fff' }} onClick={() => setShowSettings(false)}>閉じる</button>
            </div>
          </div>
        )}

      {showRule && <Rule onClose={() => setShowRule(false)} />}
    </div>
  );
}


export default App;
