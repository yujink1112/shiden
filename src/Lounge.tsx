import React, { useState } from 'react';
import { User } from "firebase/auth";
import { SkillDetail } from './skillsData';
import { AdminAnalytics } from './AdminAnalytics';
import { getStorageUrl } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
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
}

interface UserListTableProps {
  profiles: UserProfile[];
  lastActiveProfiles: {[uid: string]: number};
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
  allSkills: SkillDetail[];
  onViewProfile: (profile: UserProfile) => void;
  allProfilesCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const UserListTable: React.FC<UserListTableProps> = ({
  profiles,
  lastActiveProfiles,
  getSkillByAbbr,
  allSkills,
  onViewProfile,
  allProfilesCount,
  currentPage,
  onPageChange
}) => {
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
      <div style={{ width: '100%', overflowX: 'auto', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #444' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #444', color: '#ffd700', fontSize: '0.9rem' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>名前</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>好き</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>無人島に持っていきたい</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>ひとこと</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const isActive = !!lastActiveProfiles[p.uid];
              const favSkill = getSkillByAbbr(p.favoriteSkill);
              return (
                <tr
                  key={p.uid}
                  onClick={() => onViewProfile(p)}
                  style={{ borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={((p.photoURL || '').startsWith('/') ? getStorageUrl(p.photoURL) : (p.photoURL || 'https://via.placeholder.com/40'))} alt={p.displayName} style={{ width: '40px', height: '40px', borderRadius: '10%', background: '#222', objectFit: 'cover', border: '1px solid #444' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.95rem' }}>{p.displayName}</div>
                        {p.title && <div style={{ fontSize: '0.7rem', color: '#ffd700' }}>{p.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {favSkill && (
                      <img
                        src={getStorageUrl(favSkill.icon)}
                        alt={favSkill.name}
                        title={favSkill.name}
                        style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid #ffd700' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.85rem', color: '#ccc' }}>
                    {p.oneThing || '-'}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.85rem', color: '#ccc' }}>
                    {p.isSpoiler && !spoilerVisibility[p.uid] ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSpoiler(p.uid); }}
                        style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', padding: '5px 10px' }}
                      >
                        ネタバレ注意 (クリックで表示)
                      </button>
                    ) : (
                      p.comment
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* ページング UI */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {Array.from({ length: Math.ceil(allProfilesCount / 20) }, (_, i) => (
              <button
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  style={{
                      padding: '5px 10px',
                      background: currentPage === i + 1 ? '#4fc3f7' : '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
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

interface LoungeProps {
  user: User | null;
  myProfile: UserProfile | null;
  allProfiles: UserProfile[];
  lastActiveProfiles: {[uid: string]: number};
  kenjuBoss: {name: string, image: string, skills: SkillDetail[]} | null;
  currentKenjuBattle: {name: string, image: string, skills: SkillDetail[]} | null;
  kenjuClears: number;
  kenjuTrials: number;
  onGoogleSignIn: () => void;
  onEmailSignUp: (email: string, pass: string) => void;
  onEmailSignIn: (email: string, pass: string) => void;
  onSignOut: () => void;
  onUpdateProfile: (displayName: string, favoriteSkill: string, comment: string, photoURL?: string, title?: string, oneThing?: string, isSpoiler?: boolean, myKenju?: UserProfile['myKenju'], photoUploaderUid?: string) => void;
  onSaveKenju: (myKenju: UserProfile['myKenju'], shouldResetStats?: boolean) => void;
  onDeleteAccount: () => void;
  onKenjuBattle: (boss?: { name: string; image: string; skills: SkillDetail[]; background?: string; title?: string; description?: string }, mode?: 'KENJU' | 'DENEI' | 'MID' | 'BOSS') => void;
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
}


export const Lounge: React.FC<LoungeProps> = ({
  user,
  myProfile,
  allProfiles,
  lastActiveProfiles,
  kenjuBoss,
  currentKenjuBattle,
  kenjuClears,
  kenjuTrials,
  kenjuBosses,
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
  onSignOut,
  onUpdateProfile,
  onSaveKenju,
  onDeleteAccount,
  onKenjuBattle,
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
  SkillCard
}) => {
  const today = new Date().toLocaleDateString();

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = React.useState(false);
  const [showGuideline, setShowGuideline] = React.useState(false);
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

  // 電影編集用の一時ステート
  const [tempKenju, setTempKenju] = React.useState<UserProfile['myKenju'] | null>(null);

  const isMypageInitialized = React.useRef(false);

  // マイページ表示時に現在の電影情報をセット（初回のみ、またはMYPAGEに切り替わった時のみ）
  React.useEffect(() => {
    if (stageMode === 'MYPAGE') {
      if (!isMypageInitialized.current && myProfile?.myKenju) {
        setTempKenju(myProfile.myKenju);
        isMypageInitialized.current = true;
      }
    } else {
      // MYPAGEを抜ける時にクリアする
      setTempKenju(null);
      isMypageInitialized.current = false;
    }
  }, [stageMode]); // myProfile?.myKenju を依存関係から外すことで編集中のリセットを防ぐ

  const presetBackgrounds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => `/images/background/${n}.jpg`);

  const medals = [
    { id: 'master', name: 'クリアしたよ！', description: 'Stage12をクリア' },
    { id: 'traveler', name: '旅人', description: '無条件で獲得' },
    { id: 'monkey', name: 'サルの一味', description: '無条件で獲得' },
    { id: 'kriemhild', name: '王家の冠月の友', description: 'クリームヒルトを撃破' },
    { id: 'wadachi', name: '紅蓮を越えし者', description: 'ワダチを撃破' },
    { id: 'shiran', name: '氷彗の解凍者', description: 'シーランを撃破' },
    { id: 'atiyah', name: '眠り猫の遊び相手', description: 'アティヤーを撃破' },
    { id: 'vomakt', name: '白金の目撃者', description: 'ヴォマクトを撃破' },
    { id: 'steve', name: '冥土の同伴者', description: 'スティーブを撃破' },
    { id: 'fiat_lux', name: '光あれ', description: '果てに視えるものを撃破' }
  ];

  const randomKenjuPlayers = React.useMemo(() => {
    const withKenju = allProfiles.filter(p => p.myKenju && p.myKenju.name && p.myKenju.image);
    return [...withKenju].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [allProfiles]);

  if (stageMode === 'LOUNGE') {
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <h1 style={{ color: '#4fc3f7' }}>LOUNGE</h1>
        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '400px' }}>
            <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #4fc3f7', textAlign: 'center', width: '100%' }}>
              <h2 style={{ color: '#fff' }}>{isSignUp ? "新規登録" : "サインイン"}</h2>
              <div style={{ marginBottom: '20px' }}>
                  <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }} />
                  <input type="password" placeholder="パスワード" value={pass} onChange={e => setPass(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }} />
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
            
            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '1px solid #ff5252', width: '100%', textAlign: 'center' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStageMode('MYPAGE')} style={{ padding: '10px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>マイページ</button>
                {myProfile && (
                  <button onClick={() => onViewProfile(myProfile)} style={{ padding: '10px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>自分のプロフィール</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onSignOut} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>サインアウト</button>
                {isAdmin && (
                  <button onClick={() => setStageMode('ADMIN_ANALYTICS')} style={{ padding: '10px 20px', background: '#8e24aa', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Admin Analytics</button>
                )}
              </div>
            </div>

            <div style={{ display: 'none', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #555', marginBottom: '30px', textAlign: 'center' }}>
                <h2 style={{ color: '#888', margin: '0 0 10px 0', fontSize: '1.2rem' }}>剣獣戦</h2>
                <p style={{ color: '#ccc', margin: 0 }}>近日中にコンテンツ追加予定です。お楽しみに！</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{  background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ff5252', textAlign: 'center', boxShadow: '0 0 15px rgba(255, 82, 82, 0.2)' }}>
                  <h2 style={{ color: '#ff5252', margin: '0 0 10px 0', fontSize: '1.2rem' }}>本日の剣獣</h2>
                  {kenjuBoss && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: '100%', maxWidth: '200px', height: '150px', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ff5252' }}>
                        <img src={getStorageUrl(kenjuBoss.image)} alt={kenjuBoss.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{kenjuBoss.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#ff5252', marginBottom: '15px' }}>クリア人数: {kenjuClears}人</div>
                      <button
                        className="TitleButton neon-red"
                        onClick={() => onKenjuBattle()}
                        style={{ color: '#ffe600', padding: '10px 40px', fontSize: '1.1rem' }}
                      >
                        挑む
                      </button>
                    </div>
                  )}
              </div>

              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #4fc3f7', textAlign: 'center', boxShadow: '0 0 15px rgba(79, 195, 247, 0.2)' }}>
                <h2 style={{ color: '#4fc3f7', margin: '0 0 10px 0', fontSize: '1.2rem' }}>ピックアップ電影</h2>
                {randomKenjuPlayers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {randomKenjuPlayers.map(p => (
                      <div key={p.uid} onClick={() => onViewProfile(p)} style={{ cursor: 'pointer', background: '#222', padding: '10px', borderRadius: '8px', border: '1px solid #444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={p.myKenju?.image} alt="" style={{ width: '50px', height: '50px', borderRadius: '5px', objectFit: 'contain', background: '#000' }} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{p.myKenju?.name}</div>
                          <div style={{ color: '#aaa', fontSize: '0.7rem' }}>Master: {p.displayName}</div>
                        </div>
                        <div style={{ color: '#4fc3f7' }}>〉</div>
                      </div>
                    ))}
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>プロフィールから対戦できます</p>
                  </div>
                ) : (
                  <p style={{ color: '#888', margin: '20px 0' }}>まだ電影を登録しているプレイヤーがいません</p>
                )}
              </div>
            </div>


            {isAdmin && kenjuBosses && (
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
            )}

            <UserListTable
              profiles={allProfiles}
              lastActiveProfiles={lastActiveProfiles}
              getSkillByAbbr={getSkillByAbbr}
              allSkills={allSkills}
              onViewProfile={onViewProfile}
              allProfilesCount={allProfilesCount}
              currentPage={currentPage}
              onPageChange={onPageChange}
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
              setTempKenju({
                name: tempKenju?.name || myProfile.myKenju?.name || 'マイ電影',
                image: dataUrl,
                skills: tempKenju?.skills || myProfile.myKenju?.skills || ['一', '刺', '崩', '待', '果'],
                description: tempKenju?.description || myProfile.myKenju?.description || '',
                title: tempKenju?.title || myProfile.myKenju?.title || 'BOSS SKILLS DISCLOSED',
                background: tempKenju?.background || myProfile.myKenju?.background || '/images/background/11.jpg',
                uploaderUid: user?.uid // 追跡用にアップロードしたユーザのUIDをセット
              });
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
      newSkills.push(abbr);
      setTempKenju({
        name: tempKenju?.name || myProfile.myKenju?.name || 'マイ電影',
        image: tempKenju?.image || myProfile.myKenju?.image || getStorageUrl('/images/monster/11.png'),
        description: tempKenju?.description || myProfile.myKenju?.description || '',
        title: tempKenju?.title || myProfile.myKenju?.title || 'BOSS SKILLS DISCLOSED',
        background: tempKenju?.background || myProfile.myKenju?.background || '/images/background/11.jpg',
        skills: newSkills
      });
    };

    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <h1 style={{ color: '#4fc3f7' }}>MY PAGE</h1>

        <div style={{ marginBottom: '20px', textAlign: 'center', background: 'rgba(255, 82, 82, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #ff5252', maxWidth: '500px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: '#ff5252', fontSize: '0.85rem', margin: '0 0 10px 0', fontWeight: 'bold' }}>電影の投稿前に必ずガイドラインを一読してください</p>
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
              {allSkills.map(s => (
                <div
                  key={s.abbr}
                  onClick={() => onUpdateProfile(myProfile.displayName, s.abbr, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler, myProfile.myKenju)}
                  style={{
                    cursor: 'pointer',
                    border: myProfile.favoriteSkill === s.abbr ? '2px solid #ffd700' : '1px solid #444',
                    borderRadius: '4px',
                    padding: '2px',
                    background: myProfile.favoriteSkill === s.abbr ? '#333' : '#1a1a1a',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
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
                    電影の画像をアップロード
                    <input type="file" accept="image/*" onChange={(e) => handleIconChange(e, true)} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#aaa' }}>電影名(10文字以内)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={tempKenju?.name || myProfile.myKenju?.name || ''}
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
              <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>電影の紹介文（400文字以内）</label>
              <textarea
                maxLength={400}
                value={tempKenju?.description || myProfile.myKenju?.description || ''}
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
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>対戦時タイトル</label>
                <input
                  type="text"
                  maxLength={30}
                  value={tempKenju?.title || myProfile.myKenju?.title || ''}
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
                <label style={{ color: '#fff', fontWeight: 'bold' }}>電影スキル編成 (最大8つ / 重複可)</label>
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
                {allSkills.map(s => (
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
                  if (!tempKenju) return;
                  
                  // スキル構成に変更があるかチェック
                  const oldSkills = myProfile.myKenju?.skills || [];
                  const newSkills = tempKenju.skills || [];
                  const skillsChanged = oldSkills.length !== newSkills.length ||
                                       oldSkills.some((s, i) => s !== newSkills[i]);

                  const finalKenju = {
                    ...tempKenju,
                    uploaderUid: tempKenju.uploaderUid || user?.uid
                  };

                  if (skillsChanged) {
                    setConfirmModal({
                      show: true,
                      title: '電影の保存',
                      message: 'スキル構成が変更されています。\n保存すると、現在のクリア人数と挑戦回数がリセットされますが、よろしいですか？',
                      onConfirm: () => {
                        onSaveKenju(finalKenju, true);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                      }
                    });
                  } else {
                    // スキル構成に変更がない場合は即時保存（リセットなし）
                    onSaveKenju(finalKenju, false);
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
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>

        <CustomConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
          confirmColor={confirmModal.confirmColor}
        />
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

          {viewingProfile.myKenju && (
            <div style={{ textAlign: 'center', background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff5252' }}>
              <h3 style={{ fontSize: '1rem', color: '#ff5252', marginTop: 0 }}>{viewingProfile.displayName}の電影</h3>
              <div style={{ position: 'relative', width: '100%', maxWidth: '150px', height: '120px', margin: '0 auto 15px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ff5252' }}>
                <img src={viewingProfile.myKenju.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{viewingProfile.myKenju.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#ff5252', marginBottom: '15px' }}>クリア: {kenjuClears}人 / 挑戦: {kenjuTrials}回</div>
              <button
                className="TitleButton neon-red"
                onClick={() => {
                  const skills = viewingProfile.myKenju!.skills.map(abbr => getSkillByAbbr(abbr)).filter(Boolean) as SkillDetail[];
                  onKenjuBattle({
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
                }}
                style={{ color: '#ffe600', padding: '8px 30px', fontSize: '1rem', width: '100%' }}
              >
                この電影と戦う
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
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
