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
  points?: number;
  lastKenjuDate?: string;
  winCount?: number;
  medals?: string[];
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

interface LoungeProps {
  user: User | null;
  myProfile: UserProfile | null;
  allProfiles: UserProfile[];
  lastActiveProfiles: {[uid: string]: number};
  kenjuBoss: {name: string, image: string, skills: SkillDetail[]} | null;
  kenjuClears: number;
  onGoogleSignIn: () => void;
  onEmailSignUp: (email: string, pass: string) => void;
  onEmailSignIn: (email: string, pass: string) => void;
  onSignOut: () => void;
  onUpdateProfile: (displayName: string, favoriteSkill: string, comment: string, photoURL?: string, title?: string, oneThing?: string, isSpoiler?: boolean) => void;
  onDeleteAccount: () => void;
  onKenjuBattle: () => void;
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
}


export const Lounge: React.FC<LoungeProps> = ({
  user,
  myProfile,
  allProfiles,
  lastActiveProfiles,
  kenjuBoss,
  kenjuClears,
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
  onSignOut,
  onUpdateProfile,
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
  isAdmin
}) => {
  const today = new Date().toLocaleDateString();

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = React.useState(false);
  const isInitializing = React.useRef(false);

  const medals = [
    { id: 'master', name: 'クリアしたよ！', description: 'Stage12をクリア' },
    { id: 'traveler', name: '旅人', description: '無条件で獲得' },
    { id: 'monkey', name: 'サルの一味', description: '無条件で獲得' }
  ];

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
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onSignOut} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>サインアウト</button>
                {isAdmin && (
                  <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 20px', background: '#8e24aa', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Admin Analytics</button>
                )}
              </div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ff5252', marginBottom: '30px', textAlign: 'center', boxShadow: '0 0 15px rgba(255, 82, 82, 0.2)' }}>
                <h2 style={{ color: '#ff5252', margin: '0 0 10px 0', fontSize: '1.2rem' }}>今日の剣獣</h2>
                {kenjuBoss && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '200px', height: '150px', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ff5252' }}>
                      <img src={kenjuBoss.image} alt={kenjuBoss.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{kenjuBoss.name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#ff5252', marginBottom: '15px' }}>本日クリア人数: {kenjuClears}人</div>
                    <button
                      className="TitleButton neon-red"
                      onClick={onKenjuBattle}
                      style={{ padding: '10px 40px', fontSize: '1.1rem' }}
                    >
                      挑む
                    </button>
                  </div>
                )}
            </div>

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
      if (user && !isInitializing.current) {
        isInitializing.current = true;
        onUpdateProfile("名もなき人", "一", "よろしく！", undefined, undefined, undefined, false);
      }
      return (
        <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
          <div>データを取得できませんでした。</div>
          <button onClick={() => setStageMode('LOUNGE')} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
        </div>
      );
    }

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 10KB limit
      if (file.size > 10 * 1024) {
        alert("ファイルサイズは10KB以下にしてください。");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize to 64x64 using canvas
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 64, 64);
            const dataUrl = canvas.toDataURL('image/png');
            onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, dataUrl, myProfile.title, myProfile.oneThing, myProfile.isSpoiler);
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
      onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, iconPath, myProfile.title, myProfile.oneThing, myProfile.isSpoiler);
    };

    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto', backgroundImage: `url(${getStorageUrl('/images/background/background.jpg')})` }}>
        <h1 style={{ color: '#4fc3f7' }}>MY PAGE</h1>
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
                onChange={(e) => onUpdateProfile(e.target.value, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler)}
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
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, e.target.value, myProfile.oneThing, myProfile.isSpoiler)}
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
                  onClick={() => onUpdateProfile(myProfile.displayName, s.abbr, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler)}
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
                onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, e.target.value, myProfile.isSpoiler);
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
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, e.target.value, myProfile.photoURL, myProfile.title, myProfile.oneThing, myProfile.isSpoiler)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', background: '#2c1010', padding: '8px', borderRadius: '5px', border: '1px solid #ff5252' }}>
              <input
                type="checkbox"
                id="spoiler-checkbox"
                checked={myProfile.isSpoiler || false}
                onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title, myProfile.oneThing, e.target.checked)}
                style={{ marginRight: '10px', width: '22px', height: '22px', cursor: 'pointer', accentColor: '#ff5252' }}
              />
              <label htmlFor="spoiler-checkbox" style={{ color: '#ff5252', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}>ネタバレ注意 (クリア構成などを書く場合はチェック)</label>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>※入力すると自動で保存されます</p>

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

  if (stageMode === 'PROFILE' && viewingProfile) {
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
          <div style={{ textAlign: 'left', background: '#222', padding: '15px', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffd700', marginTop: 0 }}>お気に入りスキル</h3>
            {favSkill && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={getStorageUrl(favSkill.icon)} alt={favSkill.name} style={{ width: '40px' }} /><span ><div style={{ color: '#FFFFFF' }}>{favSkill.name}</div></span></div>}
          </div>
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
      </div>
    );
  }

  if (stageMode === 'ADMIN_ANALYTICS') {
    setStageMode('LOUNGE');
    return null;
    // if (!isAdmin) {
    //   // 管理者でない場合はラウンジにリダイレクト
    //   setStageMode('LOUNGE');
    //   return null;
    // }
    // return (
    //   <AdminAnalytics
    //     onBack={() => setStageMode('LOUNGE')}
    //   />
    // );
  }

  return null;
};
