import React, { useEffect, useState } from 'react';
import { ref, onValue } from "firebase/database";
import { database, getStorageUrl } from "./firebase";
import { SkillDetail } from './skillsData';

interface AdminAnalyticsProps {
  onBack: () => void;
  getSkillByAbbr: (abbr: string) => SkillDetail | undefined;
}

interface VictoryData {
  stageKey: string;
  skills: string[];
  uid?: string;
  isAnonymous: boolean;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onBack, getSkillByAbbr }) => {
  const [totalAccess, setTotalAccess] = useState<number>(0);
  const [victories, setVictories] = useState<VictoryData[]>([]);
  const [kenjuClearData, setKenjuClearData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const totalAccessRef = ref(database, 'totalAccess');
    const profilesRef = ref(database, 'profiles');
    const anonymousVictoriesRef = ref(database, 'anonymousVictories');
    const kenjuClearsRef = ref(database, 'kenjuClears');

    const unsubscribeTotalAccess = onValue(totalAccessRef, (snapshot) => {
      if (isMounted) setTotalAccess(snapshot.val() || 0);
    });

    const unsubscribeProfiles = onValue(profilesRef, (snapshot) => {
      const allVictories: VictoryData[] = [];
      if (snapshot.exists()) {
        const profiles = snapshot.val();
        Object.keys(profiles).forEach(uid => {
          const profile = profiles[uid];
          if (profile && profile.victorySkills) {
            Object.keys(profile.victorySkills).forEach(stageKey => {
              const skills = profile.victorySkills[stageKey];
              if (Array.isArray(skills)) {
                allVictories.push({
                  stageKey,
                  skills: skills,
                  uid,
                  isAnonymous: false
                });
              }
            });
          }
        });
      }
      
      if (isMounted) {
          setVictories(prev => {
            const anonymous = prev.filter(v => v.isAnonymous);
            return [...allVictories, ...anonymous];
          });
      }
    });

    const unsubscribeAnonymous = onValue(anonymousVictoriesRef, (snapshot) => {
      const allVictories: VictoryData[] = [];
      if (snapshot.exists()) {
        const visitors = snapshot.val();
        Object.keys(visitors).forEach(visitorId => {
          const visitorVictories = visitors[visitorId];
          if (visitorVictories && typeof visitorVictories === 'object') {
            Object.keys(visitorVictories).forEach(stageKey => {
              const skills = visitorVictories[stageKey];
              if (Array.isArray(skills)) {
                allVictories.push({
                  stageKey,
                  skills: skills,
                  isAnonymous: true
                });
              }
            });
          }
        });
      }

      if (isMounted) {
          setVictories(prev => {
            const registered = prev.filter(v => !v.isAnonymous);
            return [...registered, ...allVictories];
          });
      }
    });

    const unsubscribeKenjuClears = onValue(kenjuClearsRef, (snapshot) => {
      if (isMounted) {
          setKenjuClearData(snapshot.val() || {});
          setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeTotalAccess();
      unsubscribeProfiles();
      unsubscribeAnonymous();
      unsubscribeKenjuClears();
    };
  }, []);

  const getStageStats = () => {
    const stats: { [key: string]: { count: number, compositions: string[][] } } = {};
    victories.forEach(v => {
      if (!stats[v.stageKey]) {
        stats[v.stageKey] = { count: 0, compositions: [] };
      }
      stats[v.stageKey].count += 1;
      stats[v.stageKey].compositions.push(v.skills);
    });
    return stats;
  };

  const stats = getStageStats();
  const sortedStageKeys = Object.keys(stats).sort((a, b) => {
    // Stage_X or BOSS_X or MID_X or KENJU_X
    const getNum = (s: string) => {
      const m = s.match(/\d+/);
      return m ? parseInt(m[0], 10) : 999;
    };
    return getNum(a) - getNum(b);
  });

  return (
    <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
      <h1 style={{ color: '#8e24aa', marginBottom: '30px' }}>管理者分析パネル</h1>
      
      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #8e24aa', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff' }}>基本統計</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '10px' }}>
          <div style={{ background: '#222', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>総アクセス数 (訪問者)</div>
            <div style={{ color: '#8e24aa', fontSize: '2rem', fontWeight: 'bold' }}>{totalAccess}</div>
          </div>
          <div style={{ background: '#222', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>総クリア記録数</div>
            <div style={{ color: '#8e24aa', fontSize: '2rem', fontWeight: 'bold' }}>{victories.length}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #8e24aa', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>ステージ別クリア統計</h2>
        {loading ? <p style={{ color: '#fff' }}>読み込み中...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sortedStageKeys.map(key => (
              <div key={key} style={{ background: '#222', padding: '15px', borderRadius: '10px', borderLeft: '5px solid #8e24aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ color: '#ffd700', margin: 0 }}>{key}</h3>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>クリア回数: {stats[key].count}</span>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>最近のクリア構成 (最大5件)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {stats[key].compositions.slice(-5).reverse().map((comp, i) => (
                      <div key={i} style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', background: '#111', padding: '5px', borderRadius: '4px' }}>
                        {comp.map((abbr, j) => {
                          const skill = getSkillByAbbr(abbr);
                          return skill ? (
                            <img 
                              key={j} 
                              src={getStorageUrl(skill.icon)} 
                              alt={abbr} 
                              title={skill.name} 
                              style={{ width: '24px', height: '24px', border: '1px solid #444', borderRadius: '3px' }} 
                            />
                          ) : <span key={j} style={{ color: '#fff', fontSize: '10px' }}>{abbr}</span>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #8e24aa', width: '100%', maxWidth: '1000px', marginBottom: '40px' }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>剣獣クリア履歴 (kenjuClears)</h2>
        <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
          {Object.keys(kenjuClearData).map(date => (
            <div key={date} style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#4fc3f7', borderBottom: '1px solid #333', paddingBottom: '5px' }}>{date}</h4>
              {Object.keys(kenjuClearData[date]).map(bossName => (
                <div key={bossName} style={{ marginLeft: '10px', marginBottom: '5px' }}>
                  {bossName}: {Object.keys(kenjuClearData[date][bossName]).length}人クリア
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onBack} style={{ marginBottom: '50px', padding: '15px 60px', background: '#333', color: '#fff', border: '2px solid #8e24aa', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>戻る</button>
    </div>
  );
};
