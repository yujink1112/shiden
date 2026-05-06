import React, { useState } from 'react';
import { User } from "firebase/auth";
import { SkillDetail } from './skillsData';
import { AdminAnalytics } from './AdminAnalytics';
import { getStorageUrl, uploadDeneiImage } from './firebase';
import type { Chapter2FlowStep, Chapter2StageFlow } from './types/chapter2';

export interface UserProfile {
  uid: string;
  displayName: string;
  supporterCreditsName?: string;
  photoURL: string;
  favoriteSkill: string;
  title: string;
  comment: string;
  oneThing?: string;
  isSpoiler?: boolean;
  lastActive: number;
  userName?: string;
  points?: number;
  lastKenjuDate?: string;
  winCount?: number;
  stageCycle?: number;
  medals?: string[];
  myKenju?: {
    name: string;
    image: string;
    skills: string[]; // スキル略称
    description?: string;
    title?: string; // 対戦時のタイトル
    background?: string; // 背景画像URL（またはインデックス）
    uploaderUid?: string; // 画像をアップロードしたユーザのUID
  };
  photoUploaderUid?: string; // プロフィール画像をアップロードしたユーザのUID
  victorySkills?: { [key: string]: string[] };
  deneiVictories?: {
    [targetId: string]: {
      skillAbbrs: string[];
      timestamp: number;
      targetName: string;
      targetMasterUid?: string;
    }
  };
  lifukuHighscore?: number;
  storyBookCouponUnlocked?: boolean;
  supporterCouponUnlocked?: boolean;
  chapter2?: {
    stageCycle?: number;
    flowIndex?: number;
    loopCount?: number;
    canGoToBoss?: boolean;
    ownedSkills?: string[];
    claimedRewardSteps?: string[];
    lastUpdated?: number;
    finalClearRecord?: {
      skillAbbrs?: string[];
      timestamp?: number;
      clearCount?: number;
    };
  };
}

const CHAPTER2_FINAL_STAGE_NO = 24;
const CHAPTER2_FINAL_BATTLE_FLOW_INDEX = 5;
const CHAPTER2_CLEAR_MEDAL_ID = 'great_pirate';

const getChapter2SubStageForDisplay = (chapter2Flows: Chapter2StageFlow[], stageNo: number, flowIndex: number): number => {
  const flow = chapter2Flows.find((entry) => entry.stageNo === stageNo);
  if (!flow) return 1;

  const currentStep = flow.flow[flowIndex];
  if (currentStep?.type === 'battle' && currentStep.subStage) return currentStep.subStage;

  const nextBattleStep = flow.flow.slice(Math.max(flowIndex, 0)).find((step: Chapter2FlowStep) => step.type === 'battle');
  if (nextBattleStep?.subStage) return nextBattleStep.subStage;

  const previousBattleStep = [...flow.flow.slice(0, flowIndex + 1)].reverse().find((step: Chapter2FlowStep) => step.type === 'battle');
  return previousBattleStep?.subStage || 1;
};

const getChapter2StageLabel = (chapter2Flows: Chapter2StageFlow[], stageNo?: number, flowIndex?: number): string => {
  if (typeof stageNo !== 'number') return '未到達';
  const chapterStage = Math.max(stageNo - 12, 1);
  const subStage = getChapter2SubStageForDisplay(chapter2Flows, stageNo, typeof flowIndex === 'number' ? flowIndex : 0);
  return `Stage${chapterStage}-${subStage}`;
};

const hasDisplayedChapter2StageClearProof = (profile: UserProfile): boolean => {
  if ((profile.medals || []).includes(CHAPTER2_CLEAR_MEDAL_ID)) return true;

  const finalClearRecord = profile.chapter2?.finalClearRecord;
  const finalClearSkills = finalClearRecord?.skillAbbrs;
  if (Array.isArray(finalClearSkills) && finalClearSkills.length > 0) return true;

  return (
    profile.chapter2?.stageCycle === CHAPTER2_FINAL_STAGE_NO &&
    profile.chapter2?.flowIndex === CHAPTER2_FINAL_BATTLE_FLOW_INDEX &&
    Boolean(profile.chapter2?.canGoToBoss)
  );
};

const getChapter2LoopCount = (profile: UserProfile): number => {
  const loopCount = profile.chapter2?.loopCount;
  if (typeof loopCount === 'number' && loopCount > 0) return loopCount;

  const stageCycle = profile.chapter2?.stageCycle;
  const flowIndex = profile.chapter2?.flowIndex;
  if (
    stageCycle === CHAPTER2_FINAL_STAGE_NO &&
    flowIndex === CHAPTER2_FINAL_BATTLE_FLOW_INDEX &&
    profile.chapter2?.canGoToBoss
  ) {
    return 1;
  }

  return 0;
};

const getChapter2ProgressScore = (profile: UserProfile): number => {
  if (!profile.chapter2 || typeof profile.chapter2.stageCycle !== 'number') return -1;
  const loopScore = getChapter2LoopCount(profile) * 1000;
  return loopScore + profile.chapter2.stageCycle * 10 + (profile.chapter2.flowIndex || 0);
};

