import React, { useState } from 'react';
import { ALL_SKILLS, STATUS_DATA } from './skillsData';

interface RuleProps {
  onClose: () => void;
}

export const Rule: React.FC<RuleProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const menuItems = [
    "どんなゲーム？",
    "スキル紹介",
    "戦闘の流れ",
    "勝敗判定",
    "ダメージの処理",
    "スキル種別",
    "状態について",
    "著作権表記"
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="rule-content-section">
            <h2>どんなゲーム？</h2>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ background: '#333', padding: '20px', borderRadius: '10px', border: '1px dashed #666', color: '#888' }}>
                    [ サンプル画像スペース ]
                </div>
            </div>
            <p style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>スキルで攻撃！相手のスキルを破壊しろ！</p>
            <p>プレイヤーと敵はそれぞれスキルを装備して戦います。攻撃スキルによって相手のスキルを一つずつ破壊していきます。</p>
            <p style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>遅い攻撃には迎撃スキル！ダメージを軽減できる！</p>
            <p>相手の攻撃よりも速い「迎撃」スキルを発動させることで、受けるダメージを無効化したり、反撃したりすることができます。</p>
            <p style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>スキルを全部破壊した方が勝ち！</p>
            <p>相手の装備している全てのスキルを破壊し、戦闘不能に追い込んだ方の勝利となります。</p>
          </div>
        );
      case 1:
        return (
          <div className="rule-content-section">
            <h2>スキル紹介</h2>
            <div style={{ height: isMobile ? 'calc(100vh - 150px)' : '400px', overflowY: 'auto', paddingRight: '10px' }}>
              {ALL_SKILLS.map(skill => (
                <div key={skill.abbr} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <img src={(process.env.PUBLIC_URL || '') + skill.icon} alt="" style={{ width: '40px', height: '40px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>{skill.name}<span style={{ fontSize: '10px', color: '#aaa', marginLeft: '8px' }}>{skill.kana}</span></div>
                      
                      <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{skill.type} / 速度: {skill.speed}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{skill.description.replace('的割', '刺突').replace('空虚', '空白').replace('衰弱', '忘却')}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="rule-content-section">
            <h2>戦闘の流れ</h2>
            <ol style={{ lineHeight: '2' }}>
              <li><strong style={{ color: '#4fc3f7' }}>準備フェイズ：</strong> お互いにスキルをセットします。</li>
              <li><strong style={{ color: '#4fc3f7' }}>発動フェイズ：</strong> セットされたスキルのうち、補助スキルなどが発動します。</li>
              <li><strong style={{ color: '#4fc3f7' }}>攻撃フェイズ：</strong> 速度の速い順に攻撃を行います。
                <ul style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  <li>速度が同じ場合は、常に<span style={{ color: '#ffeb3b' }}>プレイヤーが先攻</span>となります。</li>
                </ul>
              </li>
              <li><strong style={{ color: '#4fc3f7' }}>エンドフェイズ：</strong> ラウンドが終了し、次のラウンドへ移行します。</li>
            </ol>
          </div>
        );
      case 3:
        return (
          <div className="rule-content-section">
            <h2>勝敗判定</h2>
            <p>以下の条件で勝敗が決まります：</p>
            <ul style={{ lineHeight: '2' }}>
              <li><strong style={{ color: '#66bb6a' }}>勝利：</strong> 相手の全スキルを破壊する。</li>
              <li><strong style={{ color: '#ef5350' }}>敗北：</strong> 自分の全スキルが破壊される。</li>
              <li><strong style={{ color: '#aaa' }}>引き分け：</strong> 規定ラウンド（最大10ラウンド）終了時にお互いのスキルが残っている、または同時に全破壊された場合。</li>
            </ul>
          </div>
        );
      case 4:
        return (
          <div className="rule-content-section">
            <h2>ダメージの処理</h2>
            <p>本作では<span style={{ color: '#ef5350', fontWeight: 'bold' }}>「同時行動フェイズ」は存在しません</span>。</p>
            <p>全ての行動は速度順に処理されます。速度が同一の場合はプレイヤーが優先されます。</p>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,82,82,0.1)', borderRadius: '8px', border: '1px solid #ff5252' }}>
                攻撃がヒットすると、対象のスキルの耐久値が減少します。耐久値が0になったスキルは「破壊」され、使用不能になります。
            </div>
          </div>
        );
      case 5:
        return (
          <div className="rule-content-section">
            <h2>スキル種別</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <strong style={{ color: '#ef5350' }}>【攻撃】：</strong> 相手を攻撃し、スキルを破壊することを目的としたスキル。
                </div>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <strong style={{ color: '#66bb6a' }}>【迎撃】：</strong> 相手の攻撃に合わせて発動し、ダメージを軽減したり、無効化・反撃したりするスキル。
                </div>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <strong style={{ color: '#4fc3f7' }}>【補助】：</strong> 自分の能力を高めたり、特殊な効果を及ぼすスキル。
                </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="rule-content-section">
            <h2>状態について</h2>
            <div style={{ height: isMobile ? 'calc(100vh - 150px)' : '400px', overflowY: 'auto' }}>
              {STATUS_DATA.map(status => (
                <div key={status.name} style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <strong style={{ color: '#ffeb3b' }}>{status.name.replace('衰弱', '忘却')}：</strong>
                    <span style={{ fontSize: '0.9rem' }}>{status.description.replace('的割', '刺突').replace('空虚', '空白').replace('衰弱', '忘却')}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="rule-content-section">
            <h2>著作権表記</h2>
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <p>© 2026 Shiden Games Project</p>
                <p>All Rights Reserved.</p>
                <div style={{ marginTop: '30px', fontSize: '0.9rem', color: '#ccc' }}>
                  <p>画像：Ｒド様 (<a href="http://rpgdot3319.g1.xrea.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>http://rpgdot3319.g1.xrea.com/</a>)</p>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '30px' }}>本アプリに使用されている画像、音声等の二次配布・AI学習を禁じます。</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 20000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '0' : '20px', boxSizing: 'border-box',
      color: '#eee'
    }}>
      <div style={{
        width: '100%', maxWidth: '900px', height: isMobile ? '100%' : '600px',
        backgroundColor: '#1a1a1a', border: isMobile ? 'none' : '2px solid #4fc3f7',
        borderRadius: isMobile ? '0' : '15px', display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
        position: 'relative', boxShadow: '0 0 30px rgba(79, 195, 247, 0.3)'
      }}>
        {/* Sidebar */}
        <div style={{
          width: isMobile ? '100%' : '200px', 
          height: isMobile ? 'auto' : '100%',
          backgroundColor: '#111', borderRight: isMobile ? 'none' : '1px solid #333',
          borderBottom: isMobile ? '1px solid #333' : 'none',
          display: 'flex', flexDirection: isMobile ? 'row' : 'column', 
          flexShrink: 0, overflowX: isMobile ? 'auto' : 'hidden'
        }}>
          {!isMobile && (
            <div style={{ padding: '20px', fontWeight: 'bold', color: '#4fc3f7', borderBottom: '1px solid #333', textAlign: 'center' }}>
              RULE BOOK
            </div>
          )}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: isMobile ? 'row' : 'column',
            overflowX: isMobile ? 'auto' : 'hidden',
            overflowY: isMobile ? 'hidden' : 'auto',
            whiteSpace: isMobile ? 'nowrap' : 'normal'
          }}>
            {menuItems.map((item, index) => (
              <div
                key={index}
                onClick={() => setActiveTab(index)}
                style={{
                  padding: isMobile ? '12px 20px' : '15px 20px', 
                  cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '0.9rem',
                  backgroundColor: activeTab === index ? 'rgba(79, 195, 247, 0.1)' : 'transparent',
                  color: activeTab === index ? '#4fc3f7' : '#ccc',
                  borderLeft: (!isMobile && activeTab === index) ? '4px solid #4fc3f7' : '4px solid transparent',
                  borderBottom: (isMobile && activeTab === index) ? '3px solid #4fc3f7' : '3px solid transparent',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ 
            flex: 1, 
            padding: isMobile ? '20px' : '30px', 
            position: 'relative', 
            overflowY: 'hidden', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '15px', right: '15px',
              background: 'none', border: 'none', color: '#888',
              fontSize: '24px', cursor: 'pointer'
            }}
          >
            ×
          </button>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
