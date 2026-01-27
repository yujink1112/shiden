import React, { useState } from 'react';
import { ALL_SKILLS, STATUS_DATA } from './skillsData';

interface RuleProps {
  onClose: () => void;
}

export const Rule: React.FC<RuleProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const menuItems = [
    "どんなゲーム？",
    "スキルについて",
    "スキル一覧",
    "状態について",
    "戦闘の流れ",
    "戦闘の流れ：詳細",
    "勝敗判定",
    "ダメージの処理",
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
            <p>プレイヤーと敵はそれぞれスキルを編成して戦います。攻撃スキルによって相手のスキルを破壊していきます。</p>
            <p style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>遅い攻撃には迎撃スキル！ダメージを軽減できる！</p>
            <p>相手の攻撃よりも速い迎撃スキルを発動させることで、受けるダメージを無効化したり、反撃したりすることができます。</p>
            <p style={{ fontSize: '1.2rem', color: '#ffeb3b', fontWeight: 'bold' }}>スキルを全部破壊した方が勝ち！</p>
            <p>相手の編成している全てのスキルを破壊した方が勝利となります。</p>
          </div>
        );

      case 1:
        return (
          <div className="rule-content-section">
            <h2>スキルについて</h2>

            <div style={{ height: isMobile ? 'calc(100vh - 300px)' : '400px', overflowY: 'auto', paddingRight: '10px' }}>
            <p>プレイヤーは、スキルを編成して敵と戦っていくことになります。</p>
            <p>スキル一覧の中から<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>スキルを5つ編成して、左から順番に並べて下さい。</span>同じスキルを複数取得することも可能です。</p>
            <p>スキルには自動的に<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>レベル（以下LVと表記）</span>が割り振られます。</p>
            <p>LVはそのスキルの強さを決定するもので、先頭（左）から順番に1、2、……と割り振られます。</p>
            <p>例えば「相手にLV点のダメージを与える」【果断】というスキルをLV4の位置に置いた場合、その【果断】は「相手に4点のダメージを与える」スキルになります。</p>
            <p>つまり、多くの場合、後ろ（右）に置かれたスキルほど強力なスキルとして使用できるということです。</p>
            <p>LVが効果に影響しないスキルも存在します。</p>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                    <strong style={{ color: '#ef5350' }}>攻撃スキル</strong> 
                    <p>攻撃フェイズで使用するスキルです。</p>
                    <p>キャラクターが所持している<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>最も先頭にある</span>攻撃・補助スキルを選択して使用します。</p>
                    <p>また、先攻決定フェイズで両者の速度を比較する際にも用います。</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                    <strong style={{ color: '#66bb6a' }}>迎撃スキル</strong> 
                    <p>攻撃スキルによってダメージが与えられた時に、自動的に発動するスキルです。</p>
                    <p>あなたの迎撃スキルの速度が、<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>相手の攻撃スキルの速度以上</span>である場合に発動します。</p>
                    <p>迎撃スキルが発動した時、<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>攻撃スキルによるダメージの処理を強制的に中断します。</span></p>
                    <p>迎撃スキルによってダメージを与えられたスキルは、迎撃スキルを発動させた攻撃スキルによってダメージを与えられたスキルと同時に破壊されます。</p>
                    <p>詳しい処理は、「ダメージの処理」を参照してください。</p>

            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                    <strong style={{ color: '#4fc3f7' }}>補助スキル</strong> 
                    <p>攻撃フェイズで使用するスキルです。</p>
                    <p>キャラクターが所持している<span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>最も先頭にある</span>攻撃・補助スキルを選択して使用します。</p>
                    <p>また、先攻決定フェイズで両者の速度を比較する際にも用います。</p>
                    <p>攻撃スキルとは、ダメージを与える効果があるかどうかで区別されます。</p>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                    <strong style={{ color: '#ffeb3b' }}>付帯スキル</strong> 
                    <p>特に記載がない場合、戦闘中常に効果を発揮しているスキルです。</p>
                    <p>効果を発揮するタイミングについて記載がある場合、その記述に従います。</p>
                    <p>破壊された時点でスキルの効果は発揮されなくなります。</p>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                    <strong style={{ color: '#de63fd' }}>リミテッド</strong> 
                    <p>スキルの種別に（リミテッド）が付いている場合、そのスキルが「リミテッドである」ことを表します。</p>
                    <p>リミテッドであるスキルは、使用あるいは効果を発揮したラウンドの終了フェイズに破壊されます。</p>
            </div>

          </div>
          
        );
      case 2:
        return (
          <div className="rule-content-section">
            <h2>スキル一覧</h2>
            <div style={{ height: isMobile ? 'calc(100vh - 150px)' : '450px', overflowY: 'auto', paddingRight: '10px' }}>

            
              {ALL_SKILLS.map(skill => (
                <div key={skill.abbr} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <img src={(process.env.PUBLIC_URL || '') + skill.icon} alt="" style={{ width: '40px', height: '40px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>{skill.name}<span style={{ fontSize: '10px', color: '#aaa', marginLeft: '8px' }}>{skill.kana}</span></div>
                      
                      <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{skill.type} / 速度: {skill.speed}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{skill.description}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="rule-content-section">
            <h2>状態について</h2>
            <div style={{ height: isMobile ? 'calc(100vh - 150px)' : '400px', overflowY: 'auto' }}>
              {STATUS_DATA.map(status => (
                <div key={status.name} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <img src={(process.env.PUBLIC_URL || '') + status.icon} alt="" style={{ width: '40px', height: '40px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: status.type == 0 ? '#4fc3f7' : '#ef5350'}}>{status.name}<span style={{ fontSize: '10px', color: '#aaa', marginLeft: '8px' }}>{status.kana}</span></div>

                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{status.description}</div>
                </div>

              ))}
            </div>
          </div>
        );
     case 4:
        const slideImages = Array.from({ length: 6 }, (_, i) => `${process.env.PUBLIC_URL}/images/rule/introduction/スライド${i + 1}.PNG`);
        return (
          <div className="rule-content-section">
            <h2>戦闘の流れ</h2>
            <div style={{
              height: isMobile ? 'calc(100vh - 50px)' : '450px',
              overflowY: 'auto',
              paddingRight: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {slideImages.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`戦闘の流れ スライド${index + 1}`}
                  style={{
                    width: isMobile ? '90%' : '90%',
                    maxWidth: '800px',
                    height: 'auto',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                    border: '1px solid #4fc3f7'
                  }}
                />
              ))}
            </div>
          </div>);

       case 5:
         return (
           <div className="rule-content-section">
             <h2>戦闘の流れ：詳細</h2>
             <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>①開始フェイズ</div>
            <p>開始フェイズに効果を発揮するスキルの処理を行います。</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>

            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>②先攻決定フェイズ</div>
            <p>両者が所持している先頭の攻撃・補助スキルの速度を比較します。</p>
            <p>攻撃・補助スキルを所持していないキャラクターの速度は、自動的に0となります。</p>
            <p>速度が大きい方が先攻、小さい方が後攻となります。速度が同値である場合、プレイヤーの先攻となります。</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>

            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>③-a　攻撃フェイズ：先攻</div>
            <p>先攻を得たキャラクターは、自身が所持している先頭の攻撃・補助スキルを選択して使用します。</p>

            <p>キャラクターが攻撃・補助スキルを所持していない場合、自動的に【弱撃】のスキルを使用します。</p>
            <p>この時に使用する【弱撃】は、LV0に属するスキルです。
            <p>このスキルはキャラクターが「所持する」スキルに含まれません（状態「覚悟」「逆鱗」の効果を受けません）。</p>
            <p></p>また、例外的に【交錯】などのスキルによって破壊されることがなく、勝敗判定にも影響しません。</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>

            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>③-b　攻撃フェイズ：後攻</div>
            <p>後攻を得たキャラクターは、自身が所持している先頭の攻撃・補助スキルを選択して使用します。</p>
            <p>キャラクターが攻撃・補助スキルを所持していない場合、自動的に【弱撃】のスキルを使用します。</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #4fc3f7' }}>

             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4fc3f7' }}>④終了フェイズ</div>
              <p>以下の順番に従って処理を行います。</p>

              <p>ⅰ. 終了フェイズに解除される状態の解除</p>
              <p>ⅱ. 【影討】の指定スキル・リミテッドスキルの破壊</p>
              <p>ⅲ. 状態「忘却」の処理</p>
          </div>
        </div>);
      case 6:
        return (
          <div className="rule-content-section">
            <h2>勝敗判定</h2>
            <p>攻撃フェイズ、終了フェイズの終了時点で、所持スキルが全て破壊されているキャラクターは敗北します。</p>
            <p>両者の所持スキルが全て破壊されている場合、攻撃フェイズ終了時点であるならば、<span style={{ color: '#ffeb3b' }}>攻撃権を持っているキャラクターの敗北</span>となります。</p>
          </div>
        );
      case 7:
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
      
      case 8:
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
