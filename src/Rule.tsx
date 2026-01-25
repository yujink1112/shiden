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
            <div className="TitleLogoWrapper"><img src={process.env.PUBLIC_URL + '/images/title/titlelogo.png'} alt="紫電一閃" className="TitleLogo" /></div>
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
              <li><strong style={{ color: '#aaa' }}>引き分け：</strong> 両者のスキルが全て同時に破壊される。</li>
            </ul>
          </div>
        );
      case 4:
        return (
          <div className="rule-content-section">
            <h2>ダメージの処理</h2>

            <p>このゲームにおいて、<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>スキルが発生させるダメージは、スキルに対して与えられます。</span>ダメージを与えられたスキルは破壊されます。</p>
            <p>スキルに書かれている<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>「X点のダメージを与える」という効果は、「相手のスキルをX個破壊する」ことを意味します</span>（迎撃スキルなどの効果で破壊できないこともあります）。
            破壊されたスキルは戦闘から除外され、使用することも効果を発揮することも出来なくなり、ダメージの対象にもならなくなります。</p>
            <p>破壊されたスキルのスペースは空白として残り、先頭に詰めるなどといったスキルの移動は発生しません。</p>
            <p>特別な記載がない限り、<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>ダメージの対象は「ダメージ処理中のスキルがダメージを与えていない先頭のスキル」です。</span></p>

            <p>ダメージの処理は、以下の手順で行います。</p>
            <div style={{ marginBottom: '10px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
              <p>① ダメージの対象となったスキルにダメージカウンタを置く（以後この行為を「スキルにダメージを与える」と表記する）。</p>
              <p>② ダメージを与えたスキルが迎撃スキルであり、かつ迎撃スキルの発動条件を満たしているならば、迎撃スキルが発生させたダメージの処理を行った後にダメージの処理を中断する。</p>
              <p>③ （スキルが発生させたダメージ）回①～②を繰り返す。</p>
              <p>④ 両者のスキルにダメージ以外の効果があれば、その処理を行う。</p>
              <p>⑤ ダメージを与えられた両者のスキルを全て破壊する。</p>
            </div>

          </div>
        );
      case 5:
        return (
          <div className="rule-content-section">
            <h2>スキル種別</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                    <strong style={{ color: '#ef5350' }}>攻撃スキル</strong> 
                    <p>攻撃フェイズで使用するスキルです。</p>
                    <p>キャラクターが所持している最も先頭にある攻撃・補助スキルを選択して使用します。</p>
                    <p>また、先攻決定フェイズで両者の速度を比較する際にも用います。</p>
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
