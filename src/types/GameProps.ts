import { User } from "firebase/auth";
import { UserProfile } from "../Lounge";
import { StageProcessor } from "../stageData";
import { SkillDetail } from "../skillsData";
import { StageMode } from "../components/AnimatedRichLog";
import { IconMode } from "../components/SkillCard";
import { Chapter2StageFlow } from "./chapter2";

export interface BattleResult {
  playerSkills: SkillDetail[];
  computerSkills: SkillDetail[];
  winner: number;
  resultText: string;
  gameLog: string;
  battleInstance?: any;
}

export interface GameProps {
  user: User | null;
  myProfile: UserProfile | null;
  stageCycle: number;
  stageMode: StageMode;
  setStageMode: (mode: StageMode) => void;
  gameStarted: boolean;
  setGameStarted: (started: boolean) => void;
  battleResults: BattleResult[];
  setBattleResults: (results: BattleResult[]) => void;
  showLogForBattleIndex: number;
  setShowLogForBattleIndex: (index: number) => void;
  logComplete: boolean;
  setLogComplete: (complete: boolean) => void;
  useRichLog: boolean;
  setUseRichLog: (use: boolean) => void;
  stageProcessor: StageProcessor;
  stageContext: any; // StageContext type
  isMobile: boolean;
  isLargeScreen: boolean;
  isLoungeMode: boolean; // Added
  showEpilogue: boolean; // Added
  // State setters and handlers
  handleResetGame: () => void;
  handleStartGame: () => void;
  handleBattleLogComplete: () => void;
  triggerVictoryConfetti: () => void;
  getStorageUrl: (path: string) => string;
  
  // Chapter 1 specific or shared
  selectedPlayerSkills: string[];
  setSelectedPlayerSkills: (skills: string[]) => void;
  availablePlayerCards: SkillDetail[];
  ownedSkillAbbrs: string[];
  setOwnedSkillAbbrs: React.Dispatch<React.SetStateAction<string[]>>; // Added setter
  
  // Chapter 2 specific
  storyContent: string | null;
  storyContentV2: any[] | null;
  setStoryContentV2: (content: any[] | null) => void;
  setShowStoryModal: (show: boolean) => void;
  showStoryModal: boolean;
  chapter2SubStage: number;
  chapter2FlowIndex: number;
  chapter2Flows: Chapter2StageFlow[];
  moveToNextStep: () => Promise<void>;
  
  // Boss/Reward related
  canGoToBoss: boolean;
  setCanGoToBoss: (can: boolean) => void;
  showBossClearPanel: boolean;
  setShowBossClearPanel: (show: boolean) => void;
  rewardSelectionMode: boolean;
  setRewardSelectionMode: (mode: boolean) => void;
  selectedRewards: string[];
  setSelectedRewards: (rewards: string[]) => void;
  handleRewardSelection: (abbr: string) => void;
  confirmRewards: () => void;
  clearBossAndNextCycle: () => void;
  goToBossStage: () => void;
  
  // UI related
  iconMode: IconMode;
  isAdmin: boolean; // Added
  showAdmin: boolean; // Added
  panelRef: React.RefObject<HTMLDivElement | null>;
  mainGameAreaRef: React.RefObject<HTMLDivElement | null>;
  connections: { fromId: string; toId: string }[];
  dimmedIndices: number[];
  lineCoords: { x1: number; y1: number; x2: number; y2: number }[];
  
  // Others
  kenjuBoss: any;
  currentKenjuBattle: any;
  setKenjuBoss: (boss: any) => void;
  setIsTitle: (isTitle: boolean) => void;
  setShowRule: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  bgmEnabled: boolean;
  setBgmEnabled: (enabled: boolean) => void;
  bgmVolume: number;
  setBgmVolume: (volume: number) => void;
  showSettings: boolean;
  
  // Additional props needed for components
  getSkillCardsFromAbbrs: (abbrs: string[]) => SkillDetail[];
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
  handleSelectedSkillClick: (abbr: string) => void;
  handlePlayerSkillSelectionClick: (abbr: string) => void;
  
  winRateDisplay: number | null;
  stage11TrialActive: boolean;
  
  stageVictorySkills: { [key: string]: string[] };
  PLAYER_SKILL_COUNT: number;
  ALL_SKILLS: SkillDetail[];
}
