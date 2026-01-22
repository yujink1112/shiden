import React from 'react';
import { User } from "firebase/auth";
import { SkillDetail } from './skillsData';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  favoriteSkill: string;
  comment: string;
  lastActive: number;
  points?: number;
  kenjuLife?: number;
  lastKenjuDate?: string;
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
  onUpdateProfile: (displayName: string, favoriteSkill: string, comment: string) => void;
  onKenjuBattle: () => void;
  onBack: () => void;
  onViewProfile: (profile: UserProfile) => void;
  stageMode: 'LOUNGE' | 'MYPAGE' | 'PROFILE' | 'RANKING';
  setStageMode: (mode: any) => void;
  viewingProfile: UserProfile | null;
  allSkills: SkillDetail[];
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
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
  onKenjuBattle,
  onBack,
  onViewProfile,
  stageMode,
  setStageMode,
  viewingProfile,
  allSkills,
  getSkillByAbbr
}) => {
  const today = new Date().toLocaleDateString();

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [isSignUp, setIsSignUp] = React.useState(false);

  if (stageMode === 'LOUNGE') {
    const life = (myProfile?.lastKenjuDate === today ? myProfile?.kenjuLife : 5) ?? 5;
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#4fc3f7' }}>LOUNGE</h1>
        {!user ? (
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #4fc3f7', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
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
        ) : (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button onClick={() => setStageMode('MYPAGE')} style={{ padding: '10px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>マイページ</button>
              <button onClick={onSignOut} style={{ padding: '10px 20px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>サインアウト</button>
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

            <h2 style={{ color: '#ffd700' }}>冒険者たち</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {allProfiles.map(p => {
                const isActive = !!lastActiveProfiles[p.uid];
                return (
                  <div key={p.uid} onClick={() => onViewProfile(p)} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: isActive ? '2px solid #4fc3f7' : '1px solid #444', cursor: 'pointer', position: 'relative' }}>
                    {isActive && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', backgroundColor: '#4caf50', borderRadius: '50%', boxShadow: '0 0 5px #4caf50' }} title="オンライン" />}
                    <img src={p.photoURL || 'https://via.placeholder.com/50'} alt={p.displayName} style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '10px' }} />
                    <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{p.comment}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button onClick={onBack} style={{ marginTop: '30px', marginBottom: '30px', padding: '15px 40px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>戻る</button>
      </div>
    );
  }

  if (stageMode === 'MYPAGE') {
    if (!myProfile) return (
      <div className="AppContainer" style={{ backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <div>読み込み中...</div>
        <button onClick={onBack} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>タイトルへ戻る</button>
      </div>
    );
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#4fc3f7' }}>MY PAGE</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #2196f3', width: '100%', maxWidth: '500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <img src={myProfile.photoURL || 'https://via.placeholder.com/80'} alt={myProfile.displayName} style={{ width: '80px', height: '80px', borderRadius: '50%', marginRight: '20px' }} />
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#aaa' }}>名前</label>
                <input 
                type="text" 
                value={myProfile.displayName} 
                onChange={(e) => onUpdateProfile(e.target.value, myProfile.favoriteSkill, myProfile.comment)}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
                />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>好きなスキル</label>
            <select 
              value={myProfile.favoriteSkill} 
              onChange={(e) => onUpdateProfile(myProfile.displayName, e.target.value, myProfile.comment)}
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
              onChange={(e) => onUpdateProfile(myProfile.displayName, myProfile.favoriteSkill, e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '5px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ color: '#ffd700', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>
              現在のポイント: {myProfile.points || 0} pt
          </div>
          <p style={{ fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>※入力すると自動で保存されます</p>
        </div>
        <button onClick={() => setStageMode('LOUNGE')} style={{ marginTop: '30px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>戻る</button>
      </div>
    );
  }

  if (stageMode === 'PROFILE' && viewingProfile) {
    const favSkill = getSkillByAbbr(viewingProfile.favoriteSkill);
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#ffd700' }}>PROFILE</h1>
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #ffd700', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <img src={viewingProfile.photoURL || 'https://via.placeholder.com/100'} alt={viewingProfile.displayName} style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 10px 0' }}>{viewingProfile.displayName}</h2>
          <p style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.2rem' }}>{viewingProfile.points || 0} pt</p>
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

  if (stageMode === 'RANKING') {
    const sortedByPoints = [...allProfiles].sort((a, b) => (b.points || 0) - (a.points || 0));
    return (
      <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
        <h1 style={{ color: '#ffd700' }}>RANKING</h1>
        <div style={{ width: '100%', maxWidth: '600px', background: '#1a1a1a', borderRadius: '15px', border: '2px solid #ffd700', overflow: 'hidden' }}>
            {sortedByPoints.map((p, i) => (
                <div key={p.uid} style={{ display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid #333', background: i < 3 ? 'rgba(255, 215, 0, 0.1)' : 'transparent' }}>
                    <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: 'bold', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888' }}>{i + 1}</div>
                    <img src={p.photoURL || 'https://via.placeholder.com/40'} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px' }} />
                    <div style={{ flex: 1, fontWeight: 'bold' }}>{p.displayName}</div>
                    <div style={{ color: '#ffd700', fontWeight: 'bold' }}>{p.points || 0} pt</div>
                </div>
            ))}
        </div>
        <button onClick={onBack} style={{ marginTop: '30px', marginBottom: '30px', padding: '15px 40px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>戻る</button>
      </div>
    );
  }

  return null;
};
