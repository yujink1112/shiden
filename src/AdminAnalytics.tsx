import React from 'react';

interface AdminAnalyticsProps {
  onBack: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onBack }) => {
  return (
    <div className="AppContainer" style={{ backgroundColor: '#000', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowY: 'auto' }}>
      <h1 style={{ color: '#8e24aa' }}>管理者分析パネル</h1>
      <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '2px solid #8e24aa', width: '100%', maxWidth: '800px', textAlign: 'center' }}>
        <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '20px' }}>ここに分析情報が表示されます。</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 30px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>マイページに戻る</button>
      </div>
    </div>
  );
};