const getLatestChapter1ClearedStage = (profile: UserProfile): number => {
  const victorySkills = profile.victorySkills || {};
  const clearedStages = Object.keys(victorySkills)
    .map((key) => {
      const match = key.match(/^BOSS_(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    // 古いデータで第2章が BOSS_13 以降として保存されていても、第1章表示には混ぜない
    .filter((stage) => Number.isFinite(stage) && stage >= 1 && stage <= 12);

  if (clearedStages.length === 0) return 0;
  return Math.max(...clearedStages);
};

const getChapter1ProgressScore = (profile: UserProfile): number => {
  return getLatestChapter1ClearedStage(profile);
};

const getChapter1StageLabel = (profile: UserProfile): string => {
  const clearedStage = getLatestChapter1ClearedStage(profile);
  return clearedStage > 0 ? `Stage${clearedStage}` : '-';
};

const ChapterRankingCards: React.FC<{
  profiles: UserProfile[];
  chapter2Flows: Chapter2StageFlow[];
  mode: 'chapter1' | 'chapter2';
  currentUserUid?: string;
  onViewProfile: (profile: UserProfile) => void;
}> = ({ profiles, chapter2Flows, mode, currentUserUid, onViewProfile }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const chapter2Profiles = profiles
    .filter((profile) => profile.uid !== process.env.REACT_APP_ADMIN_UID && profile.chapter2 && typeof profile.chapter2.stageCycle === 'number')
    .sort((a, b) => {
      const scoreDiff = getChapter2ProgressScore(b) - getChapter2ProgressScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });

  const chapter1Profiles = profiles.filter(
    (profile) => profile.uid !== process.env.REACT_APP_ADMIN_UID && profile.displayName && profile.displayName.trim() !== ''
  );

  const rankingProfiles = (mode === 'chapter2' ? chapter2Profiles : chapter1Profiles)
    .sort((a, b) => {
      const scoreDiff = mode === 'chapter2'
        ? getChapter2ProgressScore(b) - getChapter2ProgressScore(a)
        : getChapter1ProgressScore(b) - getChapter1ProgressScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.lastActive || 0) - (a.lastActive || 0);
    })
    .slice(0, 10);

  if (rankingProfiles.length === 0) {
    return (
      <div style={{ background: '#1a1a1a', padding: isMobile ? '16px' : '20px', borderRadius: '15px', border: '2px solid #4fc3f7', marginBottom: '20px' }}>
        <h2 style={{ color: '#4fc3f7', margin: '0 0 10px 0', fontSize: isMobile ? '1rem' : '1.15rem', textAlign: 'center' }}>
          {mode === 'chapter2' ? '第2章ランキング' : '第1章ランキング'}
        </h2>
        <p style={{ color: '#888', margin: 0, textAlign: 'center', fontSize: isMobile ? '0.8rem' : '0.95rem' }}>
          {mode === 'chapter2' ? '第2章を進めているプレイヤーがまだいません' : '第1章のランキング対象プレイヤーがまだいません'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#111822', padding: isMobile ? '14px' : '20px', borderRadius: '18px', border: '2px solid #4fc3f7', marginBottom: '20px', boxShadow: '0 0 20px rgba(79, 195, 247, 0.18)' }}>
      <style>{`
        @keyframes chapter2-clear-rainbow-glow {
          0% { color: #ff6b6b; text-shadow: 0 0 6px rgba(255, 107, 107, 0.55), 0 0 12px rgba(255, 107, 107, 0.35); }
          20% { color: #ffd166; text-shadow: 0 0 6px rgba(255, 209, 102, 0.55), 0 0 12px rgba(255, 209, 102, 0.35); }
          40% { color: #7ae582; text-shadow: 0 0 6px rgba(122, 229, 130, 0.55), 0 0 12px rgba(122, 229, 130, 0.35); }
          60% { color: #4cc9f0; text-shadow: 0 0 6px rgba(76, 201, 240, 0.55), 0 0 12px rgba(76, 201, 240, 0.35); }
          80% { color: #b388ff; text-shadow: 0 0 6px rgba(179, 136, 255, 0.55), 0 0 12px rgba(179, 136, 255, 0.35); }
          100% { color: #ff6b6b; text-shadow: 0 0 6px rgba(255, 107, 107, 0.55), 0 0 12px rgba(255, 107, 107, 0.35); }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: '#4fc3f7', margin: 0, fontSize: isMobile ? '1.05rem' : '1.2rem' }}>{mode === 'chapter2' ? '第2章ランキング' : '第1章ランキング'}</h2>
        <div style={{ color: '#9bb7c9', fontSize: isMobile ? '0.68rem' : '0.75rem' }}>
          現在進行中Stage の順で表示
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: isMobile ? '10px' : '12px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollSnapType: isMobile ? 'x proximity' : undefined
        }}
      >
        {rankingProfiles.map((profile, index) => {
          const isMe = profile.uid === currentUserUid;
          const hasChapter2ClearProof = mode === 'chapter2' && hasDisplayedChapter2StageClearProof(profile);
          const currentStageLabel = mode === 'chapter2'
            ? getChapter2StageLabel(chapter2Flows, profile.chapter2?.stageCycle, profile.chapter2?.flowIndex)
            : getChapter1StageLabel(profile);
          const shouldRainbowGlow =
            (hasChapter2ClearProof && currentStageLabel === 'Stage12-3') ||
            (mode === 'chapter1' && currentStageLabel === 'Stage12');
          return (
            <div
              key={profile.uid}
              onClick={() => onViewProfile(profile)}
              style={{
                minWidth: isMobile ? '132px' : '145px',
                flex: isMobile ? '0 0 132px' : '0 0 145px',
                background: isMe ? 'linear-gradient(180deg, rgba(79,195,247,0.2), rgba(17,24,34,0.95))' : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(17,24,34,0.95))',
                border: isMe ? '1px solid #4fc3f7' : '1px solid #35506a',
                borderRadius: '14px',
                padding: isMobile ? '12px 10px' : '14px 12px',
                boxSizing: 'border-box',
                scrollSnapAlign: isMobile ? 'start' : undefined,
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                boxShadow: isMe ? '0 0 14px rgba(79, 195, 247, 0.22)' : '0 0 10px rgba(0, 0, 0, 0.18)'
              }}
              onMouseEnter={(e) => {
                if (isMobile) return;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = isMe ? '0 0 18px rgba(79, 195, 247, 0.3)' : '0 0 16px rgba(79, 195, 247, 0.18)';
                e.currentTarget.style.borderColor = '#4fc3f7';
              }}
              onMouseLeave={(e) => {
                if (isMobile) return;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isMe ? '0 0 14px rgba(79, 195, 247, 0.22)' : '0 0 10px rgba(0, 0, 0, 0.18)';
                e.currentTarget.style.borderColor = isMe ? '#4fc3f7' : '#35506a';
              }}
            >
              <div style={{ color: index === 0 ? '#ffd700' : '#c7d7e5', fontWeight: 'bold', fontSize: isMobile ? '0.78rem' : '0.85rem', marginBottom: '8px' }}>
                {index + 1}位
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', marginBottom: '10px' }}>
                <img
                  src={((profile.photoURL || '').startsWith('/') ? getStorageUrl(profile.photoURL) : (profile.photoURL || 'https://via.placeholder.com/48'))}
                  alt={profile.displayName}
                  style={{ width: isMobile ? '36px' : '42px', height: isMobile ? '36px' : '42px', borderRadius: '12px', objectFit: 'cover', background: '#222', border: isMe ? '2px solid #4fc3f7' : '1px solid #4f6d86', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.78rem' : '0.9rem', lineHeight: 1.25, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {profile.displayName}
                  </div>
                  {isMe && <div style={{ color: '#4fc3f7', fontSize: '0.65rem', fontWeight: 'bold' }}>YOU</div>}
                </div>
              </div>
              <div style={{ color: '#cfe8f7', fontSize: isMobile ? '0.72rem' : '0.78rem', lineHeight: 1.45 }}>
                <div>
                  現在: <span style={{ color: '#fff', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={shouldRainbowGlow ? {
                      animation: 'chapter2-clear-rainbow-glow 2.4s linear infinite'
                    } : undefined}>
                      {currentStageLabel}
                    </span>
                    <span
                      title={hasChapter2ClearProof ? 'クリア証明' : undefined}
                      aria-label={hasChapter2ClearProof ? 'クリア証明' : undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isMobile ? '14px' : '16px',
                        height: isMobile ? '14px' : '16px',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={getStorageUrl('/images/icon/2011-12-23_3-096.gif')}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: hasChapter2ClearProof ? 1 : 0
                        }}
                      />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface UserListTableProps {
  profiles: UserProfile[];
  chapter2Flows: Chapter2StageFlow[];
  lastActiveProfiles: {[uid: string]: number};
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
  allSkills: SkillDetail[];
  onViewProfile: (profile: UserProfile) => void;
  currentUserUid?: string;
  allProfilesCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const UserListTable: React.FC<UserListTableProps> = ({
  profiles,
  chapter2Flows,
  lastActiveProfiles,
  getSkillByAbbr,
  allSkills,
  onViewProfile,
  currentUserUid,
  allProfilesCount,
  currentPage,
  onPageChange
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const [spoilerVisibility, setSpoilerVisibility] = useState<{[uid: string]: boolean}>({});

  const toggleSpoiler = (uid: string) => {
    setSpoilerVisibility(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  return (
    <>
      <h2 style={{ color: '#ffd700', marginTop: '30px' }}>参加者</h2>
      <div style={{ width: '100%', overflowX: 'auto', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #444', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '680px' : '760px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #444', color: '#ffd700', fontSize: isMobile ? '0.68rem' : '0.75rem' }}>
              <th style={{ padding: isMobile ? '10px 4px' : '12px 5px', textAlign: 'left', width: isMobile ? '28%' : '24%' }}>名前</th>
              <th style={{ padding: '12px 2px', textAlign: 'center', width: '45px' }}>電影</th>
              <th style={{ padding: '12px 2px', textAlign: 'center', width: '45px' }}>💖</th>
              <th style={{ padding: isMobile ? '10px 4px' : '12px 5px', textAlign: 'center', width: isMobile ? '80px' : '96px', whiteSpace: 'nowrap' }}>第1章</th>
              <th style={{ padding: isMobile ? '10px 4px' : '12px 5px', textAlign: 'center', width: isMobile ? '96px' : '110px', whiteSpace: 'nowrap' }}>第2章</th>
              <th style={{ padding: isMobile ? '10px 4px' : '12px 5px', textAlign: 'left' }}>ひとこと</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const isActive = !!lastActiveProfiles[p.uid];
              const favSkill = getSkillByAbbr(p.favoriteSkill);
              const isMe = p.uid === currentUserUid;
              return (
                <tr
                  key={p.uid}
                  onClick={() => onViewProfile(p)}
                  style={{
                    borderBottom: '1px solid #333',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: isMe ? 'rgba(79, 195, 247, 0.15)' : 'transparent',
                    borderLeft: isMe ? '4px solid #4fc3f7' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isMe ? 'rgba(79, 195, 247, 0.25)' : '#222'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isMe ? 'rgba(79, 195, 247, 0.15)' : 'transparent'}
                >
                  <td style={{ padding: isMobile ? '8px 4px' : '8px 5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
                      <img src={((p.photoURL || '').startsWith('/') ? getStorageUrl(p.photoURL) : (p.photoURL || 'https://via.placeholder.com/40'))} alt={p.displayName} style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '10%', background: '#222', objectFit: 'cover', border: isMe ? '2px solid #4fc3f7' : '1px solid #444', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: isMe ? '#4fc3f7' : '#FFFFFF', fontWeight: 'bold', fontSize: isMobile ? '0.68rem' : (p.displayName.length > 9 ? '0.65rem' : (p.displayName.length > 7 ? '0.75rem' : '0.85rem')), display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ whiteSpace: isMobile ? 'normal' : 'nowrap', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2 }}>{p.displayName}</span>
                          {isMe && <span style={{ fontSize: '0.65rem', background: '#4fc3f7', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', flexShrink: 0 }}>YOU</span>}
                        </div>
                        {p.title && <div style={{ fontSize: isMobile ? '0.55rem' : '0.6rem', color: '#ffd700', whiteSpace: isMobile ? 'normal' : 'nowrap', overflowWrap: 'anywhere' }}>{p.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: isMobile ? '8px 1px' : '8px 2px', textAlign: 'center' }}>
                    {p.myKenju?.name ? (
                      <span title={p.myKenju.name} style={{ cursor: 'help' }}>✅</span>
                    ) : (
                      <span style={{ color: '#444' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: isMobile ? '8px 1px' : '8px 2px', textAlign: 'center' }}>
                    {favSkill && (
                      <img
                        src={getStorageUrl(favSkill.icon)}
                        alt={favSkill.name}
                        title={favSkill.name}
                        style={{ width: isMobile ? '22px' : '24px', height: isMobile ? '22px' : '24px', borderRadius: '4px', border: '1px solid #ffd700' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: isMobile ? '8px 4px' : '8px 5px', textAlign: 'center', fontSize: isMobile ? '0.68rem' : '0.78rem', color: '#ccc', whiteSpace: 'nowrap' }}>
                    {getChapter1StageLabel(p)}
                  </td>
                  <td style={{ padding: isMobile ? '8px 4px' : '8px 5px', textAlign: 'center', fontSize: isMobile ? '0.68rem' : '0.78rem', color: '#ccc', whiteSpace: 'nowrap' }}>
                    {p.chapter2?.stageCycle
                      ? getChapter2StageLabel(chapter2Flows, p.chapter2.stageCycle, p.chapter2.flowIndex)
                      : '-'}
                  </td>
                  <td style={{ padding: isMobile ? '8px 4px' : '8px 5px', fontSize: isMobile ? '0.72rem' : '0.8rem', color: '#ccc' }}>
                    {p.isSpoiler && !spoilerVisibility[p.uid] ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSpoiler(p.uid); }}
                        style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '0.58rem' : '0.65rem', padding: isMobile ? '4px 6px' : '4px 8px', lineHeight: '1.2', width: '100%' }}
                      >
                        ネタバレ注意<br/>(クリックで表示)
                      </button>
                    ) : (
                      <div style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        wordBreak: 'break-all',
                        lineHeight: '1.2'
                      }}>
                        {p.comment}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* ページング UI */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: isMobile ? '6px' : '10px', flexWrap: 'wrap' }}>
          {Array.from({ length: Math.ceil(allProfilesCount / 20) }, (_, i) => (
              <button
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  style={{
                      padding: isMobile ? '5px 8px' : '5px 10px',
                      background: currentPage === i + 1 ? '#4fc3f7' : '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.75rem' : '0.85rem'
                  }}
              >
                  {i + 1}
              </button>
          ))}
      </div>
    </>
  );
};

const PrivacyPolicyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 30000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box', color: '#eee'
    }}>
      <div style={{
        width: '100%', maxWidth: '600px', maxHeight: '80vh',
        backgroundColor: '#1a1a1a', border: '2px solid #4fc3f7',
        borderRadius: '15px', padding: '30px', overflowY: 'auto',
        position: 'relative', boxShadow: '0 0 30px rgba(79, 195, 247, 0.3)'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
        <h2 style={{ color: '#4fc3f7', marginTop: 0 }}>プライバシーポリシー</h2>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ccc' }}>
          <p>当サービス（以下「本サービス」）は、Google Firebaseを利用した認証システムを導入しています。</p>
          
          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>1. 取得する情報</h3>
          <p>本サービスは、以下の情報を取得します。</p>
          <ul>
            <li>メールアドレス（メール認証時）</li>
            <li>Googleアカウントの表示名、プロフィール画像、メールアドレス（Googleログイン時）</li>
          </ul>

          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>2. 利用目的</h3>
          <p>取得した情報は、以下の目的で利用します。</p>
          <ul>
            <li>ユーザーの識別および認証</li>
            <li>ラウンジ内でのプレイヤー情報の表示</li>
            <li>サービスの提供および改善</li>
          </ul>

          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>3. データの保存と管理</h3>
          <p>ユーザーデータは、Google Cloud PlatformのFirebaseサービス上に保存されます。適切なセキュリティ対策を講じ、不正アクセスや漏洩の防止に努めます。</p>

          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>4. 第三者提供</h3>
          <p>本サービスは、法令に基づき開示が必要な場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。</p>

          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>5. データの削除</h3>
          <p>ユーザーは、本サービス内の「アカウント削除」機能を利用することで、いつでも自身のデータを削除することができます。</p>

          <h3 style={{ color: '#ffd700', fontSize: '1rem' }}>6. お問い合わせ</h3>
          <p>本サービスに関するお問い合わせは、<a href='https://x.com/ShidenGames' target='_blank'>Xアカウント</a>までご連絡ください。</p>
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#4fc3f7', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>閉じる</button>
      </div>
    </div>
  );
};

const GuidelineModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [content, setContent] = React.useState<string>("読み込み中...");

  React.useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/story/guideline.txt`)
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent("ガイドラインの読み込みに失敗しました。"));
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 50000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '600px', maxHeight: '80vh',
        backgroundColor: '#1a1a1a', border: '2px solid #4fc3f7',
        borderRadius: '15px', padding: '30px', overflowY: 'auto',
        position: 'relative', boxShadow: '0 0 30px rgba(79, 195, 247, 0.3)'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
        <h2 style={{ color: '#4fc3f7', marginTop: 0 }}>投稿ガイドライン</h2>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ccc', whiteSpace: 'pre-wrap' }}>
          {content}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#4fc3f7', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>閉じる</button>
      </div>
    </div>
  );
};

const CustomConfirmModal: React.FC<{
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}> = ({ show, title, message, onConfirm, onCancel, confirmText = "はい", cancelText = "いいえ", confirmColor = "#ff5252" }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 40000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        backgroundColor: '#1a1a1a', border: `2px solid ${confirmColor}`,
        borderRadius: '15px', padding: '30px', textAlign: 'center',
        boxShadow: `0 0 20px ${confirmColor}33`
      }}>
        <h2 style={{ color: confirmColor, marginTop: 0, fontSize: '1.2rem' }}>{title}</h2>
        <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>{message}</p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '10px', background: confirmColor, color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomAlertModal: React.FC<{
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonColor?: string;
}> = ({ show, title, message, onClose, buttonColor = "#2196f3" }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 45000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        backgroundColor: '#1a1a1a', border: `2px solid ${buttonColor}`,
        borderRadius: '15px', padding: '30px', textAlign: 'center',
        boxShadow: `0 0 20px ${buttonColor}33`
      }}>
        <h2 style={{ color: buttonColor, marginTop: 0, fontSize: '1.2rem' }}>{title}</h2>
        <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>{message}</p>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '10px', background: buttonColor, color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

interface LoungeProps {
  user: User | null;
  myProfile: UserProfile | null;
  profiles: UserProfile[];
  allProfiles: UserProfile[];
  chapter2Flows: Chapter2StageFlow[];
  lastActiveProfiles: {[uid: string]: number};
  kenjuBoss: {name: string, image: string, skills: SkillDetail[]} | null;
  currentKenjuBattle: {name: string, image: string, skills: SkillDetail[]} | null;
  kenjuClears: number;
  kenjuTrials: number;
  deneiClears: number;
  deneiTrials: number;
  isKenjuClearedEver: boolean;
  allDeneiStats?: { [uid: string]: { [kenjuName: string]: { clears: number, trials: number, likes: number, isLiked?: boolean } } };
  isDeneiStatsLoaded: boolean;
  onGoogleSignIn: () => void;
  onEmailSignUp: (email: string, pass: string) => void;
  onEmailSignIn: (email: string, pass: string) => void;
  onSignOut: () => void;
  onUpdateProfile: (displayName: string, favoriteSkill: string, comment: string, photoURL?: string, title?: string, oneThing?: string, isSpoiler?: boolean, myKenju?: UserProfile['myKenju'], photoUploaderUid?: string) => void;
  onUpdateSupporterCreditsName: (supporterCreditsName: string) => void;
  onSaveKenju: (myKenju: UserProfile['myKenju'], shouldResetStats?: boolean, onComplete?: (success: boolean, message: string) => void) => void;
  onDeleteAccount: () => void;
  onAdminResetCouponState: (profile: UserProfile) => void;
  onAdminResetStageProgress: (profile: UserProfile) => void;
  onAdminResetAllProgressData: (profile: UserProfile) => void;
  onAdminDeleteUserAccount: (profile: UserProfile) => void;
  onKenjuBattle: (boss?: { name: string; image: string; skills: SkillDetail[]; background?: string; title?: string; description?: string }, mode?: 'KENJU' | 'DENEI' | 'MID' | 'BOSS') => void;
  onLikeDenei: (masterUid: string, deneiName: string) => void;
  onBack: () => void;
  onViewProfile: (profile: UserProfile) => void;
  stageMode: 'LOUNGE' | 'MYPAGE' | 'PROFILE' | 'RANKING' | 'DELETE_ACCOUNT' | 'VERIFY_EMAIL' | 'ADMIN_ANALYTICS';
  setStageMode: (mode: any) => void;
  viewingProfile: UserProfile | null;
  allSkills: SkillDetail[];
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
  allProfilesCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isAdmin: boolean;
  kenjuBosses?: { name: string; image: string; skills: SkillDetail[] }[];
SkillCard: React.FC<any>;
  showUpdateNotify: boolean;
  changelogData: any[];
  setShowUpdateNotify: (show: boolean) => void;
  handleForceUpdate: () => void;
  loadingImageUrl?: string;
}

export const Lounge: React.FC<LoungeProps> = ({
  user,
  myProfile,
  profiles,
  allProfiles,
  chapter2Flows,
  lastActiveProfiles,
  kenjuBoss,
  currentKenjuBattle,
  kenjuClears,
  kenjuTrials,
  deneiClears,
  deneiTrials,
  isKenjuClearedEver,
  allDeneiStats,
  isDeneiStatsLoaded,
  kenjuBosses,
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
  onSignOut,
  onUpdateProfile,
  onUpdateSupporterCreditsName,
  onSaveKenju,
  onDeleteAccount,
  onAdminResetCouponState,
  onAdminResetStageProgress,
  onAdminResetAllProgressData,
  onAdminDeleteUserAccount,
  onKenjuBattle,
  onLikeDenei,
  onBack,
  onViewProfile,
  stageMode,
  setStageMode,
  viewingProfile,
  allSkills,
  getSkillByAbbr,
  allProfilesCount,
  currentPage,
onPageChange,
  isAdmin,
  SkillCard,
  showUpdateNotify,
  changelogData,
  setShowUpdateNotify,
  handleForceUpdate,
  loadingImageUrl
}) => {
  const today = new Date().toLocaleDateString();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const loungeBackgroundUrl = `${process.env.PUBLIC_URL}/images/title/title-hero-lounge.webp`;
  const loungeBackgroundImage = `radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.46) 0%, rgba(255, 255, 255, 0) 16%), radial-gradient(circle at 82% 18%, rgba(120, 210, 255, 0.18) 0%, rgba(120, 210, 255, 0) 22%), linear-gradient(180deg, rgba(4, 18, 38, 0.28), rgba(4, 18, 38, 0.5)), url(${loungeBackgroundUrl})`;

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = React.useState(false);
  const [showGuideline, setShowGuideline] = React.useState(false);
  const [isBattleLoading, setIsBattleLoading] = React.useState(false);
  const isInitializing = React.useRef(false);

  // カスタム確認モーダル用のステート
  const [confirmModal, setConfirmModal] = React.useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmColor?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // カスタムアラートモーダル用のステート
  const [alertModal, setAlertModal] = React.useState<{
    show: boolean;
    title: string;
    message: string;
    buttonColor?: string;
  }>({
    show: false,
    title: '',
    message: '',
  });

  // 電影編集用の一時ステート
  const [tempKenju, setTempKenju] = React.useState<UserProfile['myKenju'] | null>(null);

  // ミュート中のユーザUIDリスト
  const [mutedUids, setMutedUids] = React.useState<string[]>([]);

  React.useEffect(() => {
    const stored = localStorage.getItem('mutedDeneiUids');
    if (stored) {
      try {
        setMutedUids(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse mutedDeneiUids', e);
      }
    }
  }, []);

  const toggleMute = (uid: string) => {
    const newMuted = mutedUids.includes(uid)
      ? mutedUids.filter(id => id !== uid)
      : [...mutedUids, uid];
    setMutedUids(newMuted);
    localStorage.setItem('mutedDeneiUids', JSON.stringify(newMuted));
  };

  const isMypageInitialized = React.useRef(false);

  // マイページ表示時に現在の電影情報をセット（初回のみ、またはMYPAGEに切り替わった時のみ）
  React.useEffect(() => {
    if (stageMode === 'MYPAGE') {
      if (!isMypageInitialized.current && myProfile?.myKenju) {
        setTempKenju({
          name: myProfile.myKenju.name || '',
          description: myProfile.myKenju.description || '',
          title: myProfile.myKenju.title || '',
          image: myProfile.myKenju.image || '',
          skills: myProfile.myKenju.skills || [],
          background: myProfile.myKenju.background || '',
          uploaderUid: myProfile.myKenju.uploaderUid
        });
        isMypageInitialized.current = true;
      }
    } else {
      // MYPAGEを抜ける時にクリアする
      setTempKenju(null);
      isMypageInitialized.current = false;
    }
  }, [stageMode, myProfile]); // myProfileがロードされたタイミングでも発火するように変更

  const presetBackgrounds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => `/images/background/${n}.jpg`);

  const medals = [
    { id: 'master', name: 'クリアしたよ！', description: 'Stage12をクリア' },
    { id: 'traveler', name: '旅人', description: '無条件で獲得' },
    { id: 'monkey', name: 'サルの一味', description: '無条件で獲得' },
    { id: CHAPTER2_CLEAR_MEDAL_ID, name: '大海賊の証明', description: '第2章をすべてクリア' },
    { id: 'kriemhild', name: '王家の冠月の友', description: 'クリームヒルトを撃破' },
    { id: 'wadachi', name: '紅蓮を越えし者', description: 'ワダチを撃破' },
    { id: 'shiran', name: '氷彗の解凍者', description: 'シーランを撃破' },
    { id: 'atiyah', name: '猫の遊び相手', description: 'アティヤーを撃破' },
    { id: 'vomakt', name: '白金の目撃者', description: 'ヴォマクトを撃破' },
    { id: 'steve', name: '冥土の同伴者', description: 'スティーブを撃破' },
    { id: 'fiat_lux', name: '光あれ', description: '果てに視えるものを撃破' }
  ];

  const [refreshSeed, setRefreshSeed] = React.useState(0);
  const randomKenjuPlayers = React.useMemo(() => {
    const withKenju = allProfiles.filter(p =>
      p.myKenju && p.myKenju.name && p.myKenju.image && !mutedUids.includes(p.uid)
    );
    return [...withKenju].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [allProfiles.length, mutedUids, refreshSeed]); // allProfiles全体ではなくlengthを監視して、いいね更新で走らないようにする

  if (stageMode === 'LOUNGE') {
    if (user && !isDeneiStatsLoaded) {
      return (
        <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px', backgroundImage: loungeBackgroundImage, backgroundSize: isMobile ? 'cover' : 'auto 108%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
          <div className="loading-spinner" style={{
            width: '50px', height: '50px', border: '5px solid rgba(79, 195, 247, 0.3)',
            borderTop: '5px solid #4fc3f7', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: '#4fc3f7', fontWeight: 'bold' }}>データを読み込み中...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: loungeBackgroundImage, backgroundSize: isMobile ? 'cover' : 'auto 108%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
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
            {/* <div style={{ backgroundColor: '#ff5252', padding: '5px 15px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', maxWidth: '90%', lineHeight: '1.4' }}>
              【重要】複数の端末でゲームをする場合、最新の進捗状況を全ての端末で共有するように改善しました。よりクリアしたStageの多い端末で「今すぐ更新」ボタンを押すことを推奨します。
            </div> */}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: !user ? '400px' : '800px', marginBottom: '10px',  marginTop: showUpdateNotify ? '100px' : '0'  }}>
          <button onClick={onBack} style={{ padding: '8px 15px', background: 'rgba(8, 24, 48, 0.72)', color: '#fff', border: '1px solid rgba(137, 216, 255, 0.45)', borderRadius: '999px', cursor: 'pointer', fontSize: '0.8rem', backdropFilter: 'blur(10px)', boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)' }}>戻る</button>
          <h1 style={{ color: '#4fc3f7', margin: 0 }}>LOUNGE</h1>
          <div style={{ width: '60px' }}></div>
        </div>
        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '400px' }}>
            <div style={{ background: 'linear-gradient(180deg, rgba(8, 24, 48, 0.78), rgba(8, 18, 36, 0.68))', padding: '30px', borderRadius: '24px', border: '1px solid rgba(137, 216, 255, 0.55)', textAlign: 'center', width: '100%', backdropFilter: 'blur(14px)', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.22)' }}>
              <h2 style={{ color: '#fff' }}>{isSignUp ? "新規登録" : "サインイン"}</h2>
              <div style={{ marginBottom: '20px' }}>
                  <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }} />
                  <input type="password" placeholder="パスワード" value={pass} onChange={e => setPass(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }} />
                  {isSignUp ? (
                      <button className="TitleButton neon-blue" onClick={() => onEmailSignUp(email, pass)} style={{ width: '100%', marginBottom: '10px' }}>登録・確認メール送信</button>
                  ) : (
                      <button className="TitleButton neon-blue" onClick={() => onEmailSignIn(email, pass)} style={{ width: '100%', marginBottom: '10px' }}>サインイン</button>
                  )}
                  <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#4fc3f7', cursor: 'pointer', textDecoration: 'underline' }}>
                      {isSignUp ? "既にアカウントをお持ちの方" : "新しくアカウントを作成する"}
                  </button>
              </div>
              <div style={{ borderTop: '1px solid #444', paddingTop: '20px' }}>
                  <button className="TitleButton neon-gold" onClick={onGoogleSignIn} style={{ width: '100%' }}>Googleでサインイン</button>
              </div>
            </div>
            
            <div style={{ background: 'linear-gradient(180deg, rgba(52, 14, 18, 0.82), rgba(36, 12, 16, 0.68))', padding: '15px', borderRadius: '18px', border: '1px solid rgba(255, 82, 82, 0.55)', width: '100%', textAlign: 'center', backdropFilter: 'blur(12px)', boxShadow: '0 18px 40px rgba(0, 0, 0, 0.18)' }}>
              <p style={{ color: '#ff5252', fontSize:
                 '0.8rem', margin: '0px 0px 10px 0px' }}>ログインできない・データをリセットしたい場合</p>
              <button
                onClick={() => setStageMode('DELETE_ACCOUNT')}
                style={{ padding: '8px 15px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                アカウント削除・データ初期化
              </button>
            </div>
            <button
              onClick={() => setShowPrivacyPolicy(true)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem' }}
            >
              プライバシーポリシー
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '5px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '5px' }}>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                <button onClick={() => setStageMode('MYPAGE')} style={{ padding: '8px 12px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>マイページ</button>
                {myProfile && (
                  <button onClick={() => onViewProfile(myProfile)} style={{ padding: '8px 12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>プロフィール</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                <button onClick={onSignOut} style={{ padding: '8px 12px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>サインアウト</button>
                {isAdmin && (
                  <button onClick={() => setStageMode('ADMIN_ANALYTICS')} style={{ padding: '8px 12px', background: '#8e24aa', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Ad</button>
                )}
              </div>
            </div>

            <div style={{ display: 'none', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #555', marginBottom: '30px', textAlign: 'center' }}>
                <h2 style={{ color: '#888', margin: '0 0 10px 0', fontSize: '1.2rem' }}>剣獣戦</h2>
                <p style={{ color: '#ccc', margin: 0 }}>近日中にコンテンツ追加予定です。お楽しみに！</p>
            </div>

            <ChapterRankingCards
              profiles={allProfiles}
              chapter2Flows={chapter2Flows}
              mode="chapter2"
              currentUserUid={user?.uid}
              onViewProfile={onViewProfile}
            />

            <ChapterRankingCards
              profiles={allProfiles}
              chapter2Flows={chapter2Flows}
              mode="chapter1"
              currentUserUid={user?.uid}
              onViewProfile={onViewProfile}
            />

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{  background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ff5252', textAlign: 'center', boxShadow: '0 0 15px rgba(255, 82, 82, 0.2)', display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ color: '#ff5252', margin: '0 0 20px 0', fontSize: '1.2rem' }}>本日の剣獣</h2>
                  {kenjuBoss && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
                      <div style={{ position: 'relative', width: '100%', maxWidth: '200px', height: '150px', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ff5252' }}>
                        <img src={getStorageUrl(kenjuBoss.image)} alt={kenjuBoss.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>
                        {kenjuBoss.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#ff5252', marginBottom: '5px' }}>クリア人数: {kenjuClears}人</div>
                      <div style={{ fontSize: '0.8rem', color: isKenjuClearedEver ? '#4caf50' : '#888', fontWeight: 'bold', marginBottom: '32px' }}>
                        {isKenjuClearedEver ? 'クリア済み' : '未クリア'}
                      </div>
                      <button
                        className={"TitleButton " + (isKenjuClearedEver ? "neon-gold" : "neon-red")}
                        onClick={async () => {
                          try {
                            await onKenjuBattle();
                          } catch (error) {
                            console.error("Battle start error:", error);
                          }
                        }}
                        style={{ color: isKenjuClearedEver ? '#fff' : '#ffe600', padding: '10px 40px', fontSize: '1.1rem' }}
                      >
                        {isKenjuClearedEver ? "再戦する" : "挑む"}
                      </button>
                    </div>
                  )}
              </div>

              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ffd700', textAlign: 'center', boxShadow: '0 0 15px rgba(79, 195, 247, 0.2)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <h2 style={{ color: '#ffd700', margin: 0, fontSize: '1.2rem' }}>電影 Pick up!</h2>
                  <button
                    onClick={() => setRefreshSeed(s => s + 1)}
                    style={{
                      background: 'none',
                      border: '1px solid #ffd700',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffd700',
                      fontSize: '0.8rem',
                      padding: 0
                    }}
                    title="更新"
                  >
                    ↻
                  </button>
                </div>
                {!isDeneiStatsLoaded ? (
                  <p style={{ color: '#888', margin: '20px 0' }}>読み込み中...</p>
                ) : randomKenjuPlayers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, justifyContent: 'flex-start' }}>
                    {randomKenjuPlayers.map(p => (
                      <div key={p.uid} onClick={() => onViewProfile(p)} style={{ cursor: 'pointer', background: '#222', padding: '10px', borderRadius: '8px', border: '1px solid #444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={p.myKenju?.image} alt="" style={{ width: '50px', height: '50px', borderRadius: '5px', objectFit: 'contain', background: '#000' }} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: (p.myKenju?.name || '').length > 14 ? '0.75rem' : '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.myKenju?.name}</div>
                          <div style={{ color: '#aaa', fontSize: '0.7rem' }}>Master: {p.displayName}</div>
                          {p.myKenju?.name && allDeneiStats?.[p.uid]?.[p.myKenju.name] && (
                            <div style={{ color: '#ff5252', fontSize: '0.65rem', marginTop: '2px' }}>
                              クリア: {allDeneiStats[p.uid][p.myKenju.name].clears} / 挑戦: {allDeneiStats[p.uid][p.myKenju.name].trials}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onLikeDenei(p.uid, p.myKenju!.name); }}
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <span style={{ color: '#ff5252' }}>{allDeneiStats?.[p.uid]?.[p.myKenju.name]?.isLiked ? '❤️' : '🤍'}</span>
                                  <span style={{ color: '#ffd700' }}>{allDeneiStats?.[p.uid]?.[p.myKenju.name]?.likes || 0}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ color: '#ffd700' }}>〉</div>
                      </div>
                    ))}
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>プロフィールから対戦できます</p>
                  </div>
                ) : (
                  <p style={{ color: '#888', margin: '20px 0' }}>まだ電影を登録しているプレイヤーがいません</p>
                )}
              </div>
            </div>


            {/* {isAdmin && kenjuBosses && (
              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #8e24aa', marginBottom: '30px' }}>
                <h2 style={{ color: '#8e24aa', margin: '0 0 15px 0', fontSize: '1.2rem', textAlign: 'center' }}>管理者用：全剣獣リスト</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                  {kenjuBosses.map(boss => (
                    <div key={boss.name} style={{ background: '#222', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #444' }}>
                      <div style={{ height: '80px', marginBottom: '10px' }}>
                        <img src={boss.image} alt={boss.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '10px', height: '2.4em', overflow: 'hidden' }}>{boss.name}</div>
                      <button
                        onClick={() => onKenjuBattle(boss)}
                        style={{ padding: '5px 15px', background: '#8e24aa', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        デバッグ戦闘
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            <UserListTable
              profiles={profiles}
              chapter2Flows={chapter2Flows}
              lastActiveProfiles={lastActiveProfiles}
              getSkillByAbbr={getSkillByAbbr}
              allSkills={allSkills}
              onViewProfile={onViewProfile}
              allProfilesCount={allProfilesCount}
              currentPage={currentPage}
              onPageChange={onPageChange}
              currentUserUid={user?.uid}
            />
          </div>
        )}
        <button onClick={onBack} style={{ marginTop: '30px', marginBottom: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>戻る</button>
        {showPrivacyPolicy && <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />}
      </div>
    );
  }

  if (stageMode === 'MYPAGE') {
    if (!myProfile) {
      // ユーザーがログインしているがプロフィールがまだ読み込まれていない場合、
      // 画面が真っ白になるのを防ぐため、ローディング表示またはラウンジへの自動遷移を行う
      if (user) {
        return (
          <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
            <div>プロフィールを読み込み中...</div>
            <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>ラウンジへ戻る</button>
          </div>
        );
      }

      return (
        <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
          <div>データを取得できませんでした。ログイン状態を確認してください。</div>
          <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
        </div>
      );
    }

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>, isKenju: boolean = false) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 10KB limit (Kenjuの場合は破棄)
      if (!isKenju && file.size > 10 * 1024) {
        alert("ファイルサイズは10KB以下にしてください。");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (isKenju && (img.width > 600 || img.height > 600)) {
            alert(`画像のサイズが大きすぎます (${img.width}x${img.height})。電影画像は600x600ピクセル以下にしてください。`);
            return;
          }
          
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = isKenju ? 500 : 64;
          const MAX_HEIGHT = isKenju ? 500 : 64;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            if (isKenju) {
              // アップロードは保存ボタン押下時ではなく、選択した瞬間に行う（プレビュー表示のため）
              if (user) {
                setIsSaving(true);
                uploadDeneiImage(user.uid, dataUrl).then(url => {
                  setTempKenju(prev => ({
                    ...(prev || myProfile.myKenju || {
                      name: '',
                      skills: ['一', '刺', '崩', '待', '果'],
                      description: '',
                      title: 'BOSS SKILLS DISCLOSED',
                      background: '/images/background/11.jpg'
                    }),
                    image: url,
                    uploaderUid: user.uid
                  }));
                })
                .catch(err => {
                  console.error("Storage upload failed:", err);
                  alert("画像のアップロードに失敗しました。");
                })
                .finally(() => setIsSaving(false));
              }
            } else {
              // プロフィール画像（photoURL）の更新時に追跡用UIDをセット
              onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, dataUrl, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju, user?.uid);
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    const presetIcons = [
      "mon_201.gif", "mon_202.gif", "mon_203.gif", "mon_204.gif",
      "mon_211.gif", "mon_212.gif", "mon_215.gif", "mon_216.gif",
      "mon_217.gif", "mon_286.gif"
    ];

    const handlePresetIconSelect = (iconName: string) => {
      const iconPath = `/images/icon/${iconName}`;
      onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, iconPath, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju);
    };

    const handleKenjuSkillToggle = (abbr: string) => {
      const currentSkills = tempKenju?.skills || myProfile.myKenju?.skills || [];
      const newSkills = [...currentSkills];
      if (newSkills.length >= 8) {
        alert("剣獣のスキルは最大8つまでです。");
        return;
      }
      
      const skill = allSkills.find(s => s.abbr === abbr);
      if (skill?.kamiwaza === 1 && newSkills.some(sAbbr => allSkills.find(s => s.abbr === sAbbr)?.kamiwaza === 1)) {
        alert("「神業」スキルは1つしか編成できません。");
        return;
      }

      newSkills.push(abbr);
      setTempKenju({
        name: tempKenju?.name || myProfile.myKenju?.name || '',
        image: tempKenju?.image || myProfile.myKenju?.image || getStorageUrl('/images/monster/11.png'),
        description: tempKenju?.description || myProfile.myKenju?.description || '',
        title: tempKenju?.title || myProfile.myKenju?.title || 'BOSS SKILLS DISCLOSED',
        background: tempKenju?.background || myProfile.myKenju?.background || '/images/background/11.jpg',
        skills: newSkills
      });
    };

    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '500px', marginBottom: '10px' }}>
          <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '8px 15px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}>戻る</button>
          <h1 style={{ color: '#4fc3f7', margin: 0, fontSize: '1.5rem' }}>MY PAGE</h1>
          <div style={{ width: '60px' }}></div> {/* バランス調整用のダミー */}
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center', background: 'rgba(255, 82, 82, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #ff5252', maxWidth: '500px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: '#ff5252', fontSize: '0.85rem', margin: '0 0 10px 0', fontWeight: 'bold' }}>電影の投稿前に必ずガイドラインを一読ください</p>
            <button
              onClick={() => setShowGuideline(true)}
              style={{ padding: '8px 20px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              投稿ガイドラインを確認
            </button>
        </div>

        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #2196f3', width: '100%', maxWidth: '500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <img src={((myProfile.photoURL || '').startsWith('/') ? getStorageUrl(myProfile.photoURL) : (myProfile.photoURL || 'https://via.placeholder.com/80'))} alt={myProfile.displayName} style={{ width: '80px', height: '80px', borderRadius: '5%', objectFit: 'cover', display: 'block', marginBottom: '10px', border: '2px solid #2196f3', background: '#222' }} />
              <label style={{ background: '#2196f3', color: '#fff', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem' }}>
                画像アップ
                <input type="file" accept="image/*" onChange={handleIconChange} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#aaa' }}>名前(10文字以内)</label>
                <input
                type="text"
                maxLength={10}
                value={myProfile.displayName}
                onChange={(e) => onUpdateProfile(e.target.value, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju)}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
                />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#aaa' }}>プリセットアイコンから選ぶ</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {presetIcons.map(icon => (
                <img 
                  key={icon} 
                  src={getStorageUrl(`/images/icon/${icon}`)}
                  alt=""
                  onClick={() => handlePresetIconSelect(icon)}
                  style={{ width: '100%', cursor: 'pointer', border: (myProfile.photoURL || '').includes(icon) ? '2px solid #ffd700' : '1px solid #444', borderRadius: '4px', padding: '2px', background: '#222' }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>称号を選択</label>
            <select
              value={myProfile.title || ""}
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, e.target.value, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px' }}
            >
              <option value="旅人">旅人</option>
              <option value="サルの一味">サルの一味</option>
              {(myProfile.medals || []).map(mId => {
                const medal = medals.find(m => m.id === mId);
                return medal && mId !== 'monkey' ? <option key={mId} value={medal.name}>{medal.name}</option> : null;
              })}
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>好きなスキル</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: '#222', borderRadius: '5px', border: '1px solid #444' }}>
              {[...allSkills]
                .filter((skill) => skill.denei === 1)
                .sort((a, b) => {
                  if (a.kamiwaza === 1 && b.kamiwaza !== 1) return -1;
                  if (a.kamiwaza !== 1 && b.kamiwaza === 1) return 1;
                  return 0;
                })
                .map(s => (
                <div
                  key={s.abbr}
                  onClick={() => onUpdateProfile(myProfile.displayName, s.abbr, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju)}
                  style={{
                    cursor: 'pointer',
                    border: myProfile.favoriteSkill === s.abbr ? '2px solid #ffd700' : (s.kamiwaza === 1 ? '2px solid #de63fd' : '1px solid #444'),
                    borderRadius: '4px',
                    padding: '2px',
                    background: myProfile.favoriteSkill === s.abbr ? '#333' : (s.kamiwaza === 1 ? '#2a1a3a' : '#1a1a1a'),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: s.kamiwaza === 1 ? '0 0 5px #de63fd' : 'none'
                  }}
                  title={s.name}
                >
                  <img src={getStorageUrl(s.icon)} alt={s.name} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
            {/* 選択中のスキル名を表示 */}
            <div style={{ marginTop: '5px', textAlign: 'center', color: '#ffd700', fontSize: '0.9rem' }}>
                選択中: {getSkillByAbbr(myProfile.favoriteSkill)?.name}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>無人島に一つ持っていけるとしたら？ (10文字以内)</label>
            <input
              type="text"
              maxLength={10}
              value={myProfile.oneThing || ''}
              onChange={(e) => {
                onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, e.target.value, myProfile.isSpoiler, myProfile.myKenju);
              }}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>一言 (15文字以内)</label>
            <p style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '5px' }}>クリア構成記入OK。「ネタバレ注意」にチェックを入れてください。</p>
            <input
              type="text"
              maxLength={15}
              value={myProfile.comment}
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, e.target.value, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', background: '#2c1010', padding: '8px', borderRadius: '5px', border: '1px solid #ff5252' }}>
              <input
                type="checkbox"
                id="spoiler-checkbox"
                checked={myProfile.isSpoiler || false}
                onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, e.target.checked, myProfile.myKenju)}
                style={{ marginRight: '10px', width: '22px', height: '22px', cursor: 'pointer', accentColor: '#ff5252' }}
              />
              <label htmlFor="spoiler-checkbox" style={{ color: '#ff5252', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}>ネタバレ注意 (クリア構成などを書く場合はチェック)</label>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>※入力すると自動で保存されます</p>

          <div style={{ borderTop: '2px solid #ff5252', marginTop: '40px', paddingTop: '30px' }}>
            <h2 style={{ color: '#ff5252', textAlign: 'center', marginBottom: '5px' }}>電影の設定</h2>
            <p style={{ color: '#aaa', textAlign: 'center', fontSize: '0.9rem', marginBottom: '20px' }}>あなただけのボスを作ろう！</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <img src={tempKenju?.image || myProfile.myKenju?.image || getStorageUrl('/images/monster/11.png')} alt="電影" style={{ width: '250px', height: '250px', borderRadius: '15px', objectFit: 'contain', border: '3px solid #ff5252', background: '#111', marginBottom: '15px', boxShadow: '0 0 15px rgba(255, 82, 82, 0.3)' }} />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label style={{ background: '#ff5252', color: '#fff', padding: '8px 25px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                    電影の画像をアップロード (600px×600pxまで)
                    <input type="file" accept="image/*" onChange={(e) => handleIconChange(e, true)} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  電影名(15文字以内) <span style={{ color: '#ff5252', fontSize: '0.7rem' }}>※必須項目</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={tempKenju?.name || ''}
                  placeholder="電影"
                  onChange={(e) => setTempKenju({
                    ...(tempKenju || myProfile.myKenju || { skills: [], image: '', description: '', title: '', background: '' }),
                    name: e.target.value,
                    uploaderUid: user?.uid
                  })}
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
                />
                <p style={{ color: '#ff5252', fontSize: '0.65rem', margin: '5px 0 0 0' }}>※公序良俗に反する内容を投稿しないでください</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                電影の紹介文（200文字以内） <span style={{ color: '#ff5252', fontSize: '0.7rem' }}>※必須項目</span>
              </label>
              <textarea
                maxLength={200}
                value={tempKenju?.description || ''}
                placeholder="戦闘画面のサイドバーに表示される紹介文です"
                onChange={(e) => setTempKenju({
                  ...(tempKenju || myProfile.myKenju || { name: '', skills: [], image: '', title: '', background: '' }),
                  description: e.target.value,
                  uploaderUid: user?.uid
                })}
                style={{ width: '100%', height: '100px', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box', resize: 'vertical' }}
              />
              <p style={{ color: '#ff5252', fontSize: '0.65rem', margin: '5px 0 0 0' }}>※公序良俗に反する内容を投稿しないでください</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>対戦時タイトル（20文字以内）</label>
                <input
                  type="text"
                  maxLength={20}
                  value={tempKenju?.title || ''}
                  placeholder="BOSS SKILLS DISCLOSED"
                  onChange={(e) => setTempKenju({
                    ...(tempKenju || myProfile.myKenju || { name: '', skills: [], image: '', description: '', background: '' }),
                    title: e.target.value,
                    uploaderUid: user?.uid
                  })}
                  style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
                />
                <p style={{ color: '#ff5252', fontSize: '0.65rem', margin: '5px 0 0 0' }}>※公序良俗に反する内容を投稿しないでください</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>対戦背景を選択</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {presetBackgrounds.map((bg, idx) => (
                        <div
                          key={idx}
                          onClick={() => setTempKenju({
                            ...(tempKenju || myProfile.myKenju || { name: '', skills: [], image: '', description: '', title: '' }),
                            background: bg,
                            uploaderUid: user?.uid
                          })}
                          style={{ cursor: 'pointer', border: ((tempKenju?.background || myProfile.myKenju?.background) === bg || (!(tempKenju?.background || myProfile.myKenju?.background) && bg.includes('11.jpg'))) ? '3px solid #ff5252' : '1px solid #444', borderRadius: '8px', overflow: 'hidden', height: '60px', position: 'relative' }}
                        >
                            <img src={getStorageUrl(bg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 4px' }}>Stage {idx+1}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ color: '#fff', fontWeight: 'bold' }}>電影スキル編成 (1～8個 / 重複可)</label>
                <button
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: 'スキルのリセット',
                      message: '電影のスキルをリセットしますか？',
                      onConfirm: () => {
                        setTempKenju({
                          ...(tempKenju || myProfile.myKenju || { name: '', image: '', description: '', title: '', background: '' }),
                          skills: [],
                          uploaderUid: user?.uid
                        });
                        setConfirmModal(prev => ({ ...prev, show: false }));
                      }
                    });
                  }}
                  style={{ padding: '4px 12px', background: '#444', color: '#fff', border: '1px solid #666', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#555'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#444'}
                >
                  スキルリセット
                </button>
              </div>
              <div id='deneiSkillPanel' style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', maxHeight: '460px', overflowY: 'auto', padding: '10px', background: '#111', borderRadius: '8px', border: '1px solid #444', scrollbarWidth: 'thin' }}>
                {[...allSkills]
                  .filter((skill) => skill.denei === 1)
                  .sort((a, b) => {
                    if (a.kamiwaza === 1 && b.kamiwaza !== 1) return -1;
                    if (a.kamiwaza !== 1 && b.kamiwaza === 1) return 1;
                    return 0;
                  })
                  .map(s => (
                    <div key={s.abbr} style={{ display: 'flex', justifyContent: 'center' }}>
                      <SkillCard
                        skill={s}
                        isSelected={false}
                        onClick={() => handleKenjuSkillToggle(s.abbr)}
                      />
                    </div>
                  ))}
              </div>
              <div style={{ marginTop: '10px', color: '#aaa', fontSize: '0.8rem' }}>
                現在のスキル構成（クリックで削除）:
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                  {(tempKenju?.skills || myProfile.myKenju?.skills || []).map((abbr, idx) => {
                    const s = getSkillByAbbr(abbr);
                    return s ? (
                      <div
                        key={idx}
                        onClick={() => {
                          const newSkills = [...(tempKenju?.skills || myProfile.myKenju?.skills || [])];
                          newSkills.splice(idx, 1);
                          setTempKenju({
                            ...(tempKenju || myProfile.myKenju || { name: '', image: '', description: '', title: '', background: '' }),
                            skills: newSkills,
                            uploaderUid: user?.uid
                          });
                        }}
                        style={{ cursor: 'pointer' }}
                        title={`${s.name} (クリックで削除)`}
                      >
                        <img src={getStorageUrl(s.icon)} alt={s.name} style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid #ff5252' }} />
                      </div>
                    ) : null;
                  })}
                  {(tempKenju?.skills || myProfile.myKenju?.skills || []).length === 0 && <span>なし</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  const currentKenju = tempKenju || myProfile.myKenju;
                  if (!currentKenju) return;

                  // 必須チェック
                  const errors = [];
                  if (!currentKenju.name || currentKenju.name.trim() === '') {
                    errors.push('・電影名');
                  }
                  if (!currentKenju.description || currentKenju.description.trim() === '') {
                    errors.push('・電影の紹介文');
                  }
                  if (!currentKenju.skills || currentKenju.skills.length === 0) {
                    errors.push('・スキル（1つ以上設定してください）');
                  }

                  if (errors.length > 0) {
                    setAlertModal({
                      show: true,
                      title: '入力エラー',
                      message: `以下の項目は必須です：\n${errors.join('\n')}`,
                      buttonColor: '#ff5252'
                    });
                    return;
                  }
                  
                  // スキル構成に変更があるかチェック
                  const oldSkills = myProfile.myKenju?.skills || [];
                  const newSkills = currentKenju.skills || [];
                  const skillsChanged = oldSkills.length !== newSkills.length ||
                                       oldSkills.some((s, i) => s !== newSkills[i]);

                  const finalKenju = {
                    ...currentKenju,
                    name: currentKenju.name, // Ensure required fields
                    image: currentKenju.image,
                    skills: currentKenju.skills,
                    uploaderUid: currentKenju.uploaderUid || user?.uid
                  };

                  if (skillsChanged) {
                    setConfirmModal({
                      show: true,
                      title: '電影の保存',
                      message: 'スキル構成が変更されています。\n保存すると、現在のクリア人数と挑戦回数が\nリセットされますが、よろしいですか？\n(❤️の数はリセットされません)',
                      onConfirm: () => {
                        setIsSaving(true);
                        onSaveKenju(finalKenju, true, (success, message) => {
                          setIsSaving(false);
                          setAlertModal({
                            show: true,
                            title: '保存しました',
                            message: success ? "電影を保存しました。\nスキル構成が変更されたため、\nクリア人数と挑戦回数がリセットされました。" : message,
                            buttonColor: success ? '#2196f3' : '#ff5252'
                          });
                        });
                        setConfirmModal(prev => ({ ...prev, show: false }));
                      }
                    });
                  } else {
                    // スキル構成に変更がない場合は即時保存（リセットなし）
                    setIsSaving(true);
                    onSaveKenju(finalKenju, false, (success, message) => {
                      setIsSaving(false);
                      setAlertModal({
                        show: true,
                        title: '保存しました',
                        message: success ? '電影を保存しました。' : message,
                        buttonColor: success ? '#2196f3' : '#ff5252'
                      });
                    });
                  }
                }}
                style={{ flex: 1, padding: '12px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                電影を保存
              </button>
              <button
                onClick={() => {
                  setConfirmModal({
                    show: true,
                    title: '編集の破棄',
                    message: '編集内容を破棄して元の編成に戻しますか？',
                    onConfirm: () => {
                      setTempKenju(myProfile.myKenju || null);
                      setConfirmModal(prev => ({ ...prev, show: false }));
                    },
                    confirmColor: '#888'
                  });
                }}
                style={{ padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                元に戻す
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #444', marginTop: '30px', paddingTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setStageMode('DELETE_ACCOUNT');
              }} 
              style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem' }}
            >
              アカウント削除
            </button>
          </div>

          {/* 電影クリア履歴の表示 */}
          {myProfile.deneiVictories && Object.keys(myProfile.deneiVictories).length > 0 && (
            <div style={{ borderTop: '2px solid #ffd700', marginTop: '40px', paddingTop: '30px', width: '100%' }}>
              <h2 style={{ color: '#ffd700', textAlign: 'center', marginBottom: '20px' }}>電影撃破の記録</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {Object.entries(myProfile.deneiVictories)
                  .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                  .map(([id, victory]) => (
                    <div key={id} style={{ background: '#222', padding: '15px', borderRadius: '10px', border: '1px solid #444' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{victory.targetName}</div>
                        <div style={{ color: '#888', fontSize: '0.75rem' }}>{new Date(victory.timestamp).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {victory.skillAbbrs.map((abbr, idx) => {
                          const s = getSkillByAbbr(abbr);
                          return s ? (
                            <img
                              key={idx}
                              src={getStorageUrl(s.icon)}
                              alt={s.name}
                              title={s.name}
                              style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid #ffd700' }}
                            />
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>

        <CustomAlertModal
          show={alertModal.show}
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(prev => ({ ...prev, show: false }))}
          buttonColor={alertModal.buttonColor}
        />
        <CustomConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
          confirmColor={confirmModal.confirmColor}
        />
        {isSaving && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 60000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px'
          }}>
            <div className="loading-spinner" style={{
              width: '50px', height: '50px', border: '5px solid rgba(79, 195, 247, 0.3)',
              borderTop: '5px solid #4fc3f7', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ color: '#4fc3f7', fontWeight: 'bold', fontSize: '1.1rem', textShadow: '0 0 10px rgba(79, 195, 247, 0.5)' }}>保存中...</div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        {showGuideline && <GuidelineModal onClose={() => setShowGuideline(false)} />}
      </div>
    );
  }

  if (stageMode === 'DELETE_ACCOUNT') {
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <h1 style={{ color: '#ff5252' }}>ユーザー登録解除</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #ff5252', maxWidth: '500px' }}>
          <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '20px' }}>ユーザー登録を解除しますか？</p>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '30px' }}>※この操作は取り消せません。<br></br>あなたのプロフィールデータなどはすべて削除されます。</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button onClick={onDeleteAccount} style={{ padding: '10px 30px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>登録を解除する</button>
            <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 30px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>キャンセル</button>
          </div>
        </div>
      </div>
    );
  }

  if (stageMode === 'PROFILE') {
    if (!viewingProfile) {
      return (
        <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
          <div>プロフィール情報を読み込めませんでした。</div>
          <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>ラウンジへ戻る</button>
        </div>
      );
    }
    const favSkill = getSkillByAbbr(viewingProfile.favoriteSkill);
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <h1 style={{ color: '#ffd700' }}>PROFILE</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #ffd700', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <img src={((viewingProfile.photoURL || '').startsWith('/') ? getStorageUrl(viewingProfile.photoURL) : (viewingProfile.photoURL || 'https://via.placeholder.com/100'))} alt={viewingProfile.displayName} style={{ width: '100px', height: '100px', borderRadius: '10%', marginBottom: '20px', objectFit: 'cover', background: '#222' }} />
          <h2 style={{ color: '#FFFFFF', margin: '0 0 5px 0' }}>{viewingProfile.displayName}</h2>
          {viewingProfile.title && <div style={{ color: '#ffd700', fontSize: '0.9rem', marginBottom: '15px' }}>称号: {viewingProfile.title}</div>}
          <p style={{ color: '#aaa', fontStyle: 'italic', marginBottom: '15px' }}>"{viewingProfile.comment}"</p>
          {viewingProfile.oneThing && (
            <div style={{ color: '#4fc3f7', fontSize: '0.9rem', marginBottom: '30px', borderTop: '1px dashed #444', paddingTop: '15px' }}>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>無人島に一つ持っていけるとしたら？</span><br/>
                {viewingProfile.oneThing}
            </div>
          )}
          <div style={{ textAlign: 'left', background: '#222', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffd700', marginTop: 0 }}>お気に入りスキル</h3>
            {favSkill && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={getStorageUrl(favSkill.icon)} alt={favSkill.name} style={{ width: '40px' }} /><span ><div style={{ color: '#FFFFFF' }}>{favSkill.name}</div></span></div>}
          </div>

          {isAdmin && (
            <div style={{ textAlign: 'left', background: 'rgba(255, 82, 82, 0.08)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255, 82, 82, 0.45)' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#ff8a80', margin: '0 0 10px 0' }}>管理者デバッグ</h3>
              <button
                onClick={() => onAdminResetAllProgressData(viewingProfile)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#b71c1c',
                  color: '#fff',
                  border: '1px solid #ff8a80',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                このユーザの進行データを全て消去
              </button>
              <button
                onClick={() => onAdminDeleteUserAccount(viewingProfile)}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '12px',
                  background: '#5a1212',
                  color: '#fff',
                  border: '1px solid #ff8a80',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                このユーザのアカウントを削除
              </button>
              <p style={{ color: '#ffb4ab', fontSize: '0.72rem', margin: '10px 0 0 0', lineHeight: '1.5' }}>
                第1章・第2章の進行、所持スキル、撃破記録、電影撃破履歴、メダル、BATTLE STATS を初期化します。
              </p>
              <p style={{ color: '#d7a8a8', fontSize: '0.7rem', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                アカウント削除は、公開プロフィールと電影関連データを削除します。
              </p>
            </div>
          )}

          {viewingProfile.myKenju && (
            <div style={{ textAlign: 'center', background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff5252' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1rem', color: '#ff5252', marginTop: 0, textAlign: 'left' }}>{viewingProfile.displayName}の電影</h3>
                {user?.uid !== viewingProfile.uid && (
                  <button
                    onClick={() => toggleMute(viewingProfile.uid)}
                    style={{
                      padding: '4px 8px',
                      background: mutedUids.includes(viewingProfile.uid) ? '#ff5252' : '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    {mutedUids.includes(viewingProfile.uid) ? 'ミュート解除' : 'ミュートする'}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', width: '100%', maxWidth: '150px', height: '120px', margin: '0 auto 15px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ff5252' }}>
                <img src={viewingProfile.myKenju.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{viewingProfile.myKenju.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#ff5252', marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div>クリア: {deneiClears}人 / 挑戦: {deneiTrials}回</div>
                <button
                  onClick={(e) => { e.stopPropagation(); onLikeDenei(viewingProfile.uid, viewingProfile.myKenju!.name); }}
                  style={{ background: 'none', border: '1px solid #ff5252', borderRadius: '15px', padding: '4px 15px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{allDeneiStats?.[viewingProfile.uid]?.[viewingProfile.myKenju.name]?.isLiked ? '❤️' : '🤍'}</span>
                  <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{allDeneiStats?.[viewingProfile.uid]?.[viewingProfile.myKenju.name]?.likes || 0}</span>
                </button>
              </div>
              <button
                className="TitleButton neon-red"
                onClick={async () => {
                  setIsBattleLoading(true);
                  try {
                    const skills = viewingProfile.myKenju!.skills.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
                    await onKenjuBattle({
                      name: viewingProfile.myKenju!.name,
                      image: viewingProfile.myKenju!.image,
                      description: viewingProfile.myKenju!.description || '',
                      skills: skills.length > 0 ? skills : [getSkillByAbbr('一')!],
                      title: viewingProfile.myKenju!.title,
                      userName: viewingProfile.displayName,
                      background: viewingProfile.myKenju!.background,
                      masterUid: viewingProfile.uid,
                      isCustom: true
                    } as any, 'DENEI');
                  } finally {
                    setIsBattleLoading(false);
                  }
                }}
                style={{ color: '#ffe600', padding: '8px 30px', fontSize: '1rem', width: '100%' }}
              >
                この電影と戦う
              </button>
              {user?.uid !== viewingProfile.uid && (
                <p style={{ color: '#888', fontSize: '0.65rem', marginTop: '10px', textAlign: 'left' }}>
                  ※ミュートすると、この電影はラウンジのピックアップに表示されなくなります（設定はブラウザに保存されます）。
                </p>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>

        {isBattleLoading && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 70000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px'
          }}>
            <img src={loadingImageUrl || "/images/title/sailing_loop_32x32_fixed.gif"} alt="Loading" style={{ width: '64px', height: '64px', imageRendering: 'pixelated' }} />
            <div style={{ color: '#ff5252', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px rgba(255, 82, 82, 0.5)' }}>準備中...</div>
          </div>
        )}
      </div>
    );
  }

  if (stageMode === 'ADMIN_ANALYTICS') {
    return (
      <AdminAnalytics
        onBack={() => setStageMode('LOUNGE')}
        getSkillByAbbr={getSkillByAbbr}
      />
    );
  }

  return null;
};
