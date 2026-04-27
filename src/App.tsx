import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { ref, onValue, push, onDisconnect, set, update, serverTimestamp, get } from "firebase/database";
import { database, auth, googleProvider, recordAccess, getStorageUrl, saveUserSkills, loadUserSkills, saveChapter2Progress, saveProfileProgress, claimChapter2Reward, resetChapter1Progress, resetChapter2Progress } from "./firebase";
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
import Chapter2StoryBook from './components/Chapter2StoryBook';
import { GameProps, BattleResult } from './types/GameProps';
import './App.css';

// 2026/1/31 Ver 1.0リリース　やったー

const CHAPTER1_INITIAL_SKILLS = ["一"];
//const CHAPTER2_INITIAL_SKILLS = ["一", "刺", "果", "雷", "呪", "覚", "防", "影", "交", "搦", "崩", "疫", "強", "硬", "速", "逆", "裏", "先"];
const CHAPTER2_INITIAL_SKILLS = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const STORY_CANVAS_STATE_KEY = 'shiden_story_canvas_state';
const CHAPTER2_CLAIMED_REWARD_STEPS_KEY = 'shiden_chapter2_claimed_reward_steps';
const CHAPTER2_OWNED_SKILLS_KEY = 'shiden_chapter2_owned_skills';
const STORY_BOOK_COUPON_CODE = 'SHIDEN-BOOK-2026';
const KAMIWAZA_PLAYER_NAMES: Record<string, string> = {
  "狼": "ルーサー",
  "▽": "アダム",
  "爆": "ウィッチ",
  "魔": "レミエル"
};

const CHAPTER2_STAGE_ALLOWED_KAMIWAZA: Record<string, string> = {
  "7-1": "狼",
  "7-2": "▽",
  "8-1": "爆",
  "8-2": "魔",
  "11-1": "狼",
  "11-2": "魔",
};

