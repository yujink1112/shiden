import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from './Lounge';
import { submitBugReport } from './firebase';

type BugReportModalProps = {
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
  appVersion: string;
};

const REPORT_COOLDOWN_MS = 5 * 60 * 1000;
const REPORT_COOLDOWN_KEY = 'shiden_bug_report_last_sent_at';
const REPORT_DUPLICATE_PREFIX = 'shiden_bug_report_hash_';

const getReportFingerprint = (title: string, summary: string) => {
  const normalized = `${title.trim().toLowerCase()}::${summary.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const BugReportModal: React.FC<BugReportModalProps> = ({ onClose, user, profile, appVersion }) => {
  const [category, setCategory] = useState('進行不能・重大な不具合');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('タイトル画面');
  const [summary, setSummary] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [contact, setContact] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const reporterName = useMemo(
    () => profile?.displayName || user?.displayName || '未ログイン',
    [profile?.displayName, user?.displayName]
  );
  const canSubmit = Boolean(user?.uid);

  const handleSubmit = async () => {
    if (!user?.uid) {
      setMessageType('error');
      setMessage('不具合報告はログイン後に送信できます。荒らし対策のためご協力をお願いします。');
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedSummary = summary.trim();
    const normalizedLocation = location.trim();

    if (website.trim()) {
      setMessageType('error');
      setMessage('送信を受け付けられませんでした。時間をおいて再度お試しください。');
      return;
    }

    if (!normalizedTitle || normalizedTitle.length < 4) {
      setMessageType('error');
      setMessage('件名は4文字以上で入力してください。');
      return;
    }

    if (!normalizedLocation) {
      setMessageType('error');
      setMessage('発生箇所を入力してください。');
      return;
    }

    if (!normalizedSummary || normalizedSummary.length < 10) {
      setMessageType('error');
      setMessage('不具合内容は10文字以上で入力してください。');
      return;
    }

    if (!confirmChecked) {
      setMessageType('error');
      setMessage('送信前の確認チェックを入れてください。');
      return;
    }

    const now = Date.now();
    const lastSentAt = Number(localStorage.getItem(REPORT_COOLDOWN_KEY) || '0');
    if (lastSentAt && now - lastSentAt < REPORT_COOLDOWN_MS) {
      const remainSeconds = Math.ceil((REPORT_COOLDOWN_MS - (now - lastSentAt)) / 1000);
      setMessageType('error');
      setMessage(`連続送信を防ぐため、あと${remainSeconds}秒ほど待ってから再送してください。`);
      return;
    }

    const fingerprint = getReportFingerprint(normalizedTitle, normalizedSummary);
    const duplicateKey = `${REPORT_DUPLICATE_PREFIX}${fingerprint}`;
    const lastDuplicateAt = Number(localStorage.getItem(duplicateKey) || '0');
    if (lastDuplicateAt && now - lastDuplicateAt < 12 * 60 * 60 * 1000) {
      setMessageType('error');
      setMessage('同じ内容の送信が直近で行われています。追記がある場合は内容を補足してから送信してください。');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await submitBugReport({
        category,
        title: normalizedTitle,
        location: normalizedLocation,
        summary: normalizedSummary,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        contact,
        appVersion,
        page: 'title',
        uid: user.uid,
        displayName: profile?.displayName || user?.displayName || '',
        email: user?.email || '',
        isAuthenticated: true,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      localStorage.setItem(REPORT_COOLDOWN_KEY, String(now));
      localStorage.setItem(duplicateKey, String(now));
      setMessageType('success');
      setMessage('不具合報告を送信しました。ご協力ありがとうございます。');
      setTitle('');
      setSummary('');
      setStepsToReproduce('');
      setExpectedBehavior('');
      setActualBehavior('');
      setContact('');
      setConfirmChecked(false);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      setMessageType('error');
      setMessage(error instanceof Error && error.message === 'BUG_REPORT_AUTH_REQUIRED'
        ? '不具合報告はログイン後に送信できます。'
        : '送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.92)',
        zIndex: 60000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        color: '#eee',
        fontFamily: 'sans-serif',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '88vh',
          backgroundColor: '#161616',
          border: '2px solid #ff8a65',
          borderRadius: '16px',
          padding: '24px',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 0 32px rgba(255, 138, 101, 0.22)',
          textAlign: 'left'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
        <h2 style={{ color: '#ffab91', marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>不具合報告</h2>

        <div style={{ color: '#bbb', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '18px' }}>
          進行不能、表示崩れ、想定と違う挙動などを送れます。送信内容にはゲームのバージョン、端末情報、ログイン中の表示名が添付されます。
        </div>
        {!canSubmit && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #ef5350', background: 'rgba(198, 40, 40, 0.24)', color: '#fff', lineHeight: 1.7 }}>
            荒らし対策のため、不具合報告はユーザ登録・ログイン後のみ送信できます。
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div style={{ padding: '12px', background: '#202020', border: '1px solid #333', borderRadius: '10px' }}>
            <div style={{ color: '#ffccbc', fontSize: '0.75rem', marginBottom: '4px' }}>報告者</div>
            <div style={{ color: '#fff', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{reporterName}</div>
          </div>
          <div style={{ padding: '12px', background: '#202020', border: '1px solid #333', borderRadius: '10px' }}>
            <div style={{ color: '#ffccbc', fontSize: '0.75rem', marginBottom: '4px' }}>バージョン</div>
            <div style={{ color: '#fff', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{appVersion || '不明'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>種別</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff' }}>
              <option>進行不能・重大な不具合</option>
              <option>戦闘バランス・スキル挙動</option>
              <option>表示崩れ・UIの不具合</option>
              <option>セーブ・同期まわり</option>
              <option>ラウンジ・オンライン機能</option>
              <option>その他</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>件名</span>
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="例: 第2章 Stage3-2 で勝利後に進めない" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff' }} />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>発生箇所</span>
            <input value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} placeholder="例: タイトル画面 / 第1章 Stage5 / ラウンジ" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff' }} />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>不具合内容</span>
            <textarea value={summary} maxLength={2000} onChange={(e) => setSummary(e.target.value)} placeholder="何が起きたかをできるだけ具体的に書いてください。" style={{ minHeight: '120px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff', resize: 'vertical' }} />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>再現手順</span>
            <textarea value={stepsToReproduce} maxLength={2000} onChange={(e) => setStepsToReproduce(e.target.value)} placeholder="例: 1. ラウンジを開く 2. プロフィール更新 3. 保存後に..." style={{ minHeight: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff', resize: 'vertical' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: '#ffd180', fontWeight: 'bold' }}>期待した挙動</span>
              <textarea value={expectedBehavior} maxLength={1000} onChange={(e) => setExpectedBehavior(e.target.value)} placeholder="本来どうなる想定だったか" style={{ minHeight: '100px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff', resize: 'vertical' }} />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: '#ffd180', fontWeight: 'bold' }}>実際の挙動</span>
              <textarea value={actualBehavior} maxLength={1000} onChange={(e) => setActualBehavior(e.target.value)} placeholder="実際にはどうなったか" style={{ minHeight: '100px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff', resize: 'vertical' }} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: '#ffd180', fontWeight: 'bold' }}>連絡先や補足（任意）</span>
            <input value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} placeholder="返信先Xアカウント、メール、補足事項など" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #555', background: '#0f0f0f', color: '#fff' }} />
          </label>

          <label style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
            Webサイト
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>

          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#ddd', lineHeight: 1.6, cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} style={{ marginTop: '4px' }} />
            <span>同じ内容を短時間に連投していないこと、個人情報や誹謗中傷を含めていないことを確認しました。</span>
          </label>
        </div>

        {message && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: `1px solid ${messageType === 'success' ? '#66bb6a' : messageType === 'error' ? '#ef5350' : '#ffb74d'}`,
              background: messageType === 'success' ? 'rgba(46, 125, 50, 0.24)' : messageType === 'error' ? 'rgba(198, 40, 40, 0.24)' : 'rgba(245, 124, 0, 0.18)',
              color: '#fff'
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
          <button onClick={handleSubmit} disabled={isSubmitting || !canSubmit} style={{ padding: '12px 18px', background: (isSubmitting || !canSubmit) ? '#6d4c41' : '#ff7043', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (isSubmitting || !canSubmit) ? 'default' : 'pointer' }}>
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
          <button onClick={onClose} style={{ padding: '12px 18px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '8px', fontWeight: 'bold' }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;
