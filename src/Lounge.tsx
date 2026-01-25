import React from 'react';
import { User } from "firebase/auth";
import { SkillDetail } from './skillsData';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  favoriteSkill: string;
  title: string;
  comment: string;
  lastActive: number;
  points?: number;
  kenjuLife?: number;
  lastKenjuDate?: string;
  winCount?: number;
  medals?: string[];
}

interface LoungeProps {
  user: User | null;
  myProfile: UserProfile | null;
  allProfiles: UserProfile[];
  lastActiveProfiles: {[uid: string]: number};
  kenjuBoss: {name: string, image: string, skills: SkillDetail[]} | null;
  onGoogleSignIn: () => void;
  onEmailSignUp: (email: string, pass: string) => void;
  onEmailSignIn: (email: string, pass: string) => void;
  onSignOut: () => void;
  onUpdateProfile: (displayName: string, favoriteSkill: string, comment: string, photoURL?: string, title?: string) => void;
  onDeleteAccount: () => void;
  onKenjuBattle: () => void;
  onBack: () => void;
  onViewProfile: (profile: UserProfile) => void;
  stageMode: 'LOUNGE' | 'MYPAGE' | 'PROFILE' | 'RANKING' | 'DELETE_ACCOUNT' | 'VERIFY_EMAIL';
  setStageMode: (mode: any) => void;
  viewingProfile: UserProfile | null;
  allSkills: SkillDetail[];
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
  allProfilesCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const Lounge: React.FC<LoungeProps> = ({
  user,
  myProfile,
  allProfiles,
  lastActiveProfiles,
  kenjuBoss,
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
  onPageChange
}) => {
  const today = new Date().toLocaleDateString();

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [isSignUp, setIsSignUp] = React.useState(false);
  const isInitializing = React.useRef(false);

  const medals = [
    { id: 'master', name: '剣聖', description: 'すべての試練を乗り越えた証' },
    { id: 'kenju', name: '獣殺し', description: '剣獣に勝利した証' }
  ];

  if (stageMode === 'LOUNGE') {
    const life = (myProfile?.lastKenjuDate === today ? myProfile?.kenjuLife : 5) ?? 5;
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
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
                 '0.8rem', marginBottom: '10px' }}>ログインできない・データをリセットしたい場合</p>
              <button 
                onClick={() => setStageMode('DELETE_ACCOUNT')} 
                style={{ padding: '8px 15px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                アカウント削除・データ初期化
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStageMode('MYPAGE')} style={{ padding: '10px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>マイページ</button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onSignOut} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>サインアウト</button>
              </div>
            </div>

            {kenjuBoss && (
                <div style={{ background: '#2c0a0a', padding: '20px', borderRadius: '15px', border: '2px solid #ff5252', marginBottom: '30px', textAlign: 'center' }}>
                    <h2 style={{ color: '#ff5252', margin: '0 0 10px 0' }}>本日の剣獣: {kenjuBoss.name}</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <img src={(process.env.PUBLIC_URL || '') + kenjuBoss.image} alt={kenjuBoss.name} style={{ width: '120px' }} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ color: '#fff', marginBottom: '5px' }}>残り挑戦回数: {life} / 5</div>
                            <button className="TitleButton neon-gold" onClick={onKenjuBattle} style={{ padding: '10px 30px', fontSize: '1rem' }}>剣獣戦に挑む</button>
                        </div>
                    </div>
                </div>
            )}

            <h2 style={{ color: '#ffd700' }}>剣士たち</h2>
            <div style={{ width: '100%', overflowX: 'auto', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #444' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #444', color: '#ffd700', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px', textAlign: 'center' }}>状態</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>剣士</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>好</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ひとこと</th>
                  </tr>
                </thead>
                <tbody>
                  {allProfiles.map(p => {
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
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ 
                            width: '12px', height: '12px', borderRadius: '50%', margin: '0 auto',
                            backgroundColor: isActive ? '#4caf50' : '#333',
                            boxShadow: isActive ? '0 0 8px #4caf50' : 'none',
                            border: '1px solid ' + (isActive ? '#81c784' : '#555')
                          }} title={isActive ? "オンライン" : "オフライン"} />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={(p.photoURL.startsWith('/') ? process.env.PUBLIC_URL : '') + (p.photoURL || 'https://via.placeholder.com/40')} alt={p.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#222', objectFit: 'cover', border: '1px solid #444' }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{p.displayName}</div>
                              {p.title && <div style={{ fontSize: '0.7rem', color: '#ffd700' }}>{p.title}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {favSkill && (
                            <img 
                              src={process.env.PUBLIC_URL + favSkill.icon} 
                              alt={favSkill.name} 
                              title={favSkill.name}
                              style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid #ffd700' }} 
                            />
                          )}
                        </td>
                        <td style={{ padding: '10px', fontSize: '0.85rem', color: '#ccc' }}>
                          {p.comment}
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
          </div>
        )}
        <button onClick={onBack} style={{ marginTop: '30px', marginBottom: '30px', padding: '15px 40px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>戻る</button>
      </div>
    );
  }

  if (stageMode === 'MYPAGE') {
    if (!myProfile) {
      if (user && !isInitializing.current) {
        isInitializing.current = true;
        onUpdateProfile("名もなき人", "一", "よろしく！");
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

      // 1MB limit
      if (file.size > 1024 * 1024) {
        alert("ファイルサイズは1MB以下にしてください。");
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
            onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, dataUrl, myProfile.title);
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
      onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, iconPath, myProfile.title);
    };

    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#4fc3f7' }}>MY PAGE</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #2196f3', width: '100%', maxWidth: '500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <img src={(myProfile.photoURL.startsWith('/') ? process.env.PUBLIC_URL : '') + (myProfile.photoURL || 'https://via.placeholder.com/80')} alt={myProfile.displayName} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', display: 'block', marginBottom: '10px', border: '2px solid #2196f3', background: '#222' }} />
              <label style={{ background: '#2196f3', color: '#fff', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem' }}>
                画像アップ
                <input type="file" accept="image/*" onChange={handleIconChange} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#aaa' }}>名前</label>
                <input 
                type="text" 
                value={myProfile.displayName} 
                onChange={(e) => onUpdateProfile(e.target.value, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, myProfile.title)}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
                />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>称号を選択</label>
            <select 
              value={myProfile.title || ""} 
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, myProfile.comment, myProfile.photoURL, e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px' }}
            >
              <option value="">なし</option>
              {(myProfile.medals || []).map(mId => {
                const medal = medals.find(m => m.id === mId);
                return medal ? <option key={mId} value={medal.name}>{medal.name}</option> : null;
              })}
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>好きなスキル</label>
            <select 
              value={myProfile.favoriteSkill} 
              onChange={(e) => onUpdateProfile(myProfile.displayName, e.target.value, myProfile.comment, myProfile.photoURL, myProfile.title)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px' }}
            >
              {allSkills.map(s => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>一言 (10文字以内)</label>
            <input 
              type="text" 
              maxLength={10}
              value={myProfile.comment} 
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, e.target.value, myProfile.photoURL, myProfile.title)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#aaa' }}>獲得した勲章</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {(myProfile.medals || []).length === 0 && <div style={{ color: '#666', fontSize: '0.8rem' }}>まだ勲章を持っていません</div>}
              {(myProfile.medals || []).map(mId => {
                const medal = medals.find(m => m.id === mId);
                return (
                  <div key={mId} style={{ background: '#333', border: '1px solid #ffd700', color: '#ffd700', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem' }} title={medal?.description}>
                    {medal?.name}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#aaa' }}>プリセットアイコンから選ぶ</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {presetIcons.map(icon => (
                <img 
                  key={icon} 
                  src={`${process.env.PUBLIC_URL}/images/icon/${icon}`} 
                  alt="" 
                  onClick={() => handlePresetIconSelect(icon)}
                  style={{ width: '100%', cursor: 'pointer', border: myProfile.photoURL.includes(icon) ? '2px solid #ffd700' : '1px solid #444', borderRadius: '4px', padding: '2px', background: '#222' }}
                />
              ))}
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
              ユーザー登録解除（退会）
            </button>
          </div>
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
      </div>
    );
  }

  if (stageMode === 'DELETE_ACCOUNT') {
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <h1 style={{ color: '#ff5252' }}>ユーザー登録解除</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #ff5252', maxWidth: '500px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>ユーザー登録を解除しますか？</p>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '30px' }}>※この操作は取り消せません。あなたのプロフィールデータなどはすべて削除されます。</p>
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
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#ffd700' }}>PROFILE</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #ffd700', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <img src={(viewingProfile.photoURL.startsWith('/') ? process.env.PUBLIC_URL : '') + (viewingProfile.photoURL || 'https://via.placeholder.com/100')} alt={viewingProfile.displayName} style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px', objectFit: 'cover', background: '#222' }} />
          <h2 style={{ margin: '0 0 5px 0' }}>{viewingProfile.displayName}</h2>
          {viewingProfile.title && <div style={{ color: '#ffd700', fontSize: '0.9rem', marginBottom: '15px' }}>称号: {viewingProfile.title}</div>}
          <p style={{ color: '#aaa', fontStyle: 'italic', marginBottom: '30px' }}>"{viewingProfile.comment}"</p>
          <div style={{ textAlign: 'left', background: '#222', padding: '15px', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffd700', marginTop: 0 }}>お気に入りスキル</h3>
            {favSkill && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={(process.env.PUBLIC_URL || '') + favSkill.icon} alt={favSkill.name} style={{ width: '40px' }} /><span>{favSkill.name}</span></div>}
          </div>
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
      </div>
    );
  }

  return null;
};