const getPlayerNameForSkills = (selectedSkills: string[], fallbackName: string) => {
  const kamiwaza = selectedSkills.find(abbr => KAMIWAZA_PLAYER_NAMES[abbr]);
  return kamiwaza ? KAMIWAZA_PLAYER_NAMES[kamiwaza] : fallbackName;
};

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
  const titleHeroPcUrl = getStorageUrl('/images/title/タイトル_PC.webp');
  const titleHeroMobileUrl = getStorageUrl('/images/title/タイトル_スマホ.webp');

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
        imageUrls.add(getStorageUrl('/images/title/titlelogo.webp'));
        imageUrls.add(titleHeroPcUrl);
        imageUrls.add(titleHeroMobileUrl);
        imageUrls.add(getStorageUrl('/images/title/タイトルロゴ2.webp'));
        imageUrls.add(getStorageUrl('/images/chapter/Chapter1.webp'));
        imageUrls.add(getStorageUrl('/images/chapter/Chapter2.webp'));
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

    const gameModes = ['MID', 'BOSS', 'KENJU', 'DENEI'];
    if (localStorage.getItem(STORY_CANVAS_STATE_KEY) || (savedMode && gameModes.includes(savedMode))) {
      return true;
    }
    
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
  const [showChapter2StoryBook, setShowChapter2StoryBook] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [adminEpilogueSequence, setAdminEpilogueSequence] = useState<'idle' | 'title' | 'story' | 'credits'>('idle');
  const [isAdminDebugSkillsActive, setIsAdminDebugSkillsActive] = useState(false);
  const isAdminDebugSkillsActiveRef = useRef(false);
  const isAdmin = user?.uid === process.env.REACT_APP_ADMIN_UID;
  const canAccessChapter2StoryBook = isAdmin || Boolean(myProfile?.storyBookCouponUnlocked);
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
    isAdminDebugSkillsActiveRef.current = true;
    setIsAdminDebugSkillsActive(true);
    setSelectedPlayerSkills([]);
  };

  useEffect(() => {
    if (!isAdminDebugSkillsActive) {
      isAdminDebugSkillsActiveRef.current = false;
    }
  }, [isAdminDebugSkillsActive]);

  // タイトル画面表示中（F5等）の進行状況最新同期
  useEffect(() => {
    if (isAdminDebugSkillsActiveRef.current) return;
    if (isTitle && user) {
      const profileRef = ref(database, `profiles/${user.uid}`);
      get(profileRef).then((snapshot) => {
        if (isAdminDebugSkillsActiveRef.current) return;
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
  const [showTitleMenuModal, setShowTitleMenuModal] = useState(false);
  const [showStoryBookCouponModal, setShowStoryBookCouponModal] = useState(false);
  const [storyBookCouponInput, setStoryBookCouponInput] = useState('');
  const [storyBookCouponMessage, setStoryBookCouponMessage] = useState<string | null>(null);
  const [storyBookCouponMessageType, setStoryBookCouponMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showNewGameIntro, setShowNewGameIntro] = useState(false);
  const [newGameIntroChapter, setNewGameIntroChapter] = useState<1 | 2>(1);
  const [newGameIntroTrackIndex, setNewGameIntroTrackIndex] = useState(1);
  const [isNewGameIntroTrackAnimating, setIsNewGameIntroTrackAnimating] = useState(true);
  const [isTapStartBlinking, setIsTapStartBlinking] = useState(false);
  const [changelogData, setChangelogData] = useState<any[]>([]);
  const [showUpdateNotify, setShowUpdateNotify] = useState(false);
  const [hasChapter2Save, setHasChapter2Save] = useState(false);
  const [showStage1Tutorial, setShowStage1Tutorial] = useState(false);
  const newGameIntroTouchStartXRef = useRef<number | null>(null);
  const newGameIntroInputLockedRef = useRef(false);
  const suppressAdminBattleStoryOpenRef = useRef(false);

  const storyBookOverlay = showChapter2StoryBook && canAccessChapter2StoryBook && typeof document !== 'undefined'
    ? createPortal(
        <div className="StoryBookOverlayHost" style={{ position: 'fixed', inset: 0, zIndex: 40000, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', backgroundColor: '#120e0c' }}>
          <Chapter2StoryBook onClose={() => setShowChapter2StoryBook(false)} />
        </div>,
        document.body
      )
    : null;

  useEffect(() => {
    if (!showChapter2StoryBook) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [showChapter2StoryBook]);

  const handleStoryBookCouponInput = () => {
    if (!user || !myProfile) {
      window.alert('クーポンコードの入力はユーザ登録後にご利用ください。');
      return;
    }
    setStoryBookCouponInput('');
    setStoryBookCouponMessage(
      myProfile.storyBookCouponUnlocked
        ? 'このアカウントでは、すでにストーリーブックを閲覧できます。'
        : null
    );
    setStoryBookCouponMessageType(myProfile.storyBookCouponUnlocked ? 'success' : 'info');
    setShowStoryBookCouponModal(true);
  };

  const handleSubmitStoryBookCoupon = async () => {
    if (!user || !myProfile) {
      setStoryBookCouponMessage('クーポンコードの入力はユーザ登録後にご利用ください。');
      setStoryBookCouponMessageType('error');
      return;
    }

    const normalized = storyBookCouponInput.trim();
    if (!normalized) {
      setStoryBookCouponMessage('クーポンコードを入力してください。');
      setStoryBookCouponMessageType('error');
      return;
    }

    if (normalized === STORY_BOOK_COUPON_CODE) {
      const profileRef = ref(database, `profiles/${user.uid}`);
      const updatedProfile: UserProfile = {
        ...myProfile,
        storyBookCouponUnlocked: true
      };
      setMyProfile(updatedProfile);
      try {
        await set(profileRef, updatedProfile);
        setStoryBookCouponMessage('ストーリーブックを閲覧できるようになりました。');
        setStoryBookCouponMessageType('success');
      } catch (error) {
        console.error('Failed to save story book coupon state:', error);
        setStoryBookCouponMessage('クーポンコードの保存に失敗しました。');
        setStoryBookCouponMessageType('error');
      }
      return;
    }

    setStoryBookCouponMessage('クーポンコードが正しくありません。');
    setStoryBookCouponMessageType('error');
  };
  

  useEffect(() => {
    const loadChapter2Data = async () => {
      if (user) {
        const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
        const snapshot = await get(chapter2Ref);
        if (isAdminDebugSkillsActiveRef.current) return;
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

  const getStoredClaimedRewardSteps = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAPTER2_CLAIMED_REWARD_STEPS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const isProgressAhead = (nextStage: number, nextFlow: number, currentStage: number, currentFlow: number) => {
    return nextStage > currentStage || (nextStage === currentStage && nextFlow > currentFlow);
  };

  const getChapter2SubStageForDisplay = (stageNo: number, flowIndex: number): number => {
    const flow = chapter2Flows.find(f => f.stageNo === stageNo);
    if (!flow) return 1;

    const currentStep = flow.flow[flowIndex];
    if (currentStep?.type === 'battle' && currentStep.subStage) return currentStep.subStage;

    const nextBattleStep = flow.flow.slice(Math.max(flowIndex, 0)).find(step => step.type === 'battle');
    if (nextBattleStep?.subStage) return nextBattleStep.subStage;

    const previousBattleStep = [...flow.flow.slice(0, flowIndex + 1)].reverse().find(step => step.type === 'battle');
    return previousBattleStep?.subStage || 1;
  };

  const getChapter2StageLabel = (stageNo: number, flowIndex: number): string => {
    const chapterStage = Math.max(stageNo - 12, 1);
    return `Stage${chapterStage}-${getChapter2SubStageForDisplay(stageNo, flowIndex)}`;
  };

  const CHAPTER2_FINAL_STAGE_NO = 24;
  const CHAPTER2_FINAL_BATTLE_FLOW_INDEX = 5;

  const nonAdminProfiles = React.useMemo(
    () => allProfiles.filter(profile => profile.uid !== process.env.REACT_APP_ADMIN_UID),
    [allProfiles]
  );

  const chapter1RawStageClearCounts = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const stageNum = index + 1;
      const clearKey = `BOSS_${stageNum}`;
      const registeredClears = nonAdminProfiles.filter(profile => profile.victorySkills && profile.victorySkills[clearKey]).length;
      const anonymousClears = Object.values(anonymousVictories).filter(victories => victories && victories[clearKey]).length;
      return registeredClears + anonymousClears;
    });
  }, [anonymousVictories, nonAdminProfiles]);

  const chapter1StageClearCounts = React.useMemo(() => {
    const correctedCounts = [...chapter1RawStageClearCounts];
    for (let i = correctedCounts.length - 2; i >= 0; i--) {
      correctedCounts[i] = Math.max(correctedCounts[i], correctedCounts[i + 1]);
    }
    return correctedCounts;
  }, [chapter1RawStageClearCounts]);

  const hasClearedChapter2Stage = (profile: UserProfile, stageNo: number): boolean => {
    if (!profile.chapter2 || typeof profile.chapter2.stageCycle !== 'number') return false;

    if (profile.chapter2.stageCycle > stageNo) {
      return true;
    }

    if (stageNo === CHAPTER2_FINAL_STAGE_NO && profile.chapter2.stageCycle === CHAPTER2_FINAL_STAGE_NO) {
      return profile.chapter2.flowIndex === CHAPTER2_FINAL_BATTLE_FLOW_INDEX && Boolean(profile.chapter2.canGoToBoss);
    }

    return false;
  };

  const chapter2StageClearCounts = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const stageNum = index + 1;
      const stageNo = stageNum + 12;
      return nonAdminProfiles.filter(profile => hasClearedChapter2Stage(profile, stageNo)).length;
    });
  }, [nonAdminProfiles]);

  const suppressChapter2ProgressSaveRef = useRef(false);

  const haveSameItems = (a: string[], b: string[]) => {
    return a.length === b.length && a.every(item => b.includes(item));
  };

  const saveClaimedRewardSteps = (steps: string[]) => {
    const uniqueSteps = Array.from(new Set(steps));
    setClaimedRewardSteps(prev => haveSameItems(prev, uniqueSteps) ? prev : uniqueSteps);
    localStorage.setItem(CHAPTER2_CLAIMED_REWARD_STEPS_KEY, JSON.stringify(uniqueSteps));
    return uniqueSteps;
  };

  useEffect(() => {
    if (isAdminDebugSkillsActiveRef.current || suppressChapter2ProgressSaveRef.current) return;
    localStorage.setItem('shiden_chapter2_flow_index', chapter2FlowIndex.toString());
    if (isChapter2) {
      if (user) {
        saveChapter2Progress(user.uid, { stageCycle, flowIndex: chapter2FlowIndex });
      }
    }
  }, [chapter2FlowIndex, isChapter2, user, stageCycle]);

  // 互換性のための chapter2SubStage (フロー内の battle ステップに割り当てられる subStage)
  const chapter2SubStage = React.useMemo(() => {
    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    if (!flow) return 1;
    const step = flow.flow[chapter2FlowIndex];
    if (step?.subStage) return step.subStage;
    const previousBattleStep = [...flow.flow.slice(0, chapter2FlowIndex + 1)].reverse().find(s => s.type === 'battle');
    return previousBattleStep?.subStage || 1;
  }, [chapter2Flows, stageCycle, chapter2FlowIndex]);

  const startChapter2EpilogueSequence = () => {
    clearStoryCanvasState();
    setStoryContent(null);
    setStoryContentV2(null);
    setStoryUrl(null);
    setCreditsUrl(null);
    setShowStoryModal(false);
    setShowChapterTitle(false);
    setShowChapter2Title(false);
    setShowPrologueTitle(false);
    setShowAdmin(false);
    setIsAdminPreview(true);
    setAdminEpilogueSequence('title');
    setStageCycle(24);
    setStageMode('BOSS');
    setGameStarted(false);
    setIsTitle(false);
    setShowEpilogue(false);
  };

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
        const isPreBattleReward = flow.flow[nextIndex + 1]?.type === 'battle';
        const rewardStepKey = getRewardStepKey(stageCycle, nextIndex);
        if (claimedRewardSteps.includes(rewardStepKey)) {
          setSelectedRewards([]);
          setRewardSelectionMode(false);
          return moveToNextStep(flow, nextIndex);
        }
        if (isPreBattleReward) {
          setCanGoToBoss(false);
          setBattleResults([]);
          setShowLogForBattleIndex(-1);
          setLogComplete(false);
          setShowBossClearPanel(false);
        }
        if (isPreBattleReward && nextStep.skill) {
          const rewardsToClaim = [nextStep.skill].filter(abbr => !!getSkillByAbbr(abbr));
          if (rewardsToClaim.length > 0) {
            const now = Date.now();
            if (user) {
              const result = await claimChapter2Reward(user.uid, {
                rewardStepKey,
                rewards: rewardsToClaim,
                stageCycle,
                flowIndex: nextIndex,
                lastUpdated: now
              });
              const serverData = result.data || {};
              const newOwnedSkills = Array.isArray(serverData.ownedSkills)
                ? getRegularSkills(serverData.ownedSkills, 2)
                : Array.from(new Set([...ownedSkillAbbrs, ...rewardsToClaim]));
              const newClaimedSteps = Array.isArray(serverData.claimedRewardSteps)
                ? serverData.claimedRewardSteps
                : saveClaimedRewardSteps([...claimedRewardSteps, rewardStepKey]);

              setOwnedSkillAbbrs(newOwnedSkills);
              saveClaimedRewardSteps(newClaimedSteps);
              localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(newOwnedSkills));
              localStorage.removeItem('shiden_chapter2_reward_choices');
              await saveProfileProgress(user.uid, { updatedAt: now });
            } else {
              const newOwnedSkills = Array.from(new Set([...ownedSkillAbbrs, ...rewardsToClaim]));
              setOwnedSkillAbbrs(newOwnedSkills);
              saveClaimedRewardSteps([...claimedRewardSteps, rewardStepKey]);
              localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(newOwnedSkills));
            }
          }
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
      const lastStep = flow.flow[flow.flow.length - 1];
      if (flow.stageNo === 24 && lastStep?.type === 'battle' && lastStep.subStage === 3) {
        startChapter2EpilogueSequence();
        return;
      }
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
  const [showPrologueTitle, setShowPrologueTitle] = useState(false);
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

  const startPrologue = (stage: number, flowIndex: number = 0) => {
    setStoryContent(null);
    setStoryContentV2(null);
    setCreditsUrl(null);
    setStoryUrl('story/v2/prologue.txt');
    saveStoryCanvasState({ kind: 'storyUrl', stageCycle: stage, flowIndex, id: 'story/v2/prologue.txt' });
    setShowStoryModal(true);
  };

  const resumeStoryCanvasState = async (state: StoryCanvasState): Promise<boolean> => {
    if (!state.kind) return false;

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
    setShowChapterSelect(null);
    setStoryContent(null);
    setStoryContentV2(null);
    setStoryUrl(null);
    setCreditsUrl(null);

    if (state.kind === 'storyUrl' && state.id) {
      setStoryUrl(state.id);
      setShowStoryModal(true);
      setIsTitle(false);
      return true;
    }

    if (state.kind === 'credits') {
      const flow = chapter2Flows.find(f => f.stageNo === state.stageCycle);
      const step = state.flowIndex !== undefined ? flow?.flow[state.flowIndex] : undefined;
      setCreditsUrl(state.id || step?.id || '/data/credits.json');
      setShowStoryModal(true);
      setIsTitle(false);
      return true;
    }

    const flow = chapter2Flows.find(f => f.stageNo === state.stageCycle);
    const step = state.flowIndex !== undefined ? flow?.flow[state.flowIndex] : undefined;
    const storyId = state.id || step?.id;
    if (storyId) {
      const data = await loadV2Story(storyId);
      if (data) {
        setStoryContentV2(data);
        setShowStoryModal(true);
        setIsTitle(false);
        return true;
      }
    }

    return false;
  };

  const restoredStoryCanvasRef = useRef(false);

  useEffect(() => {
    if (restoredStoryCanvasRef.current || !stagesLoaded) return;
    restoredStoryCanvasRef.current = true;

    if (localStorage.getItem(STORY_CANVAS_STATE_KEY)) {
      setGameStarted(false);
      setShowStoryModal(false);
      setStoryUrl(null);
      setCreditsUrl(null);
      setStoryContentV2(null);
      setIsTitle(true);
    }
  }, [stagesLoaded]);

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

        // プロローグなどのStoryCanvas表示中（storyUrlがセットされている）ならfetchをスキップ
        if (storyUrl) {
            setStoryContent(null);
            setStoryContentV2(null);
            return;
        }

        try {
          if (currentStage?.chapter && currentStage.chapter >= 2) {
            if (suppressAdminBattleStoryOpenRef.current) {
              setStoryContent(null);
              setStoryContentV2(null);
              return;
            }
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
        if (!storyUrl && !showStoryModal && !localStorage.getItem(STORY_CANVAS_STATE_KEY)) { // プロローグ・StoryCanvas表示中以外
            setStoryContent(null);
            setStoryContentV2(null);
        }
      }
    };
    fetchStory().then(() => {
      // ストーリーが読み込まれたらモーダルを表示
      if (!gameStarted && !showStoryModal) {
        const currentStage = STAGE_DATA.find(s => s.no === stageCycle);
        if (suppressAdminBattleStoryOpenRef.current && currentStage?.chapter && currentStage.chapter >= 2) {
          return;
        }
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
        if (isChapter2) {
          const chapter2StageKey = `${stageCycle - 12}-${getChapter2SubStageForDisplay(stageCycle, chapter2FlowIndex)}`;
          const allowedKamiwaza = CHAPTER2_STAGE_ALLOWED_KAMIWAZA[chapter2StageKey];
          if (allowedKamiwaza) {
            skillAbbrs = skillAbbrs.filter(abbr => {
              const skill = getSkillByAbbr(abbr);
              return skill?.kamiwaza !== 1 || abbr === allowedKamiwaza;
            });
          }
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
  }, [gameStarted, ownedSkillAbbrs, isAdminDebugSkillsActive, stageCycle, stageMode, chapter2FlowIndex, chapter2Flows]);

  useEffect(() => {
    if (!isChapter2 || chapter2Flows.length === 0 || showStoryModal || showChapterTitle || showChapter2Title || isStoryTransitioning) return;

    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    const currentStep = flow?.flow[chapter2FlowIndex];
    if (currentStep?.type === 'reward' && claimedRewardSteps.includes(getRewardStepKey())) {
      setSelectedRewards([]);
      setRewardSelectionMode(false);
      if (user) {
        saveChapter2Progress(user.uid, {
          stageCycle,
          ownedSkills: ownedSkillAbbrs,
          claimedRewardSteps,
          flowIndex: chapter2FlowIndex,
          lastUpdated: Date.now()
        });
      }
      moveToNextStep();
    }
  }, [isChapter2, chapter2Flows, stageCycle, chapter2FlowIndex, claimedRewardSteps, showStoryModal, showChapterTitle, showChapter2Title, isStoryTransitioning, user, ownedSkillAbbrs]);

  useEffect(() => {
    if (!suppressAdminBattleStoryOpenRef.current || !isChapter2) return;

    const flow = chapter2Flows.find(f => f.stageNo === stageCycle);
    const currentStep = flow?.flow[chapter2FlowIndex];
    if (stageMode === 'BOSS' && !gameStarted && currentStep?.type === 'battle') {
      suppressAdminBattleStoryOpenRef.current = false;
    }
  }, [isChapter2, chapter2Flows, stageCycle, chapter2FlowIndex, stageMode, gameStarted]);

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
    if (isAdminDebugSkillsActiveRef.current) return;
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
    if (isAdminDebugSkillsActiveRef.current) return;
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
    if (isAdminDebugSkillsActiveRef.current) return;
    if (suppressChapter2ProgressSaveRef.current) return;
    if (isChapter2) {
      if (user) {
        saveChapter2Progress(user.uid, { stageCycle, flowIndex: chapter2FlowIndex, canGoToBoss });
      }
    } else {
      localStorage.setItem('shiden_can_go_to_boss', canGoToBoss.toString());
    }
  }, [canGoToBoss, isChapter2, user, stageCycle, chapter2FlowIndex]);

  useEffect(() => {
    localStorage.setItem('shiden_use_rich_log', useRichLog.toString());
  }, [useRichLog]);

  useEffect(() => {
    // LIFUKUモード中はタイトル復帰フラグを上書きしない（リロード時にタイトルに戻るようにする）
    if (isAdminDebugSkillsActiveRef.current) return;
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
    setShowTitleMenuModal(false);
    setNewGameIntroChapter(1);
    setNewGameIntroTrackIndex(1);
    setIsNewGameIntroTrackAnimating(true);
    newGameIntroInputLockedRef.current = false;
    setShowNewGameIntro(true);
    
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

  const handleAdminSetChapter2Save = async (stageNo: number) => {
    if (!user) return;

    const now = Date.now();
    const flowIndex = 0;
    const chapter2Ref = ref(database, `profiles/${user.uid}/chapter2`);
    const snapshot = await get(chapter2Ref);
    const currentData = snapshot.exists() ? snapshot.val() : {};

    await set(chapter2Ref, {
      ...currentData,
      stageCycle: stageNo,
      flowIndex,
      canGoToBoss: false,
      lastUpdated: now
    });
    await saveProfileProgress(user.uid, { updatedAt: now });

    localStorage.setItem('shiden_chapter2_stage', stageNo.toString());
    localStorage.setItem('shiden_chapter2_flow_index', flowIndex.toString());
    localStorage.setItem('shiden_stage_cycle', stageNo.toString());
    localStorage.setItem('shiden_stage_mode', 'BOSS');
    localStorage.setItem('shiden_last_game_mode', 'BOSS');
    localStorage.setItem('shiden_can_go_to_boss', 'false');
    localStorage.setItem('shiden_updated_at', now.toString());

    setChapterProgress(prev => ({ ...prev, 2: stageNo }));
    setChapter2FlowIndex(flowIndex);
    setHasChapter2Save(true);
  };

  const handleEpilogueComplete = () => {
    setShowEpilogue(false);
    setStoryUrl(null);
    setStoryContentV2(null);
    setCreditsUrl('/data/credits.json');
    saveStoryCanvasState({ kind: 'credits', stageCycle: 12, id: '/data/credits.json' });
    setShowStoryModal(true);
    setGameStarted(false);
    setIsTitle(false);
  };

  const handleChapterSelect = async (chapter: number, isNewGame: boolean = false) => {
    setIsAdminDebugSkillsActive(false);
    // 第2章はログイン必須
    if (chapter === 2 && !user) {
      setStageMode('LOUNGE');
      setIsTitle(false);
      setShowChapterSelect(null);
      return;
    }

    if (isNewGame) {
      const chapterLabel = chapter === 1 ? "第1章" : `第${chapter}章`;
      const confirmed = window.confirm(
        
        `進行中のステージと獲得済みのスキルがリセットされますが、よろしいですか？\n` +
        `別の章の進行状況や獲得済みスキルには影響しません。`
      );
      if (!confirmed) return;
    }

    let stage = isNewGame ? (chapter === 2 ? 13 : 1) : (chapterProgress[chapter] || (chapter === 2 ? 13 : 1));
    let flowIndex = 0;
    let savedStoryCanvasState: StoryCanvasState | null = null;
    if (!isNewGame && chapter === 2) {
      try {
        const saved = localStorage.getItem(STORY_CANVAS_STATE_KEY);
        savedStoryCanvasState = saved ? JSON.parse(saved) as StoryCanvasState : null;
      } catch {
        savedStoryCanvasState = null;
      }
    }
    
    if (isNewGame) {
      clearStoryCanvasState();
      const now = Date.now();
      if (chapter === 1) {
        localStorage.setItem('shiden_owned_skills', JSON.stringify(CHAPTER1_INITIAL_SKILLS));
        localStorage.removeItem('shiden_chapter1_stage');
        localStorage.setItem('shiden_stage_cycle', '1');
        localStorage.setItem('shiden_stage_mode', 'MID');
        localStorage.setItem('shiden_last_game_mode', 'MID');
        localStorage.setItem('shiden_can_go_to_boss', 'false');
        localStorage.setItem('shiden_updated_at', now.toString());
        if (user) {
          await resetChapter1Progress(user.uid, CHAPTER1_INITIAL_SKILLS);
        }
        setChapterProgress(prev => ({ ...prev, 1: 1 }));
      } else {
        suppressChapter2ProgressSaveRef.current = true;
        localStorage.setItem('shiden_chapter2_stage', '13');
        localStorage.setItem('shiden_chapter2_flow_index', '0');
        localStorage.setItem('shiden_stage_cycle', '13');
        localStorage.setItem('shiden_stage_mode', 'BOSS');
        localStorage.setItem('shiden_last_game_mode', 'BOSS');
        localStorage.setItem('shiden_can_go_to_boss', 'false');
        localStorage.setItem('shiden_updated_at', now.toString());
        setChapter2SkillsHydrated(false);
        setChapterProgress(prev => ({ ...prev, 2: 13 }));
        setChapter2FlowIndex(0);
        saveClaimedRewardSteps([]);
        localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(CHAPTER2_INITIAL_SKILLS));
        localStorage.removeItem('shiden_chapter2_reward_choices');

        // 第2章のデータをFirebaseにもリセット
        if (user) {
          await resetChapter2Progress(user.uid, CHAPTER2_INITIAL_SKILLS);
        }
        setChapter2SkillsHydrated(true);
      }
      // NEW GAME時は所持スキルもリセット
      const initialSkills = chapter === 2 ? CHAPTER2_INITIAL_SKILLS : CHAPTER1_INITIAL_SKILLS;
      setOwnedSkillAbbrs(initialSkills);
      if (chapter === 1) {
        localStorage.setItem('shiden_owned_skills', JSON.stringify(initialSkills));
      }
      if (chapter === 2) {
        window.setTimeout(() => {
          suppressChapter2ProgressSaveRef.current = false;
        }, 0);
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

    if (savedStoryCanvasState) {
      const resumed = await resumeStoryCanvasState(savedStoryCanvasState);
      if (resumed) return;
      clearStoryCanvasState();
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
      // 第2章の新規開始時のみプロローグを流す
      setStoryContent(null);
      setStoryContentV2(null);
      setCreditsUrl(null);
      setStoryUrl(null);
      setShowPrologueTitle(true);
      setIsTitle(false);
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
          if (isAdminDebugSkillsActiveRef.current) return;
          if (snapshot.exists()) {
            const data = snapshot.val();
            const inferredLoopCount =
              data.stageCycle === 24 &&
              data.flowIndex === 5 &&
              Boolean(data.canGoToBoss)
                ? 1
                : 0;
            if (data.loopCount === undefined) {
              saveChapter2Progress(authenticatedUser.uid, { loopCount: inferredLoopCount });
            }
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
            if (isAdminDebugSkillsActiveRef.current) return;
            const storedStageCycle = parseInt(localStorage.getItem('shiden_stage_cycle') || `${stageCycle}`, 10);
            const storedStageInfo = STAGE_DATA.find(s => s.no === storedStageCycle);
            const hasChapter2Context =
              storedStageCycle >= 13 ||
              (storedStageInfo?.chapter !== undefined && storedStageInfo.chapter >= 2);
            
            // 進行状況の同期ロジック
            // Firebase側にある最終更新日時を確認
            const firebaseUpdatedAt = data.updatedAt || 0;
            const localUpdatedAt = parseInt(localStorage.getItem('shiden_updated_at') || '0', 10);
            
            if (!hasChapter2Context) {
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
                saveProfileProgress(authenticatedUser.uid, {
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
                  saveProfileProgress(authenticatedUser.uid, { stageCycle: localStageCycle, updatedAt: localUpdatedAt });
                }
              }
            }

            // 所持スキルの同期
            // 第2章の所持スキルは profiles/{uid}/chapter2/ownedSkills で管理する。
            // ここで第1章用の ownedSkills を画面状態へ反映すると、リロード直後に第2章スキルを上書きしてしまう。
            if (hasChapter2Context && data.chapter2) {
              const chapter2Data = data.chapter2;
              const remoteStage = typeof chapter2Data.stageCycle === 'number' ? chapter2Data.stageCycle : storedStageCycle;
              const remoteFlow = typeof chapter2Data.flowIndex === 'number' ? chapter2Data.flowIndex : parseInt(localStorage.getItem('shiden_chapter2_flow_index') || '0', 10);
              const localStage = parseInt(localStorage.getItem('shiden_stage_cycle') || `${stageCycle}`, 10);
              const localFlow = parseInt(localStorage.getItem('shiden_chapter2_flow_index') || `${chapter2FlowIndex}`, 10);
              const hasLocalOnlyProgress = isProgressAhead(localStage, localFlow, remoteStage, remoteFlow);

              if (isProgressAhead(remoteStage, remoteFlow, localStage, localFlow)) {
                setStageCycle(remoteStage);
                setChapter2FlowIndex(remoteFlow);
                setStageMode('BOSS');
                localStorage.setItem('shiden_stage_cycle', remoteStage.toString());
                localStorage.setItem('shiden_chapter2_flow_index', remoteFlow.toString());
                localStorage.setItem('shiden_stage_mode', 'BOSS');
                localStorage.setItem('shiden_last_game_mode', 'BOSS');
              }
              if (chapter2Data.canGoToBoss !== undefined) {
                setCanGoToBoss(Boolean(chapter2Data.canGoToBoss));
              }

              const remoteSkills = Array.isArray(chapter2Data.ownedSkills)
                ? getRegularSkills(chapter2Data.ownedSkills, 2)
                : CHAPTER2_INITIAL_SKILLS;
              const localChapter2Skills = getStoredChapter2Skills();
              const mergedChapter2Skills = Array.from(new Set([...remoteSkills, ...localChapter2Skills]));
              const hasLocalOnlySkill = mergedChapter2Skills.some(abbr => !remoteSkills.includes(abbr));
              if (!haveSameItems(localChapter2Skills, mergedChapter2Skills)) {
                setOwnedSkillAbbrs(mergedChapter2Skills);
              }
              localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(mergedChapter2Skills));

              const remoteClaimedSteps = Array.isArray(chapter2Data.claimedRewardSteps) ? chapter2Data.claimedRewardSteps : [];
              const localClaimedSteps = getStoredClaimedRewardSteps();
              const mergedClaimedSteps = saveClaimedRewardSteps([...remoteClaimedSteps, ...localClaimedSteps]);
              const hasLocalOnlyClaimedStep = mergedClaimedSteps.some(step => !remoteClaimedSteps.includes(step));
              setChapter2SkillsHydrated(true);

              if (hasLocalOnlyProgress || hasLocalOnlySkill || hasLocalOnlyClaimedStep) {
                saveChapter2Progress(authenticatedUser.uid, {
                  stageCycle: Math.max(remoteStage, localStage),
                  flowIndex: isProgressAhead(remoteStage, remoteFlow, localStage, localFlow) ? remoteFlow : localFlow,
                  ownedSkills: mergedChapter2Skills,
                  claimedRewardSteps: mergedClaimedSteps,
                  canGoToBoss: chapter2Data.canGoToBoss
                });
              }
            }

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
                  saveProfileProgress(authenticatedUser.uid, { ownedSkills: mergedSkills, updatedAt: localUpdatedAt });
                }
              } else {
                // 日時が同じ場合は和集合
                const mergedSkills = Array.from(new Set([...firebaseOwnedSkills, ...localOwnedSkills]));
                if (mergedSkills.length > firebaseOwnedSkills.length) {
                  saveProfileProgress(authenticatedUser.uid, { ownedSkills: mergedSkills, updatedAt: localUpdatedAt });
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
              storyBookCouponUnlocked: false,
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

    // ランキング用に全プロフィールを取得する
    const profilesRef = ref(database, 'profiles');
    const unsubProfiles = onValue(profilesRef, (snapshot) => {
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
      titleHeroPcUrl,
      titleHeroMobileUrl
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
          } else if (current.name === "＋光") {
            hasSynergy = prev.name === "一閃"; // +光は一閃のみに反応
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

  const applyPostLogBattleOutcome = (winCount: number) => {
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

    if (!isVictory || !(stageMode === 'BOSS' || stageMode === 'KENJU' || stageMode === 'DENEI' || isChapter2)) {
      return;
    }

    if (!isChapter2FinalBattle) {
      triggerVictoryConfetti();
    }

    if (isChapter2) {
      setCanGoToBoss(true);
      return;
    }

    if (stageMode === 'BOSS') {
      setShowBossClearPanel(true);
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
  };

  const finalizeBattleResults = (
    results: BattleResult[],
    winCount: number,
    battleCount: number,
    context: any,
    options?: { markLogComplete?: boolean }
  ) => {
    const shouldMarkLogComplete = options?.markLogComplete === true;

    setBattleResults(results);
    setGameStarted(true);
    setShowLogForBattleIndex(results.length > 0 ? 0 : -1);
    setLogComplete(shouldMarkLogComplete);

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
      return;
    }

    const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle);
    const isChapter2 = currentStageInfo?.chapter === 2;
    const isVictory = (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) || isChapter2 ? winCount >= 1 : winCount === 10;
    const result = isVictory ? stageProcessor.onVictory(context) : stageProcessor.onFailure(context);

    if (isVictory) {
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
    } else if (isChapter2) {
      setCanGoToBoss(false);
    }

    if (result.showReward && !isChapter2 && getAvailableSkillsUntilStage(stageCycle).filter(s => !ownedSkillAbbrs.includes(s.abbr)).length > 0) {
      if ((result as any).pendingClear) setBossClearRewardPending(true);
      else setRewardSelectionMode(true);
    } else if (isVictory && (['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode) && !isChapter2) {
      setShowBossClearPanel(true);
    }

    if (shouldMarkLogComplete) {
      applyPostLogBattleOutcome(winCount);
    }
  };

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
      setLogComplete(false);
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
      
      let winCountTotal = 0;
      for (let i = 0; i < battleCount; i++) {
        const enemyName = stageProcessor.getEnemyName(i, context);
        const currentComputerSkills = stageProcessor.getEnemySkills(i, context);
        const currentStageInfo = context.chapter2SubStage !== undefined && stageCycle >= 13
          ? STAGE_DATA.find(s => s.chapter === 2 && s.stage === stageCycle - 12 && s.battle === context.chapter2SubStage)
          : STAGE_DATA.find(s => s.no === stageCycle);
        const defaultPlayerName = currentStageInfo?.chapter === 2 ? (currentStageInfo.playerName || "あなた") : "あなた";
        const playerName = getPlayerNameForSkills(selectedPlayerSkills, defaultPlayerName);
        const game = new Game(selectedPlayerSkills.join("") + "／" + playerName, currentComputerSkills.map(s => s.abbr).join("") + "／" + enemyName);
        const winner = game.startGame();
        if (winner === 1) winCountTotal++;
        results.push({ playerSkills: playerSkillDetails, computerSkills: currentComputerSkills, winner, resultText: winner === 1 ? "Win!" : winner === 2 ? "Lose" : "Draw", gameLog: game.gameLog, battleInstance: game.battle });
        if ((['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode)) break;
      }
      finalizeBattleResults(results, winCountTotal, battleCount, context);
    } else {
      alert(`スキルを${PLAYER_SKILL_COUNT}枚選択してください。`);
    }
  };

  const handleDebugWin = () => {
    if (selectedPlayerSkills.length !== PLAYER_SKILL_COUNT) {
      alert(`スキルを${PLAYER_SKILL_COUNT}枚選択してください。`);
      return;
    }

    window.scrollTo({ top: 0 });
    if (mainGameAreaRef.current) mainGameAreaRef.current.scrollTop = 0;

    const context = stageContext;
    const battleCount = stageProcessor.getBattleCount();
    const playerSkillDetails = getSkillCardsFromAbbrs(selectedPlayerSkills);
    const results: BattleResult[] = [];

    setRewardSelectionMode(false);
    setSelectedRewards([]);
    setShowBossClearPanel(false);

    for (let i = 0; i < battleCount; i++) {
      const enemyName = stageProcessor.getEnemyName(i, context);
      const currentComputerSkills = stageProcessor.getEnemySkills(i, context);
      results.push({
        playerSkills: playerSkillDetails,
        computerSkills: currentComputerSkills,
        winner: 1,
        resultText: 'Debug Win!',
        gameLog: [
          `DEBUG: ${enemyName} との戦闘を強制勝利しました。`,
          'あなたの勝利！'
        ].join('\n')
      });
      if ((['BOSS', 'KENJU', 'DENEI'] as StageMode[]).includes(stageMode)) break;
    }

    finalizeBattleResults(results, results.length, battleCount, context, { markLogComplete: true });
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
      saveProfileProgress(user.uid, {
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
        const isPreBattleReward = flow?.flow[chapter2FlowIndex + 1]?.type === 'battle';
        const previousBattleStep = [...(flow?.flow.slice(0, chapter2FlowIndex) || [])].reverse().find(step => step.type === 'battle');
        const hasCurrentBattleResults = battleResults.length > 0;
        const hasCurrentBattleVictory = battleResults.some(result => result.winner === 1);
        const hasChapter2BattleVictory = hasCurrentBattleVictory || (!hasCurrentBattleResults && canGoToBoss);
        if (!isPreBattleReward && previousBattleStep && !hasChapter2BattleVictory) {
          alert("第2章の報酬は、直前の戦闘に勝利した時だけ獲得できます。");
          setSelectedRewards([]);
          setRewardSelectionMode(false);
          return;
        }

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
      localStorage.setItem('shiden_updated_at', now.toString());

      if (isChapter2Reward) {
        if (!user) {
          alert("第2章の報酬を保存するにはログインが必要です。タイトルに戻ってログインし直してください。");
          setIsTitle(true);
          return;
        }

        const result = await claimChapter2Reward(user.uid, {
          rewardStepKey,
          rewards: rewardsToClaim,
          stageCycle,
          flowIndex: chapter2FlowIndex,
          lastUpdated: now
        });

        if (!result.claimed) {
          const serverData = result.data || {};
          const serverSkills = Array.isArray(serverData.ownedSkills)
            ? getRegularSkills(serverData.ownedSkills, 2)
            : getStoredChapter2Skills();
          const serverClaimedSteps = Array.isArray(serverData.claimedRewardSteps)
            ? serverData.claimedRewardSteps
            : getStoredClaimedRewardSteps();

          setOwnedSkillAbbrs(serverSkills);
          localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(serverSkills));
          saveClaimedRewardSteps(serverClaimedSteps);

          if (typeof serverData.stageCycle === 'number') {
            setStageCycle(serverData.stageCycle);
            localStorage.setItem('shiden_stage_cycle', serverData.stageCycle.toString());
          }
          if (typeof serverData.flowIndex === 'number') {
            setChapter2FlowIndex(serverData.flowIndex);
            localStorage.setItem('shiden_chapter2_flow_index', serverData.flowIndex.toString());
          }

          alert("この報酬は別のタブまたは端末ですでに処理されています。最新のセーブデータへ同期します。");
          setSelectedRewards([]);
          setRewardSelectionMode(false);
          setShowStoryModal(false);
          setGameStarted(false);
          setIsTitle(true);
          return;
        }

        const serverData = result.data || {};
        const newOwnedSkills = Array.isArray(serverData.ownedSkills)
          ? getRegularSkills(serverData.ownedSkills, 2)
          : Array.from(new Set([...ownedSkillAbbrs, ...rewardsToClaim]));
        const newClaimedSteps = Array.isArray(serverData.claimedRewardSteps)
          ? serverData.claimedRewardSteps
          : saveClaimedRewardSteps([...claimedRewardSteps, rewardStepKey]);

        setOwnedSkillAbbrs(newOwnedSkills);
        saveClaimedRewardSteps(newClaimedSteps);
        localStorage.removeItem('shiden_chapter2_reward_choices');
        localStorage.setItem(CHAPTER2_OWNED_SKILLS_KEY, JSON.stringify(newOwnedSkills));
        await saveProfileProgress(user.uid, { updatedAt: now });
      } else {
        const newOwnedSkills = Array.from(new Set([...ownedSkillAbbrs, ...rewardsToClaim]));
        setOwnedSkillAbbrs(newOwnedSkills);
        localStorage.setItem('shiden_owned_skills', JSON.stringify(newOwnedSkills));
        if (user) {
          await saveProfileProgress(user.uid, { ownedSkills: newOwnedSkills, updatedAt: now });
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
        saveProfileProgress(user.uid, { lastGameMode: 'BOSS', updatedAt: now });
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
        saveChapter2Progress(user.uid, {
          stageCycle: nextCycle,
          flowIndex: 0,
          ownedSkills: ownedSkillAbbrs,
          claimedRewardSteps,
          canGoToBoss: false,
          lastUpdated: now
        });
      }
    }
    
    // 第1章・第2章に関わらず、初期表示の高速化のために localStorage にも保存しておく
    localStorage.setItem('shiden_stage_cycle', nextCycle.toString());

    // 章ごとの進捗も保存
    if (nextStageInfo?.chapter) {
      const chapterKey = `shiden_chapter${nextStageInfo.chapter}_stage`;
      if (nextStageInfo.chapter >= 2) {
        localStorage.setItem(chapterKey, nextCycle.toString());
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
      saveProfileProgress(user.uid, {
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
    const winCount = battleResults.filter(r => r.winner === 1).length;
    applyPostLogBattleOutcome(winCount);
  };

  const handleForceUpdate = () => {
    if (changelogData.length > 0) {
      const latestVersion = changelogData[changelogData.length - 1].date + "_" + changelogData[changelogData.length - 1].title;
      localStorage.setItem('shiden_version', latestVersion);
    }
    // 強制更新を模倣するためにキャッシュを無視してリロード
    window.location.reload();
  };

  const handleAdminClearClientCache = async () => {
    if (!window.confirm('この端末のアプリキャッシュを削除して再読み込みしますか？\n進行データやアカウント情報は削除しません。')) {
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }

      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map(cacheKey => window.caches.delete(cacheKey)));
      }

      setShowAdmin(false);
      window.alert('この端末のキャッシュを削除しました。再読み込みします。');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear client cache:', error);
      window.alert('キャッシュ削除に失敗しました。コンソールを確認してください。');
    }
  };


  const currentStageInfo = STAGE_DATA.find(s => s.no === stageCycle) || STAGE_DATA[STAGE_DATA.length - 1];
  const isMobile = window.innerWidth < 768;
  const isLargeScreen = window.innerWidth > 1024;
  const isLoungeMode = ['LOUNGE', 'MYPAGE', 'PROFILE', 'RANKING', 'DELETE_ACCOUNT', 'ADMIN_ANALYTICS'].includes(stageMode);
  const titleHeroUrl = isMobile ? titleHeroMobileUrl : titleHeroPcUrl;
  const newGameIntroPanels = [
    {
      chapter: 1 as const,
      image: '/images/chapter/Chapter1.webp',
      alt: '第1章 導入イメージ',
      eyebrow: 'FIGHT TO SURVIVE',
      title: '孤独な少女と、無人島の秘密。',
      lead: (
        <>
          無人島に閉じ込められた、少女の物語。
          {isMobile && <br />}
          ユーザ未登録でも遊べます。
        </>
      ),
      cta: '第1章を始める'
    },
    {
      chapter: 2 as const,
      image: '/images/chapter/Chapter2.webp',
      alt: '第2章 導入イメージ',
      eyebrow: 'SECOND CHAPTER',
      title: '旗を掲げろ。海賊達の冒険譚。',
      lead: (
        <>
          幻の島《アノマ》を追い求める、海賊の物語。
          {isMobile && <br />}
          第1章未クリアでも遊べます。 ※BGMが流れます
        </>
      ),
      cta: '第2章を始める'
    }
  ];
  const newGameIntroLoopPanels = [
    newGameIntroPanels[1],
    newGameIntroPanels[0],
    newGameIntroPanels[1],
    newGameIntroPanels[0]
  ];
  const moveNewGameIntro = (direction: 'prev' | 'next') => {
    if (newGameIntroInputLockedRef.current) return;
    newGameIntroInputLockedRef.current = true;
    setIsNewGameIntroTrackAnimating(true);
    setNewGameIntroTrackIndex((prev) => prev + (direction === 'next' ? 1 : -1));
    setNewGameIntroChapter((prev) => (prev === 1 ? 2 : 1));
  };

  const handleTapStart = () => {
    if (showTitleMenuModal || isTapStartBlinking) return;
    setIsTapStartBlinking(true);
    window.setTimeout(() => {
      setShowTitleMenuModal(true);
      setIsTapStartBlinking(false);
    }, 420);
  };

  useEffect(() => {
    if (isTitle) {
      setShowTitleMenuModal(false);
      setIsTapStartBlinking(false);
    }
  }, [isTitle]);

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
      if (adminEpilogueSequence !== 'idle') {
        if (adminEpilogueSequence === 'title') {
          audioManager.stopBgm();
        }
        return;
      }

      if (showStoryModal || showChapter2Title) return;
      
      if (showChapterTitle || showPrologueTitle) {
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
        if (!isChapter2 && (stageMode === 'BOSS' || stageMode === 'MID')) {
          audioManager.stopBgm();
          return;
        }
        
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

  }, [isTitle, stageMode, showStoryModal, showChapterTitle, showChapter2Title, showPrologueTitle, adminEpilogueSequence, bgmEnabled, bgmVolume, stageCycle, isChapter2, isLoungeMode, kenjuBoss, currentKenjuBattle, chapter2Flows, chapter2FlowIndex, gameStarted, stagesLoaded]);

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
        profiles={pagedProfiles}
        allProfiles={sortedProfiles}
        chapter2Flows={chapter2Flows}
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
          clearStoryCanvasState();
          setShowStoryModal(false);
          setShowChapterTitle(false);
          setShowChapter2Title(false);
          setShowPrologueTitle(false);
          setCreditsUrl(null);
          setStoryUrl(null);
          setStoryContent(null);
          setStoryContentV2(null);
          setGameStarted(false);
          setBattleResults([]);
          setShowLogForBattleIndex(-1);
          setRewardSelectionMode(false);
          setSelectedRewards([]);
          setSelectedPlayerSkills([]);
          setCanGoToBoss(false);
          setStageMode('MID');
          setIsTitle(true);
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
    if (!isAssetsLoaded || !stagesLoaded) return <div className="TitleScreenContainer" style={{ backgroundColor: '#000', backgroundImage: `url(${titleHeroUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
    const hasSaveData = !!localStorage.getItem('shiden_stage_cycle');
    return (
      <div className="TitleScreenContainer" style={{
        height: '100dvh', // 動的ビューポート単位を使用
        overflowX: 'hidden',
        overflowY: 'hidden',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        position: 'fixed', // スクロールを物理的に抑制
        top: 0,
        left: 0,
        width: '100%',
        backgroundImage: `url(${titleHeroUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        {storyBookOverlay}
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
        <div className="TitleContent TitleContentRenewed" style={{
          width: '100%',
          marginTop: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '0' : '0'
        }}>
          <div className="TitleHeroFrame" onClick={handleTapStart}>
            <img
              src={titleHeroUrl}
              alt=""
              aria-hidden="true"
              className="TitleHeroBackdrop"
            />
            <img
              src={titleHeroUrl}
              alt="紫電一閃 タイトル"
              className="TitleHeroImage"
            />
            <div className="TitleHeroShade"></div>
            <div className="TitleHeroLight"></div>
            <div className="TitleOverlayLayer">
              <div
                className={`TitleTapStart ${showTitleMenuModal ? 'is-hidden' : ''} ${isTapStartBlinking ? 'is-blinking' : ''}`}
              >
                Tap to Start
              </div>
              <div className={`TitleCatchcopy ${showTitleMenuModal ? 'is-hidden' : ''}`}>
                <div className="TitleCatchcopyMain">
                  頼れるのは、君の
                  <ruby className="TitleCatchcopyRuby">
                    閃き
                    <rt>スキル</rt>
                  </ruby>
                  だけ。
                </div>
                <div className="TitleCatchcopySub">- パズル感覚ノンフィールドRPG - </div>
              </div>

              <div className="TitleFooter TitleFooterRenewed">
                {user && (
                  <div className="TitleUserName">
                    <span className="TitleUserNameLabel">USER</span>
                    <span className="TitleUserNameValue">{myProfile?.displayName || "名もなき人"}</span>
                  </div>
                )}
                <div className="TitleFooterStat">{activeUsers}人がプレイ中です</div>
                <div className="TitleFooterCopyright"> © 2026 Shiden Games </div>
                <div className="TitleFooterLinks">
                  <span className="TitleFooterLinkButton" onClick={(e) => { e.stopPropagation(); setShowLegal(true); }}>規約・運営情報</span>
                  <a href="https://x.com/ShidenGames" target="_blank" rel="noopener noreferrer" className="TitleFooterLinkButton" onClick={(e) => e.stopPropagation()}>お問い合わせ</a>
                </div>
                {isAdmin && (
                  <>
                    <button
                      className="TitleAdminButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTitleMenuModal(false);
                        setShowChapter2StoryBook(true);
                      }}
                      style={{ bottom: '92px', background: 'rgba(0, 137, 123, 0.92)', borderColor: 'rgba(129, 255, 230, 0.45)' }}
                    >
                      第2章ブック
                    </button>
                    <button
                      className="TitleAdminButton"
                      onClick={(e) => { e.stopPropagation(); setShowAdmin(true); }}
                    >
                      管理者パネル
                    </button>
                    <div onDoubleClick={() => setShowAdmin(true)} style={{ position: 'fixed', bottom: 0, left: 0, width: '50px', height: '50px', opacity: 0 }} />
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ margin: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '10px auto' : '40px auto 20px', display: 'none', maxWidth: '600px', background: 'rgba(0,0,0,0.7)', padding: '25px', borderRadius: '15px', border: '1px solid #444', textAlign: 'left', position: 'relative', zIndex: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#ffd700', fontSize: '1.2rem', marginTop: 0, marginBottom: '15px', borderLeft: '4px solid #ffd700', paddingLeft: '12px' }}>ゲーム紹介</h3>
            <p style={{ color: '#eee', fontSize: '0.95rem', lineHeight: '1.8', margin: 0 }}>
              「紫電一閃」は、スキルを組み合わせて戦う本格ターン制バトルゲームです。<br />
              全12ステージに立ちはだかる個性豊かなボスを撃破し、世界の果てに待つ真のエンディングを目指しましょう。<br /><br />
              オンライン要素も充実しており、「LOUNGE」では他のプレイヤーのプロフィールを閲覧したり、ユーザー自身が作成した強力なオリジナルボス「電影（でんえい）」に挑戦して腕を競い合うことができます。
            </p>
          </div>

        </div>
        
        {(showTitleMenuModal || showNewGameIntro) && (
          <div className="ChangelogTab" onClick={() => setShowChangelog(true)}>
            <span>更新履歴</span>
          </div>
        )}

        {showChapterSelect && (
          <div
            className="TitleStartModalOverlay"
            onClick={() => setShowChapterSelect(null)}
            style={{ zIndex: 2200 }}
          >
            <div
              className="TitleStartModal TitleChapterSelectModal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="TitleStartModalHeader" style={{ marginBottom: '20px' }}>
                <span>{showChapterSelect.mode === 'NEW' ? 'NEW GAME - 章選択' : 'CONTINUE - 章選択'}</span>
                <button onClick={() => setShowChapterSelect(null)} className="TitleStartModalClose">×</button>
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
                  className="ChapterSelectCard"
                  onClick={() => handleChapterSelect(1, showChapterSelect.mode === 'NEW')}
                  style={{ 
                    flex: 1,
                    cursor: 'pointer',
                    border: '1px solid rgba(137, 216, 255, 0.56)',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, rgba(10, 28, 52, 0.72), rgba(8, 20, 38, 0.54))',
                    transition: 'transform 0.2s',
                    position: 'relative',
                    boxShadow: '0 18px 38px rgba(3, 14, 32, 0.22)',
                    backdropFilter: 'blur(12px)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src={getStorageUrl('/images/chapter/Chapter1.webp')} 
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
                {(() => {
                  const needsChapter2Login = !user;
                  const isChapter2ContinueUnavailable = showChapterSelect.mode === 'CONTINUE' && !hasChapter2Save && !needsChapter2Login;
                  const isChapter2PanelDimmed = needsChapter2Login || isChapter2ContinueUnavailable;

                  return (
                <div 
                  className="ChapterSelectCard"
                  onClick={() => {
                    if (needsChapter2Login) {
                      handleChapterSelect(2, showChapterSelect.mode === 'NEW');
                      return;
                    }
                    if (isChapter2ContinueUnavailable) return;
                    handleChapterSelect(2, showChapterSelect.mode === 'NEW');
                  }}
                  style={{ 
                    flex: 1,
                    cursor: isChapter2ContinueUnavailable ? 'default' : 'pointer',
                    border: isChapter2PanelDimmed ? '1px solid rgba(80, 80, 80, 0.5)' : '1px solid rgba(255, 120, 120, 0.56)',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, rgba(10, 28, 52, 0.72), rgba(8, 20, 38, 0.54))',
                    transition: 'transform 0.2s',
                    position: 'relative',
                    opacity: isChapter2PanelDimmed ? 0.45 : 1,
                    filter: isChapter2PanelDimmed ? 'grayscale(1)' : 'none',
                    boxShadow: '0 18px 38px rgba(3, 14, 32, 0.22)',
                    backdropFilter: 'blur(12px)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isChapter2ContinueUnavailable) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isChapter2ContinueUnavailable) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <img 
                    src={getStorageUrl('/images/chapter/Chapter2.webp')} 
                    alt="Chapter 2" 
                    style={{ width: '100%', height: isMobile ? '150px' : '200px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ color: isChapter2PanelDimmed ? '#666' : '#ff5252', fontSize: '1.2rem', fontWeight: 'bold' }}>第2章 FLAG</div>
                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '5px' }}>
                      {needsChapter2Login ? 'LOUNGEでユーザ登録が必要です' :
                        showChapterSelect.mode === 'NEW' ? '最初から開始' : 
                        !hasChapter2Save ? '未プレイ' : (() => {
                        const stage = chapterProgress[2] || 13;
                        return `現在進行中: ${getChapter2StageLabel(stage, chapter2FlowIndex)}`;
                      })()}
                    </div>
                  </div>
                </div>
                  );
                })()}
              </div>
              
              {showChapterSelect.mode === 'NEW' && (
                <button 
                  className="ChangelogCloseButton" 
                  onClick={() => setShowChapterSelect(null)}
                  style={{ marginTop: '20px' }}
                >
                  閉じる
                </button>
              )}
            </div>
          </div>
        )}
        {(showTitleMenuModal || showNewGameIntro) && (
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
        )}

        {showTitleMenuModal && (
          <div className="TitleStartModalOverlay" onClick={() => setShowTitleMenuModal(false)}>
            <div className="TitleStartModal" onClick={(e) => e.stopPropagation()}>
              <div className="TitleStartModalHeader">
                <span>MENU</span>
                <button onClick={() => setShowTitleMenuModal(false)} className="TitleStartModalClose">×</button>
              </div>
              <div className="TitleMenu TitleMenuRenewed">
                <button className="TitleButton neon-blue" onClick={handleNewGame}>NEW GAME</button>
                <button className="TitleButton neon-gold" onClick={handleContinue} disabled={!hasSaveData}>CONTINUE</button>
                <button className="TitleButton neon-green" onClick={() => { setStageMode('LOUNGE'); setIsTitle(false); refreshKenju(); }} >LOUNGE</button>
                {canAccessChapter2StoryBook && (
                  <button
                    className="TitleButton neon-blue"
                    onClick={() => {
                      setShowTitleMenuModal(false);
                      setShowChapter2StoryBook(true);
                    }}
                  >
                    STORY BOOK
                  </button>
                )}
                <button
                  className="TitleButton neon-purple"
                  onClick={() => {
                    if (hasSaveData) {
                      setShowRule(true);
                    } else {
                      setShowRuleHint(true);
                    }
                  }}
                  style={{ opacity: hasSaveData ? 1 : 0.58, cursor: 'pointer' }}
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
                <button
                  className="TitleMiniGameButton"
                  onClick={() => { setStageMode('LIFUKU'); setIsTitle(false); }}
                >
                  <span className="TitleMiniGameIcon" aria-hidden="true">
                    <span className="TitleMiniGameEye TitleMiniGameEyeLeft" />
                    <span className="TitleMiniGameEye TitleMiniGameEyeRight" />
                    <span className="TitleMiniGameMouth">
                      <span className="TitleMiniGameMouthLeft" />
                      <span className="TitleMiniGameMouthRight" />
                    </span>
                    <span className="TitleMiniGameCheek TitleMiniGameCheekLeft" />
                    <span className="TitleMiniGameCheek TitleMiniGameCheekRight" />
                  </span>
                  <span>MINI GAME</span>
                </button>
                <button
                  className="TitleButton neon-gold"
                  onClick={handleStoryBookCouponInput}
                  disabled={!user}
                  style={{ fontSize: '0.92rem', opacity: user ? 1 : 0.58, cursor: user ? 'pointer' : 'not-allowed' }}
                >
                  クーポンコード入力
                </button>
              </div>
            </div>
          </div>
        )}

        {showStoryBookCouponModal && (
          <div className="TitleStartModalOverlay" onClick={() => setShowStoryBookCouponModal(false)}>
            <div className="TitleStartModal TitleCouponModal" onClick={(e) => e.stopPropagation()}>
              <div className="TitleStartModalHeader">
                <span>COUPON CODE</span>
                <button onClick={() => setShowStoryBookCouponModal(false)} className="TitleStartModalClose">×</button>
              </div>
              <div className="TitleCouponLead">
                <div className="TitleCouponEyebrow">BOOTH Bonus</div>
                <h3 className="TitleCouponTitle">第2章ストーリーブック特典</h3>
                <p className="TitleCouponText">
                  BOOTHで販売予定の特典コードを入力すると、このアカウントで第2章ストーリーブックを閲覧できます。
                </p>
                <p className="TitleCouponText">
                  PDF版や冊子版とあわせて、ゲーム内の演出を振り返るための閲覧特典として使える想定です。
                </p>
              </div>

              <div className="TitleCouponForm">
                <label className="TitleCouponLabel" htmlFor="story-book-coupon-input">クーポンコード</label>
                <input
                  id="story-book-coupon-input"
                  className="TitleCouponInput"
                  type="text"
                  value={storyBookCouponInput}
                  onChange={(e) => setStoryBookCouponInput(e.target.value)}
                  placeholder="例: ABCD-EFGH-1234"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {storyBookCouponMessage && (
                  <div className={`TitleCouponMessage is-${storyBookCouponMessageType}`}>
                    {storyBookCouponMessage}
                  </div>
                )}
              </div>

              <div className="TitleCouponActions">
                {canAccessChapter2StoryBook && (
                  <button
                    className="TitleButton neon-blue"
                    onClick={() => {
                      setShowStoryBookCouponModal(false);
                      setShowTitleMenuModal(false);
                      setShowChapter2StoryBook(true);
                    }}
                  >
                    STORY BOOKを開く
                  </button>
                )}
                <button className="TitleButton neon-gold" onClick={handleSubmitStoryBookCoupon}>
                  クーポンを適用
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewGameIntro && (
          <div className="TitleStartModalOverlay" onClick={() => setShowNewGameIntro(false)}>
            <div className="TitleStartModal TitleNewGameIntroModal" onClick={(e) => e.stopPropagation()}>
              <div className="TitleStartModalHeader">
                <span>NEW GAME</span>
                <button onClick={() => setShowNewGameIntro(false)} className="TitleStartModalClose">×</button>
              </div>
              <div
                className="TitleNewGameIntroCarousel"
                onTouchStart={(e) => {
                  newGameIntroTouchStartXRef.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  const startX = newGameIntroTouchStartXRef.current;
                  const endX = e.changedTouches[0]?.clientX ?? null;
                  newGameIntroTouchStartXRef.current = null;
                  if (startX === null || endX === null) return;
                  const deltaX = endX - startX;
                  if (Math.abs(deltaX) < 40) return;
                  if (deltaX < 0) {
                    moveNewGameIntro('next');
                  } else {
                    moveNewGameIntro('prev');
                  }
                }}
              >
                <button
                  type="button"
                  className="TitleNewGameIntroNav TitleNewGameIntroNavLeft"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveNewGameIntro('prev');
                  }}
                  aria-label="前の章へ"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="TitleNewGameIntroNav TitleNewGameIntroNavRight"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveNewGameIntro('next');
                  }}
                  aria-label="次の章へ"
                >
                  ›
                </button>
                <div
                  className="TitleNewGameIntroTrack"
                  style={{
                    transform: `translateX(-${newGameIntroTrackIndex * 25}%)`,
                    transition: isNewGameIntroTrackAnimating ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
                  }}
                  onTransitionEnd={() => {
                    if (newGameIntroTrackIndex === 0) {
                      setIsNewGameIntroTrackAnimating(false);
                      setNewGameIntroTrackIndex(2);
                      window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                          setIsNewGameIntroTrackAnimating(true);
                          newGameIntroInputLockedRef.current = false;
                        });
                      });
                    } else if (newGameIntroTrackIndex === 3) {
                      setIsNewGameIntroTrackAnimating(false);
                      setNewGameIntroTrackIndex(1);
                      window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                          setIsNewGameIntroTrackAnimating(true);
                          newGameIntroInputLockedRef.current = false;
                        });
                      });
                    } else {
                      newGameIntroInputLockedRef.current = false;
                    }
                  }}
                >
                  {newGameIntroLoopPanels.map((panel, index) => (
                    <section className="TitleNewGameIntroPanel" key={`${panel.chapter}-${index}`}>
                      <div className="TitleNewGameIntroVisual">
                        <img
                          src={getStorageUrl(panel.image)}
                          alt={panel.alt}
                          className="TitleNewGameIntroImage"
                        />
                        <div className="TitleNewGameIntroGlow" />
                        <div className="TitleNewGameIntroCopy">
                          <div className="TitleNewGameIntroEyebrow">{panel.eyebrow}</div>
                          <div className="TitleNewGameIntroTitle">{panel.title}</div>
                        </div>
                      </div>
                      <div className="TitleNewGameIntroBody">
                        <p className="TitleNewGameIntroLead">{panel.lead}</p>
                        {panel.chapter === 2 && !user && (
                          <div className="TitleNewGameIntroNotice">LOUNGEでユーザ登録が必要です</div>
                        )}
                        <div className="TitleNewGameIntroActions">
                          <button
                            className="TitleButton neon-blue"
                            onClick={() => {
                              if (panel.chapter === 2 && !user) {
                                setShowNewGameIntro(false);
                                setStageMode('LOUNGE');
                                setIsTitle(false);
                                refreshKenju();
                                return;
                              }
                              setShowNewGameIntro(false);
                              handleChapterSelect(panel.chapter, true);
                            }}
                          >
                            {panel.chapter === 2 && !user ? 'ユーザ登録' : panel.cta}
                          </button>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
              <div className="TitleNewGameIntroFooter">
                <div className="TitleNewGameIntroPager" aria-hidden="true">
                  <span className={`TitleNewGameIntroDot ${newGameIntroChapter === 1 ? 'is-active' : ''}`} />
                  <span className={`TitleNewGameIntroDot ${newGameIntroChapter === 2 ? 'is-active' : ''}`} />
                </div>
                <div className="TitleNewGameIntroSwipeHint">
                  {isMobile ? '左右にスワイプして章を切り替え' : '左右のボタンで章を切り替え'}
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="ChangelogModalOverlay" onClick={() => setShowRuleHint(false)} style={{ backgroundColor: 'rgba(0, 0, 0, 0.28)', backdropFilter: 'blur(8px)' }}>
            <div className="ChangelogModal" style={{ maxWidth: '440px', border: '1px solid rgba(137, 216, 255, 0.7)', background: 'linear-gradient(180deg, rgba(8, 26, 52, 0.68), rgba(8, 20, 40, 0.5))', backdropFilter: 'blur(14px)', boxShadow: '0 28px 60px rgba(3, 14, 32, 0.32)' }} onClick={(e) => e.stopPropagation()}>
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
          <div className="ChangelogModalOverlay" onClick={() => setShowClearStats(false)} style={{ backgroundColor: 'rgba(0, 0, 0, 0.28)', backdropFilter: 'blur(8px)' }}>
            <div className="ChangelogModal" style={{ maxWidth: '600px', border: '1px solid rgba(255, 226, 136, 0.75)', background: 'linear-gradient(180deg, rgba(36, 28, 10, 0.68), rgba(20, 16, 6, 0.52))', backdropFilter: 'blur(14px)', boxShadow: '0 28px 60px rgba(3, 14, 32, 0.32)' }} onClick={(e) => e.stopPropagation()}>
              <div className="ChangelogHeader" style={{ background: '#ffd700' }}>
                <span style={{ color: '#000', fontWeight: 'bold' }}>BATTLE STATS</span>
                <button onClick={() => setShowClearStats(false)} style={{ background: 'none', border: 'none', color: '#000', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div className="ChangelogContent" style={{ padding: '20px' }}>
                <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>第1章 ステージクリア人数</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(stageNum => {
                    const totalClears = chapter1StageClearCounts[stageNum - 1] || 0;
                    const maxClears = Math.max(...chapter1StageClearCounts, 1);
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
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #444' }}>
                  <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>第2章 ステージクリア人数</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(stageNum => {
                      const totalClears = chapter2StageClearCounts[stageNum - 1] || 0;
                      const maxClears = Math.max(...chapter2StageClearCounts, 1);
                      const percentage = (totalClears / maxClears) * 100;
                      const hue = (12 - stageNum) * (270 / 11);
                      const barColor = `hsl(${hue}, 80%, 60%)`;

                      return (
                        <div key={`chapter2-${stageNum}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  setShowChapter2StoryBook(true);
                  setShowAdmin(false);
                }} style={{ background: '#00897b' }}>第2章ストーリーブック</button>
                <button onClick={() => {
                  setStoryContentV2(null);
                  setCreditsUrl(null);
                  setStoryUrl(null);
                  setShowAdmin(false);
                  setIsAdminPreview(true);
                  setAdminEpilogueSequence('idle');
                  setIsTitle(false);
                  setShowPrologueTitle(true);
                }} style={{ background: '#4527a0' }}>プロローグ (prologue.txt)</button>
                <button onClick={() => {
                  AudioManager.getInstance().stopBgm();
                  setCreditsUrl('/data/credits.json');
                  setShowAdmin(false);
                  setIsAdminPreview(true);
                  setAdminEpilogueSequence('credits');
                  setTimeout(() => setShowStoryModal(true), 50);
                }} style={{ background: '#2e7d32' }}>エンドロール (credits.json)</button>
                <button onClick={async () => {
                  const data = await loadV2Story('epilogue');
                  if (!data) return;
                  setStoryContent(null);
                  setStoryContentV2(data);
                  setStoryUrl(null);
                  setCreditsUrl(null);
                  setShowStoryModal(false);
                  setShowChapterTitle(false);
                  setShowChapter2Title(false);
                  setShowPrologueTitle(false);
                  setShowAdmin(false);
                  setIsAdminPreview(true);
                  setAdminEpilogueSequence('idle');
                  setStageCycle(24);
                  setStageMode('BOSS');
                  setGameStarted(false);
                  setIsTitle(false);
                  setShowEpilogue(false);
                  setTimeout(() => setShowStoryModal(true), 50);
                }} style={{ background: '#8d6e63' }}>エピローグ (v2/epilogue.txt)</button>
                <button onClick={startChapter2EpilogueSequence} style={{ background: '#ad1457' }}>エピローグ通し再生</button>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #444' }}>
              <h3 style={{ color: '#90caf9', marginTop: 0 }}>端末メンテナンス</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleAdminClearClientCache}
                  style={{ background: '#1565c0', border: '1px solid #64b5f6', fontWeight: 'bold' }}
                >
                  この端末のキャッシュ削除
                </button>
              </div>
              <div style={{ marginTop: '8px', color: '#bbb', fontSize: '0.85rem', lineHeight: 1.6 }}>
                PC版・スマホ版とも、このボタンを押した端末のアプリキャッシュだけを削除します。
              </div>
            </div>

            {/* 第1章 (Stage 1-12) */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#4fc3f7', borderBottom: '2px solid #4fc3f7', paddingBottom: '5px', marginBottom: '10px' }}>第1章 ISLAND</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                {STAGE_DATA.filter(s => s.no <= 12).map(s => (
                  <div key={s.no} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                    <div style={{ minWidth: '80px', fontWeight: 'bold', color: '#eee' }}>Stage {s.no}</div>
                    <button onClick={() => { applyAdminDebugSkills(); setStageCycle(s.no); setStageMode('MID'); setIsTitle(false); setShowAdmin(false); }} style={{ padding: '5px 10px', background: '#333', color: '#fff', border: '1px solid #555' }}>
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

                      <button onClick={async () => {
                        await handleAdminSetChapter2Save(stageNo);
                      }} style={{ padding: '5px 10px', background: '#455a64', border: '1px solid #78909c', fontWeight: 'bold' }}>
                        SAVE
                      </button>

                      <div style={{ display: 'flex', gap: '5px' }}>
                        {battleSteps.map(({ step, index: flowIndex }) => {
                          const subStage = step.subStage || 1;
                          const label = subStage === 1 ? 'MID' : subStage === 2 ? 'BOSS' : `BATTLE ${subStage}`;
                          const background = subStage === 1 ? '#1a237e' : subStage === 2 ? '#b71c1c' : '#4a148c';
                          const border = subStage === 1 ? '#534bae' : subStage === 2 ? '#f05545' : '#7b1fa2';

                          return (
                            <button key={`${stageNo}-${subStage}`} onClick={() => {
                              applyAdminDebugSkills();
                              suppressAdminBattleStoryOpenRef.current = true;
                              setChapter2FlowIndex(flowIndex);
                              setStageCycle(stageNo);
                              setStageMode('BOSS');
                              setGameStarted(false);
                              setCanGoToBoss(false);
                              setLogComplete(false);
                              setBattleResults([]);
                              setShowLogForBattleIndex(-1);
                              setShowStoryModal(false);
                              setStoryContent(null);
                              setStoryContentV2(null);
                              clearStoryCanvasState();
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
                autoEndOnScriptEnd={adminEpilogueSequence === 'story'}
                onEnd={() => {
                  const isPrologue = !!storyUrl;
                  const isCredits = !!creditsUrl;
                  let completedStoryState: StoryCanvasState | null = null;
                  try {
                    completedStoryState = JSON.parse(localStorage.getItem(STORY_CANVAS_STATE_KEY) || 'null');
                  } catch {
                    completedStoryState = null;
                  }
                  clearStoryCanvasState();
                  setShowStoryModal(false);
                  setStoryUrl(null);
                  setCreditsUrl(null);
                  setStoryContentV2(null);
                  setGameStarted(false);

                  if (adminEpilogueSequence === 'story') {
                    setAdminEpilogueSequence('credits');
                    AudioManager.getInstance().stopBgm();
                    setCreditsUrl('/data/credits.json');
                    setIsAdminPreview(true);
                    setTimeout(() => setShowStoryModal(true), 50);
                    return;
                  }

                  if (isCredits) {
                    if (adminEpilogueSequence === 'credits') {
                      setAdminEpilogueSequence('idle');
                    }
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
                      if (isPrologue) {
                        moveToNextStep(undefined, -1);
                      } else if (completedStoryState?.kind === 'story' && completedStoryState.flowIndex !== undefined) {
                        const completedStageCycle = completedStoryState.stageCycle;
                        const completedFlowIndex = completedStoryState.flowIndex;
                        const completedFlow = chapter2Flows.find(f => f.stageNo === completedStageCycle);
                        moveToNextStep(completedFlow, completedFlowIndex);
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
    handleDebugWin,
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
    onEpilogueComplete: handleEpilogueComplete
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

  const currentChapter2Flow = chapter2Flows.find(f => f.stageNo === stageCycle);
  const currentChapter2Step = currentChapter2Flow?.flow[chapter2FlowIndex];
  const chapter2TitleStageFromStep = currentChapter2Step?.type === 'story'
    ? Number(currentChapter2Step.id?.match(/^(\d+)-1$/)?.[1])
    : NaN;
  const storyTitleStage = stageCycle >= 13
    ? (Number.isFinite(chapter2TitleStageFromStep) ? chapter2TitleStageFromStep : stageCycle - 12)
    : stageCycle;
  const storyTitleName = stageCycle >= 13
    ? STAGE_DATA.find(s => s.chapter === 2 && s.stage === storyTitleStage && s.battle === 1)?.name || ""
    : STAGE_DATA.find(s => s.no === stageCycle)?.name || "";
  const gameContent = isChapter2 ? <GameChapter2 {...gameProps} /> : <GameChapter1 {...gameProps} />;
  const shouldRenderStoryCanvas = showStoryModal && (isChapter2 || !!storyUrl || !!creditsUrl || (isAdmin && showAdmin === false));
  
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100dvh' }}>
      {storyBookOverlay}

      {!showChapter2Title && !shouldRenderStoryCanvas && !showChapterTitle && !showPrologueTitle && adminEpilogueSequence === 'idle' && !isStoryTransitioning && gameContent}

      {adminEpilogueSequence === 'title' && (
        <StoryTitle
          chapter={2}
          stage={12}
          stageLabelOverride="エピローグ"
          metaOverride="第2章"
          title="エピローグ"
          onComplete={async () => {
            const data = await loadV2Story('epilogue');
            setAdminEpilogueSequence('story');
            if (data) {
              setStoryContent(null);
              setStoryContentV2(data);
              setStoryUrl(null);
              setCreditsUrl(null);
              setShowStoryModal(true);
            } else {
              setAdminEpilogueSequence('idle');
              setIsAdminPreview(false);
              setIsTitle(true);
            }
          }}
        />
      )}

      {showPrologueTitle && (
        <StoryTitle
          chapter={2}
          stage={0}
          stageLabelOverride="プロローグ"
          metaOverride="第2章"
          title="プロローグ"
          onComplete={() => {
            setShowPrologueTitle(false);
            startPrologue(stageCycle >= 13 ? stageCycle : 13, chapter2FlowIndex);
          }}
        />
      )}

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
                autoEndOnScriptEnd={adminEpilogueSequence === 'story'}
                onEnd={() => {
                  const isPrologue = !!storyUrl;
                  const isCredits = !!creditsUrl;
                  let completedStoryState: StoryCanvasState | null = null;
                  try {
                    completedStoryState = JSON.parse(localStorage.getItem(STORY_CANVAS_STATE_KEY) || 'null');
                  } catch {
                    completedStoryState = null;
                  }
                  clearStoryCanvasState();
                  setShowStoryModal(false);
                  setStoryUrl(null);
                  setCreditsUrl(null);
                  setStoryContentV2(null);
                  setGameStarted(false);

                  if (adminEpilogueSequence === 'story') {
                    setAdminEpilogueSequence('credits');
                    AudioManager.getInstance().stopBgm();
                    setCreditsUrl('/data/credits.json');
                    setIsAdminPreview(true);
                    setTimeout(() => setShowStoryModal(true), 50);
                    return;
                  }

                  if (isCredits) {
                    if (adminEpilogueSequence === 'credits') {
                      setAdminEpilogueSequence('idle');
                    }
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
                      if (isPrologue) {
                        moveToNextStep(undefined, -1);
                      } else if (completedStoryState?.kind === 'story' && completedStoryState.flowIndex !== undefined) {
                        const completedStageCycle = completedStoryState.stageCycle;
                        const completedFlowIndex = completedStoryState.flowIndex;
                        const completedFlow = chapter2Flows.find(f => f.stageNo === completedStageCycle);
                        moveToNextStep(completedFlow, completedFlowIndex);
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
              src={getStorageUrl('/images/title/タイトルロゴ2.webp')} 
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
