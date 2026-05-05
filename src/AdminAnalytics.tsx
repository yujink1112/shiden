import React, { useEffect, useMemo, useState } from 'react';
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
  playerName?: string;
}

interface DailyMetricsState {
  accesses: Record<string, { total?: number }>;
  battles: Record<string, { total?: number; byMode?: Record<string, number> }>;
}

type AnalyticsTab = 'overview' | 'dailyMetrics' | 'chapter2Builds' | 'stageStats' | 'kenju';

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onBack, getSkillByAbbr }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [totalAccess, setTotalAccess] = useState<number>(0);
  const [victories, setVictories] = useState<VictoryData[]>([]);
  const [kenjuClearData, setKenjuClearData] = useState<any>({});
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricsState>({ accesses: {}, battles: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let pendingLoads = 4;
    const finishLoad = () => {
      pendingLoads -= 1;
      if (isMounted && pendingLoads <= 0) {
        setLoading(false);
      }
    };

    const totalAccessRef = ref(database, 'totalAccess');
    const profilesRef = ref(database, 'profiles');
    const anonymousVictoriesRef = ref(database, 'anonymousVictories');
    const kenjuClearsRef = ref(database, 'kenjuClears');
    const dailyMetricsRef = ref(database, 'dailyMetrics');

    const unsubscribeTotalAccess = onValue(totalAccessRef, (snapshot) => {
      if (isMounted) setTotalAccess(snapshot.val() || 0);
    });

    const unsubscribeProfiles = onValue(profilesRef, (snapshot) => {
      const allVictories: VictoryData[] = [];

      if (snapshot.exists()) {
        const profiles = snapshot.val();
        Object.keys(profiles).forEach(uid => {
          const profile = profiles[uid];
          let hasFinalChapter2VictoryInVictorySkills = false;
          if (profile && profile.victorySkills) {
            Object.keys(profile.victorySkills).forEach(stageKey => {
              const skills = profile.victorySkills[stageKey];
              if (Array.isArray(skills)) {
                if (stageKey === 'CH2_12_3') {
                  hasFinalChapter2VictoryInVictorySkills = true;
                }
                allVictories.push({
                  stageKey,
                  skills,
                  uid,
                  isAnonymous: false,
                  playerName: profile?.displayName || '名無しの剣士'
                });
              }
            });
          }

          const finalClearSkills = profile?.chapter2?.finalClearRecord?.skillAbbrs;
          if (!hasFinalChapter2VictoryInVictorySkills && Array.isArray(finalClearSkills) && finalClearSkills.length > 0) {
            allVictories.push({
              stageKey: 'CH2_12_3',
              skills: finalClearSkills,
              uid,
              isAnonymous: false,
              playerName: profile?.displayName || '名無しの剣士'
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

      finishLoad();
    }, () => finishLoad());

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
                  skills,
                  isAnonymous: true,
                  playerName: '匿名ユーザー'
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

      finishLoad();
    }, () => finishLoad());

    const unsubscribeKenjuClears = onValue(kenjuClearsRef, (snapshot) => {
      if (isMounted) {
        setKenjuClearData(snapshot.val() || {});
      }
      finishLoad();
    }, () => finishLoad());

    const unsubscribeDailyMetrics = onValue(dailyMetricsRef, (snapshot) => {
      const value = snapshot.val() || {};
      if (isMounted) {
        setDailyMetrics({
          accesses: value.accesses || {},
          battles: value.battles || {}
        });
      }
      finishLoad();
    }, () => finishLoad());

    return () => {
      isMounted = false;
      unsubscribeTotalAccess();
      unsubscribeProfiles();
      unsubscribeAnonymous();
      unsubscribeKenjuClears();
      unsubscribeDailyMetrics();
    };
  }, []);

  const stats = useMemo(() => {
    const result: { [key: string]: { count: number, compositions: string[][] } } = {};
    victories.forEach(v => {
      if (!result[v.stageKey]) {
        result[v.stageKey] = { count: 0, compositions: [] };
      }
      result[v.stageKey].count += 1;
      result[v.stageKey].compositions.push(v.skills);
    });
    return result;
  }, [victories]);

  const sortedStageKeys = useMemo(() => {
    return Object.keys(stats).sort((a, b) => {
      const getNum = (s: string) => {
        const m = s.match(/\d+/);
        return m ? parseInt(m[0], 10) : 999;
      };
      return getNum(a) - getNum(b);
    });
  }, [stats]);

  const dailyMetricsRows = useMemo(() => {
    const dateKeys = Array.from(new Set([
      ...Object.keys(dailyMetrics.accesses || {}),
      ...Object.keys(dailyMetrics.battles || {})
    ])).sort((a, b) => a.localeCompare(b));

    return dateKeys.map(date => {
      const accessTotal = dailyMetrics.accesses?.[date]?.total || 0;
      const battleEntry = dailyMetrics.battles?.[date];
      const battleTotal = battleEntry?.total || 0;
      return {
        date,
        accessTotal,
        battleTotal,
        storyBattles: battleEntry?.byMode?.story || 0,
        kenjuBattles: battleEntry?.byMode?.kenju || 0,
        deneiBattles: battleEntry?.byMode?.denei || 0,
        otherBattles: battleEntry?.byMode?.other || 0
      };
    });
  }, [dailyMetrics]);

  const recentDailyMetricsRows = useMemo(
    () => dailyMetricsRows.slice(-30).reverse(),
    [dailyMetricsRows]
  );

  const recentChartRows = useMemo(
    () => recentDailyMetricsRows.slice().reverse(),
    [recentDailyMetricsRows]
  );

  const chapter2BattleStats = useMemo(() => {
    const groups: Record<string, { label: string; count: number; compositions: { skills: string[]; playerName: string }[]; stageNo: number; battleNo: number }> = {};

    victories.forEach((victory) => {
      const match = victory.stageKey.match(/^CH2_(\d+)_(\d+)$/);
      if (!match) return;

      const stageNo = parseInt(match[1], 10);
      const battleNo = parseInt(match[2], 10);
      const groupKey = `CH2_${stageNo}_${battleNo}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          label: `Stage${stageNo}-${battleNo}`,
          count: 0,
          compositions: [],
          stageNo,
          battleNo
        };
      }

      groups[groupKey].count += 1;
      groups[groupKey].compositions.push({
        skills: victory.skills,
        playerName: victory.playerName || (victory.isAnonymous ? '匿名ユーザー' : '名無しの剣士')
      });
    });

    return Object.values(groups).sort((a, b) => {
      if (a.stageNo !== b.stageNo) return a.stageNo - b.stageNo;
      return a.battleNo - b.battleNo;
    });
  }, [victories]);

  const accessMax = Math.max(...recentDailyMetricsRows.map(row => row.accessTotal), 1);
  const battleMax = Math.max(...recentDailyMetricsRows.map(row => row.battleTotal), 1);
  const kenjuDates = Object.keys(kenjuClearData || {}).sort((a, b) => b.localeCompare(a));

  const renderSkillsRow = (skillAbbrs: string[], size: number, keyPrefix: string) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {skillAbbrs.map((abbr, index) => {
        const skill = getSkillByAbbr(abbr);
        return skill ? (
          <img
            key={`${keyPrefix}-${abbr}-${index}`}
            src={getStorageUrl(skill.icon)}
            alt={skill.name}
            title={`${skill.name} (${abbr})`}
            style={{ width: `${size}px`, height: `${size}px`, borderRadius: '6px', border: '1px solid #555', background: '#111' }}
          />
        ) : (
          <div
            key={`${keyPrefix}-${abbr}-${index}`}
            style={{ width: `${size}px`, height: `${size}px`, borderRadius: '6px', border: '1px solid #555', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
          >
            {abbr}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
      <h1 style={{ color: '#8e24aa', marginBottom: '20px' }}>管理者分析パネル</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
        {[
          { key: 'overview' as const, label: '基本統計', color: '#8e24aa' },
          { key: 'dailyMetrics' as const, label: '日次指標', color: '#80cbc4' },
          { key: 'chapter2Builds' as const, label: '第2章クリア構成', color: '#ffd54f' },
          { key: 'stageStats' as const, label: 'ステージ別統計', color: '#ba68c8' },
          { key: 'kenju' as const, label: '剣獣履歴', color: '#64b5f6' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              border: `1px solid ${tab.color}`,
              background: activeTab === tab.key ? tab.color : 'transparent',
              color: activeTab === tab.key ? '#111' : tab.color,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
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
            <div style={{ background: '#222', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>第2章戦闘クリア構成数</div>
              <div style={{ color: '#ffd54f', fontSize: '2rem', fontWeight: 'bold' }}>{chapter2BattleStats.reduce((sum, item) => sum + item.count, 0)}</div>
            </div>
            <div style={{ background: '#222', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>日次データ件数</div>
              <div style={{ color: '#80cbc4', fontSize: '2rem', fontWeight: 'bold' }}>{dailyMetricsRows.length}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dailyMetrics' && (
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #80cbc4', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', marginBottom: '12px' }}>日次訪問数 / 戦闘数</h2>
          <div style={{ color: '#bbb', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.6 }}>
            訪問数はその日その端末で最初のアクセス時に1件、戦闘数は実際に開始された戦闘回数です。表示は直近30日です。
          </div>
          {loading ? <p style={{ color: '#fff' }}>読み込み中...</p> : recentDailyMetricsRows.length === 0 ? (
            <div style={{ color: '#888', padding: '20px 0', textAlign: 'center' }}>まだ日次データはありません。</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: '#152226', border: '1px solid #2f5f60', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ color: '#b2dfdb', fontWeight: 'bold', marginBottom: '10px' }}>日別訪問数</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '160px' }}>
                    {recentChartRows.map(row => {
                      const barHeight = `${Math.max((row.accessTotal / accessMax) * 100, row.accessTotal > 0 ? 6 : 0)}%`;
                      return (
                        <div key={`access-${row.date}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{ color: '#d9fffb', fontSize: '0.68rem', marginBottom: '4px' }}>{row.accessTotal}</div>
                          <div title={`${row.date}: ${row.accessTotal}`} style={{ width: '100%', maxWidth: '18px', height: barHeight, background: 'linear-gradient(180deg, #80cbc4, #26a69a)', borderRadius: '999px 999px 0 0' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: '#201a12', border: '1px solid #6d5530', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ color: '#ffe0b2', fontWeight: 'bold', marginBottom: '10px' }}>日別戦闘数</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '160px' }}>
                    {recentChartRows.map(row => {
                      const barHeight = `${Math.max((row.battleTotal / battleMax) * 100, row.battleTotal > 0 ? 6 : 0)}%`;
                      return (
                        <div key={`battle-${row.date}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{ color: '#fff5e1', fontSize: '0.68rem', marginBottom: '4px' }}>{row.battleTotal}</div>
                          <div title={`${row.date}: ${row.battleTotal}`} style={{ width: '100%', maxWidth: '18px', height: barHeight, background: 'linear-gradient(180deg, #ffcc80, #fb8c00)', borderRadius: '999px 999px 0 0' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto', background: '#111', border: '1px solid #2b2b2b', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead>
                    <tr style={{ background: '#1a1a1a', color: '#d7fffa' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #333' }}>日付</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>訪問数</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>戦闘数</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>本編</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>剣獣</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>電影</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #333' }}>その他</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDailyMetricsRows.map(row => (
                      <tr key={`metrics-row-${row.date}`} style={{ borderBottom: '1px solid #262626' }}>
                        <td style={{ padding: '10px', color: '#fff' }}>{row.date}</td>
                        <td style={{ padding: '10px', color: '#80cbc4', textAlign: 'right', fontWeight: 'bold' }}>{row.accessTotal}</td>
                        <td style={{ padding: '10px', color: '#ffcc80', textAlign: 'right', fontWeight: 'bold' }}>{row.battleTotal}</td>
                        <td style={{ padding: '10px', color: '#ddd', textAlign: 'right' }}>{row.storyBattles}</td>
                        <td style={{ padding: '10px', color: '#ddd', textAlign: 'right' }}>{row.kenjuBattles}</td>
                        <td style={{ padding: '10px', color: '#ddd', textAlign: 'right' }}>{row.deneiBattles}</td>
                        <td style={{ padding: '10px', color: '#777', textAlign: 'right' }}>{row.otherBattles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'chapter2Builds' && (
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ffd54f', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', marginBottom: '12px' }}>第2章クリア時の保存編成</h2>
          <div style={{ color: '#bbb', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.6 }}>
            第2章の各戦闘について、クリア時に保存された編成を戦闘ごとにまとめて表示します。
          </div>
          {loading ? <p style={{ color: '#fff' }}>読み込み中...</p> : chapter2BattleStats.length === 0 ? (
            <div style={{ color: '#888', padding: '20px 0', textAlign: 'center' }}>まだ保存された第2章戦闘クリア構成はありません。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chapter2BattleStats.map(entry => (
                <div key={entry.label} style={{ background: '#161616', border: '1px solid #5d4d16', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ color: '#fff7d6', fontWeight: 'bold', fontSize: '1rem' }}>{entry.label}</div>
                    <div style={{ color: '#d7be6f', fontSize: '0.82rem', fontWeight: 'bold' }}>クリア記録数: {entry.count}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {entry.compositions.slice(-8).reverse().map((composition, index) => (
                      <div key={`${entry.label}-${index}`} style={{ background: '#111', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ color: '#aaa', fontSize: '0.78rem', marginBottom: '8px' }}>{composition.playerName}</div>
                        {renderSkillsRow(composition.skills, 32, `chapter2-battle-${entry.label}-${index}`)}
                      </div>
                    ))}
                    {entry.compositions.length > 8 && (
                      <div style={{ color: '#777', fontSize: '0.76rem', textAlign: 'right' }}>
                        直近8件を表示
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stageStats' && (
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #ba68c8', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
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
                    <h4 style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '8px' }}>最近のクリア構成 (最大5件)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stats[key].compositions.slice(-5).reverse().map((comp, i) => (
                        <div key={`${key}-${i}`} style={{ background: '#111', padding: '8px', borderRadius: '6px' }}>
                          {renderSkillsRow(comp, 24, `victory-${key}-${i}`)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'kenju' && (
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid #64b5f6', width: '100%', maxWidth: '1000px', marginBottom: '40px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>剣獣クリア履歴 (kenjuClears)</h2>
          {loading ? <p style={{ color: '#fff' }}>読み込み中...</p> : (
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              {kenjuDates.length === 0 ? (
                <div style={{ color: '#888', padding: '20px 0', textAlign: 'center' }}>まだ剣獣クリア履歴はありません。</div>
              ) : (
                kenjuDates.map(date => (
                  <div key={date} style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#4fc3f7', borderBottom: '1px solid #333', paddingBottom: '5px' }}>{date}</h4>
                    {Object.keys(kenjuClearData[date]).map(bossName => (
                      <div key={bossName} style={{ marginLeft: '10px', marginBottom: '5px' }}>
                        {bossName}: {Object.keys(kenjuClearData[date][bossName]).length}人クリア
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={onBack} style={{ marginBottom: '50px', padding: '15px 60px', background: '#333', color: '#fff', border: '2px solid #8e24aa', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>戻る</button>
    </div>
  );
};
