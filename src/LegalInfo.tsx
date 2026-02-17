import React from 'react';

const LegalInfo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 60000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box', color: '#eee',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '100%', maxWidth: '800px', maxHeight: '85vh',
        backgroundColor: '#1a1a1a', border: '2px solid #4fc3f7',
        borderRadius: '15px', padding: '30px', overflowY: 'auto',
        position: 'relative', boxShadow: '0 0 30px rgba(79, 195, 247, 0.3)',
        textAlign: 'left'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
        
        <h2 style={{ color: '#4fc3f7', marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>規約・運営情報</h2>

        <section style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#ffd700', fontSize: '1.1rem' }}>利用規約</h3>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ccc' }}>
            <p>本規約は、Shiden Gamesが提供するサービス「紫電一閃」（以下「本サービス」）の利用条件を定めるものです。</p>
            <ul>
              <li>利用者は、本規約に従って本サービスを利用するものとします。</li>
              <li>本サービス内のコンテンツ（画像、プログラム等）の無断転載・再配布を禁じます。</li>
              <li>他者への誹謗中傷や、公序良俗に反する内容の投稿（プロフィール等）を禁じます。</li>
              <li>本サービスは予告なく内容の変更、停止を行う場合があります。</li>
              <li>本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#ffd700', fontSize: '1.1rem' }}>プライバシーポリシー</h3>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ccc' }}>
            <p>本サービスでは、以下の通り個人情報およびデータの取り扱いを行います。</p>
            <ul>
              <li><strong>取得情報：</strong>メールアドレス（認証用）、Googleアカウントの公開情報（表示名・画像URL）、およびゲーム内のプレイデータ。</li>
              <li><strong>利用目的：</strong>ユーザーの識別、ランキング表示、およびサービス改善。</li>
              <li><strong>第三者提供：</strong>法令に基づく場合を除き、ユーザーの同意なく第三者に提供することはありません。</li>
              <li><strong>広告について：</strong>本サービスでは、第三者配信による広告サービス（Google AdSense）を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#ffd700', fontSize: '1.1rem' }}>特定商取引法に基づく表記 / 運営情報</h3>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ccc' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333', width: '120px', color: '#888' }}>運営者名</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>Shiden Games (個人)</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333', color: '#888' }}>活動拠点</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>日本国内</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333', color: '#888' }}>お問い合わせ</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                    公式X（旧Twitter）: <a href="https://x.com/ShidenGames" target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>@ShidenGames</a>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333', color: '#888' }}>対価</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>本サービスは原則無料で利用可能です。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <button onClick={onClose} style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#4fc3f7', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>閉じる</button>
      </div>
    </div>
  );
};

export default LegalInfo;
