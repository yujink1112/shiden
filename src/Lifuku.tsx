import React, { useRef, useEffect, useState } from 'react';
import { STAGE_DATA, KENJU_DATA } from './stageData';

// 広告（剣獣やボス）情報を表示するコンポーネント
const AdCard: React.FC<{ 
  getStorageUrl?: (path: string) => string, 
  mode: 'kenju' | 'boss',
  bossInfo?: { name: string, image: string, background?: string }
}> = ({ getStorageUrl, mode, bossInfo }) => {
  // 本日の剣獣を生成（App.tsxと同じロジック）
  const generateDailyKenju = () => {
    const today = new Date();
    const day = today.getDay();
    const index = (day + 6) % 7;
    return KENJU_DATA[index % KENJU_DATA.length] || KENJU_DATA[0];
  };

  const currentKenju = generateDailyKenju();
  
  const displayInfo = mode === 'kenju' ? {
    title: '本日の剣獣はこちら！',
    subtitle: '※遊ぶにはユーザ登録が必要です。',
    name: currentKenju.name,
    image: currentKenju.image,
    background: currentKenju.background
  } : {
    title: '現在のステージボス',
    subtitle: '立ちはだかる強敵を打ち破れ！',
    name: bossInfo?.name || '???',
    image: bossInfo?.image || '',
    background: bossInfo?.background || ''
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '250px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '10px',
      padding: '20px',
      boxSizing: 'border-box',
      border: `2px solid ${mode === 'kenju' ? '#ad1457' : '#0288d1'}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${getStorageUrl && displayInfo.background ? getStorageUrl(displayInfo.background) : ''})`,
        backgroundSize: 'cover',
        opacity: 0.3,
        zIndex: 0
      }} />
      
      <div style={{ zIndex: 1, textAlign: 'center' }}>
        <div style={{ color: mode === 'kenju' ? '#ff80ab' : '#4fc3f7', fontSize: '0.8rem', marginBottom: '5px', fontWeight: 'bold' }}>{displayInfo.title}</div>
        <div style={{ color: '#aaa', fontSize: '0.6rem', marginBottom: '10px' }}>{displayInfo.subtitle}</div>
        <img
          src={getStorageUrl ? getStorageUrl(displayInfo.image) : displayInfo.image}
          alt={displayInfo.name}
          style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }}
        />
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', textShadow: '0 0 5px #000' }}>
          {displayInfo.name}
        </div>
      </div>
    </div>
  );
};

interface Point {
  x: number;
  y: number;
}

class LifukuEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  va: number; // 角度の速度
  isRed: boolean = false;
  isBig: boolean = false;
  id: number;
  gravity: number = 0.08; // 0.25 / 3
  friction: number = 0.98;
  bounce: number = 0.7;

  constructor(x: number, y: number, id: number, isBig: boolean = false) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.isBig = isBig;
    // PC版もモバイル版のサイズ（48）に統一し、不公平感を解消
    const baseRadius = 48;
    this.radius = isBig ? baseRadius * 2 : baseRadius;
    
    const initialAngle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(initialAngle) * speed;
    this.vy = Math.sin(initialAngle) * speed;
    this.angle = 0;
    this.va = (Math.random() - 0.5) * 0.2;
  }

  update(width: number, height: number, inverted: boolean = false, zeroG: boolean = false) {
    // 重力適用
    if (!zeroG) {
      this.vy += inverted ? -this.gravity : this.gravity;
    }
    
    // 摩擦（空気抵抗）
    // 無重力モードでは摩擦を極限まで減らして停滞を防ぐ
    const currentFriction = zeroG ? 0.998 : this.friction;
    this.vx *= currentFriction;
    this.vy *= currentFriction;

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.va;

    // 回転速度も徐々に減衰
    this.va *= 0.99;

    // 壁判定
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -this.bounce;
      this.va = -this.vy * 0.05; // 衝突時に回転
    } else if (this.x > width - this.radius) {
      this.x = width - this.radius;
      this.vx *= -this.bounce;
      this.va = this.vy * 0.05;
    }

    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -this.bounce;
      if (inverted || zeroG) {
        this.vx *= 0.95; // 天井/無重力時の上端摩擦
        this.va *= 0.9;  // 回転停止
        if (Math.abs(this.vy) < 1) this.vy = 0;
      }
    } else if (this.y > height - this.radius) {
      this.y = height - this.radius;
      this.vy *= -this.bounce;
      if (!inverted || zeroG) {
        this.vx *= 0.95; // 地面/無重力時の下端摩擦
        this.va *= 0.9;  // 回転停止
        if (Math.abs(this.vy) < 1) this.vy = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 饅頭フォルム（下が少し膨らんだ楕円）
    ctx.beginPath();
    // 下膨れを表現するためにベジェ曲線を使用
    const r = this.radius;
    ctx.moveTo(0, -r); // 上端
    // 右半分
    ctx.bezierCurveTo(r * 1.2, -r, r * 1.5, r * 1.2, 0, r);
    // 左半分
    ctx.bezierCurveTo(-r * 1.5, r * 1.2, -r * 1.2, -r, 0, -r);
    
    ctx.fillStyle = this.isRed ? '#ffcccc' : 'white';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 目を描く
    ctx.fillStyle = 'black';
    
    // 目: ・ ・ (半径の80%に合わせてスケール)
    ctx.font = 'bold 26px Arial'; // 32 * 0.8 = 25.6
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('・', -14, -2); // -18 * 0.8 = -14.4
    ctx.fillText('・', 14, -2);  // 18 * 0.8 = 14.4
    
    // 口: 描き起こし (半径の80%に合わせてスケール)
    ctx.lineWidth = 2.5; // 3 * 0.8 = 2.4
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    // 左半分
    ctx.beginPath();
    ctx.arc(-6, 10, 6, 0, Math.PI, false); // 7 * 0.8 = 5.6, 12 * 0.8 = 9.6
    ctx.stroke();

    // 右半分
    ctx.beginPath();
    ctx.arc(6, 10, 6, 0, Math.PI, false);
    ctx.stroke();

    // 赤いほっぺ (半径の80%に合わせてスケール)
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 120, 120, 0.7)';
    ctx.arc(-28, 12, 6, 0, Math.PI * 2); // -35 * 0.8 = -28, 15 * 0.8 = 12, 8 * 0.8 = 6.4
    ctx.arc(28, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  applyForce(fx: number, fy: number) {
    this.vx += fx;
    this.vy += fy;
    this.va += fx * 0.1;
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number = 1.0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update() {
    this.vy += 0.1; // 重力
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.03;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3 * this.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 100, 100, ${this.life})`;
    ctx.fill();
  }
}

interface LifukuProps {
  onBack: () => void;
  getStorageUrl?: (path: string) => string;
  user?: any;
  onSaveScore?: (score: number) => void;
  onShowLounge?: () => void;
  allProfiles?: any[];
  myProfile?: any;
  currentBoss?: { name: string, image: string, background?: string };
}

const Lifuku: React.FC<LifukuProps> = ({ onBack, getStorageUrl, user, onSaveScore, onShowLounge, allProfiles = [], myProfile, currentBoss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [volume, setVolume] = useState(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 0 : 0.5;
  });
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'result' | 'ranking'>('start');
  const [vScore, setVScore] = useState({ v: 0, s: 0 }); // 不正対策用の検証済みスコア
  const vScoreRef = useRef({ v: 0, s: 0 }); // タイマー内での最新値参照用
  const [retryCount, setRetryCount] = useState(0); // 広告切替用
  const [bonusEffect, setBonusEffect] = useState<{ show: boolean; text: string; subText?: string; color?: string }>({ show: false, text: '' });
  const [gravityInverted, setGravityInverted] = useState(false);
  const [zeroGravity, setZeroGravity] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [showResultButtons, setShowResultButtons] = useState(false);
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [bgUrls, setBgUrls] = useState<{[key: string]: string}>({});
  const [bgImages, setBgImages] = useState<{[key: string]: HTMLImageElement}>({});
  const entitiesRef = useRef<LifukuEntity[]>([]);
  const lastMilestoneRef = useRef<number>(10);
  const gravityInvertedRef = useRef(false);
  const zeroGravityRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [backHoldTimer, setBackHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [backHoldProgress, setBackHoldProgress] = useState(0);

  // 背景画像のプリロード
  useEffect(() => {
    let isCancelled = false;
    const loadBgs = async () => {
      if (!getStorageUrl) return;
      try {
        const [url1, url2, url3] = await Promise.all([
          getStorageUrl('background/Lifuku1.jpg'),
          getStorageUrl('background/Lifuku2.jpg'),
          getStorageUrl('background/Lifuku3.jpg')
        ]);
        if (isCancelled) return;
        setBgUrls({
          level1: url1,
          level2: url2,
          level3: url3
        });

        // HTMLImageElementとしてプリロード
        const loadImage = (url: string) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
        };

        const [img1, img2, img3] = await Promise.all([
          loadImage(url1),
          loadImage(url2),
          loadImage(url3)
        ]);

        if (isCancelled) return;
        setBgImages({
          level1: img1,
          level2: img2,
          level3: img3
        });
      } catch (e) {
        console.warn("Failed to load background images:", e);
      }
    };
    loadBgs();
    return () => { isCancelled = true; };
  }, [getStorageUrl]);

  // BGM
  useEffect(() => {
    let isCancelled = false;
    const initAudio = async () => {
      const bgmPath = getStorageUrl ? await getStorageUrl('audio/ahiru.ogg') : `${process.env.PUBLIC_URL}/audio/ahiru.ogg`;
      if (isCancelled) return;
      
      const audio = new Audio(bgmPath);
      audio.loop = true;
      audio.volume = volume;
      audio.muted = volume === 0;
      audioRef.current = audio;
      
      audio.play().catch(e => console.warn("BGM auto-play blocked, waiting for interaction:", e));
    };
    initAudio();

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []); // 初回のみ実行するように空配列に変更（getStorageUrlが変わることは稀であるため）


  // 音量変更
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      // 音量が0ならミュート属性をON、それ以外ならOFFにする（確実な消音のため）
      audioRef.current.muted = volume === 0;
    }
  }, [volume]);

  // ポーズ時のBGM制御
  useEffect(() => {
    if (!audioRef.current) return;
    if (gameState === 'paused' || gameState === 'start') {
      audioRef.current.pause();
    } else if (gameState === 'playing' && audioRef.current.paused) {
      // プレイ中にポーズから戻った場合のみ再開
      // 音量が0より大きい場合のみ再生を試みる（0の場合はmutedで制御されるが、不要な再生を避ける）
      audioRef.current.play().catch(e => console.warn("BGM resume failed:", e));
    }
  }, [gameState]);

  const resetGame = (skipStart: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsNewHighscore(false);
    const initialEntities: LifukuEntity[] = [];
    for (let i = 0; i < 10; i++) {
      const isBig = false; // 初回はでない
      initialEntities.push(new LifukuEntity(
        Math.random() * (canvas.width - 100) + 50,
        Math.random() * (canvas.height - 100) + 50,
        nextIdRef.current++,
        isBig
      ));
    }
    entitiesRef.current = initialEntities;
    lastMilestoneRef.current = 10;
    gravityInvertedRef.current = false;
    zeroGravityRef.current = false;
    particlesRef.current = [];
    setScore(initialEntities.length);
    setTimeLeft(90); // 制限時間を 90秒 に統一
    setGravityInverted(false);
    setZeroGravity(false);
    setBonusEffect({ show: false, text: '' });
    setGameState(skipStart ? 'playing' : 'start');
    setHasStartedOnce(false);
    const initialScore = initialEntities.length;
    const initialVScore = { v: initialScore, s: initialScore ^ 0x55 };
    setVScore(initialVScore);
    vScoreRef.current = initialVScore;
    if (skipStart) setRetryCount(prev => prev + 1);
  };

  const spawnGlider = () => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = Math.random() * (canvas.width - 200) + 100;
    const centerY = Math.random() * (canvas.height - 200) + 100;
    const gap = 80;

    const pattern = [
      { dx: 0, dy: -gap },
      { dx: gap, dy: 0 },
      { dx: -gap, dy: gap },
      { dx: 0, dy: gap },
      { dx: gap, dy: gap },
    ];

    const newEntities = pattern.map(p => {
      const ent = new LifukuEntity(centerX + p.dx, centerY + p.dy, nextIdRef.current++, false);
      ent.vx = 0; ent.vy = 0; ent.va = 0;
      return ent;
    });

    entitiesRef.current = [...entitiesRef.current, ...newEntities];
    const newScore = entitiesRef.current.length;
    setScore(newScore);
    const newVScore = { v: newScore, s: newScore ^ 0x55 };
    setVScore(newVScore);
    vScoreRef.current = newVScore;
    
    setBonusEffect({ show: true, text: 'GLIDER DEPLOYED!', color: '#4fc3f7' });
    setTimeout(() => setBonusEffect({ show: false, text: '' }), 1500);
  };

  // 初期化
  useEffect(() => {
    resetGame();
  }, []);

  // タイマー
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('result');
          setShowResultButtons(false);
          setTimeout(() => setShowResultButtons(true), 2000); // 2秒待ってからボタンを表示

          // スコアの改ざんチェック
          const finalScore = entitiesRef.current.length;
          const currentVScore = vScoreRef.current;
          if ((currentVScore.v ^ 0x55) === currentVScore.s && currentVScore.v === finalScore) {
            const currentHighscore = myProfile?.lifukuHighscore || 0;
            if (finalScore > currentHighscore || (currentHighscore === 0 && finalScore > 0)) {
              setIsNewHighscore(true);
            }
            if (onSaveScore) onSaveScore(finalScore);
          } else {
            console.error("Score validation failed.");
            if (onSaveScore) onSaveScore(0);
          }
          
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleAction = (clientX: number, clientY: number) => {
    if (gameState === 'paused') {
      setGameState('playing');
      // 再開時に音声も確実に
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.warn("BGM resume failed on action:", e));
      }
      return;
    }
    if (gameState !== 'playing') return;

    // 初回タップ時にBGM再生を試みる
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(e => console.warn("BGM play failed on interaction:", e));
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    // 判定範囲もスマホ版基準 (2.0) に統一
    const clickedIdx = entitiesRef.current.findIndex(ent => {
      const dist = Math.sqrt((ent.x - clickX) ** 2 + (ent.y - clickY) ** 2);
      const hitRadius = ent.radius * 2.0;
      return dist < hitRadius;
    });

    if (clickedIdx !== -1) {
      const ent = entitiesRef.current[clickedIdx];
      const nearThreshold = 144; // 180 * 0.8 = 144
      const nears = entitiesRef.current.filter(other => {
        if (other === ent) return false;
        const dx = ent.x - other.x;
        const dy = ent.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < nearThreshold;
      });

      if (nears.length >= 1 && nears.length <= 2) {
        // 増殖
        const isBig = Math.random() < 0.1;
        const newEnt = new LifukuEntity(ent.x, ent.y, nextIdRef.current++, isBig);
        
        // 無重力時はよりランダムに、かつ親個体も反対方向に少し弾く
        const angle = Math.random() * Math.PI * 2;
        const speed = zeroGravityRef.current ? 8 : 10;
        newEnt.vx = Math.cos(angle) * speed;
        newEnt.vy = Math.sin(angle) * speed;
        
        if (zeroGravityRef.current) {
          // 反作用を大幅に緩和 (2 -> 0.5) し、スコアを稼ぎやすく調整
          ent.vx -= Math.cos(angle) * 0.5;
          ent.vy -= Math.sin(angle) * 0.5;
        }

        entitiesRef.current = [...entitiesRef.current, newEnt];
      } else {
        // 爆発
        const newParticles: Particle[] = [];
        for (let i = 0; i < 32; i++) {
          newParticles.push(new Particle(ent.x, ent.y));
        }
        particlesRef.current = [...particlesRef.current, ...newParticles];
        
        // 周囲を強く吹き飛ばす
        entitiesRef.current.forEach(other => {
          if (other === ent) return;
          const dx = other.x - ent.x;
          const dy = other.y - ent.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const limit = ent.isBig ? 600 : 250; // でかいやつは範囲も広い
          if (dist < limit) {
            const force = (limit - dist) / (ent.isBig ? 8 : 12);
            const angle = Math.atan2(dy, dx);
            // 上方向へのバイアスを追加 (-0.5は上方へのベクトル補正)
            // でかいやつはより強く
            const upwardBias = ent.isBig ? -1.0 : -0.5;
            other.applyForce(Math.cos(angle) * force, (Math.sin(angle) + upwardBias) * force);
          }
        });

        entitiesRef.current = entitiesRef.current.filter((_, i) => i !== clickedIdx);
      }
      const newScore = entitiesRef.current.length;
      setScore(newScore);

      // 0個になったらゲームオーバー
      if (newScore === 0) {
        setGameState('result');
        setShowResultButtons(false);
        setTimeout(() => setShowResultButtons(true), 2000); // 2秒待ってからボタンを表示

        // 0個になった瞬間、スコア0で保存
        if (onSaveScore) onSaveScore(0);
        return;
      }

      const newVScore = { v: newScore, s: newScore ^ 0x55 };
      setVScore(newVScore);
      vScoreRef.current = newVScore;

      // 10個ごとのボーナス判定 (20, 30, 40...)
      if (newScore >= lastMilestoneRef.current + 10) {
        const is50Milestone = lastMilestoneRef.current < 50 && newScore >= 50;
        const is100Milestone = lastMilestoneRef.current < 100 && newScore >= 100;
        lastMilestoneRef.current += 10;
        const bonusTime = 15; // ボーナス時間も 15秒 に統一
        setTimeLeft(prev => prev + bonusTime);
        
        if (is100Milestone) {
          setZeroGravity(true);
          zeroGravityRef.current = true;
          // 虹色演出の代わりにレインボーカラーのテキストと全吹き飛ばし
          entitiesRef.current.forEach(ent => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20;
            ent.applyForce(Math.cos(angle) * speed, Math.sin(angle) * speed);
          });
          setBonusEffect({ 
            show: true, 
            text: `LIFUKU x ${newScore}!!`, 
            subText: 'ZERO GRAVITY MODE!', 
            color: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' 
          });
        } else if (is50Milestone) {
          setGravityInverted(true);
          gravityInvertedRef.current = true;
          // 全個体に上向きの初速を与える
          entitiesRef.current.forEach(ent => {
            ent.vy = -15;
            ent.va = (Math.random() - 0.5) * 1.0;
          });
          setBonusEffect({ 
            show: true, 
            text: `LIFUKU x ${newScore}!!`, 
            subText: 'UPWARD GRAVITY!', 
            color: '#ff1744' 
          });
        } else {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          setBonusEffect({ show: true, text: `LIFUKU x ${newScore}!! TIME +15s` });
        }
        
        // 豪華な演出：画面中にキラキラパーティクルを散らす
        const canvas = canvasRef.current;
        if (canvas) {
          for (let i = 0; i < 50; i++) {
            const p = new Particle(Math.random() * canvas.width, Math.random() * canvas.height);
            p.vx *= 2; p.vy *= 2; // 少し速く
            particlesRef.current.push(p);
          }
        }

        setTimeout(() => setBonusEffect({ show: false, text: '' }), 2500);
      }
    }
  };

  // ゲームループ
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const render = () => {
      if (!canvas || !ctx) return;

      // gameState が 'playing' の時のみエンティティを更新（start, paused, result の時は描画のみ行う）
      if (gameState === 'playing') {
        entitiesRef.current.forEach(ent => {
          ent.update(canvas.width, canvas.height, gravityInvertedRef.current, zeroGravityRef.current);
          const nearThreshold = 144; // 統一した閾値
          const nears = entitiesRef.current.filter(other => {
            if (other === ent) return false;
            const dx = ent.x - other.x;
            const dy = ent.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < nearThreshold;
          });
          ent.isRed = (nears.length >= 1 && nears.length <= 2);
        });

        particlesRef.current = particlesRef.current.filter(p => p.update());
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Canvas内の背景画像描画
      const currentBgImg = zeroGravity ? bgImages.level3 : (gravityInverted ? bgImages.level2 : bgImages.level1);
      if (currentBgImg) {
        // 画像をアスペクト比を維持してカバーするように描画
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = currentBgImg.width / currentBgImg.height;
        let drawW, drawH, drawX, drawY;

        if (imgAspect > canvasAspect) {
          drawH = canvas.height;
          drawW = canvas.height * imgAspect;
          drawX = (canvas.width - drawW) / 2;
          drawY = 0;
        } else {
          drawW = canvas.width;
          drawH = canvas.width / imgAspect;
          drawX = 0;
          drawY = (canvas.height - drawH) / 2;
        }
        ctx.drawImage(currentBgImg, drawX, drawY, drawW, drawH);
        
        // 背景画像の上に少し明るいレイヤーを重ねる（グリッドやキャラクターを見やすくするため）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#fce4ec';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // グリッド線
      ctx.strokeStyle = '#f8bbd0';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      entitiesRef.current.forEach(ent => ent.draw(ctx));
      particlesRef.current.forEach(p => p.draw(ctx));

      // PAUSE中のオーバーレイ（Canvas内のみ）
      if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('タップで再開', canvas.width / 2, canvas.height / 2 + 40);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const shareToX = () => {
    const message = `【・ω・】＜「らいふく」を${score}個つくりました！\n#紫電一閃 #らいふく\nhttps://shiden-issen.com/`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        // pointer-events: none を設定した子要素以外からのクリック（枠外）のみを拾う
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }}
      style={{
        textAlign: 'center',
        backgroundColor: '#f06292',
        padding: '10px 0',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        color: 'white',
        fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
        touchAction: 'none', // スクロールを無効化
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent', // スマホのタップハイライトを消去
        position: 'relative'
      }}
    >

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 10px' }}>
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            const timer = setInterval(() => {
              setBackHoldProgress(prev => {
                if (prev >= 100) {
                  clearInterval(timer);
                  onBack();
                  return 100;
                }
                return prev + 10;
              });
            }, 50);
            setBackHoldTimer(timer);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (backHoldTimer) clearInterval(backHoldTimer);
            setBackHoldTimer(null);
            setBackHoldProgress(0);
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            if (backHoldTimer) clearInterval(backHoldTimer);
            setBackHoldTimer(null);
            setBackHoldProgress(0);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            const timer = setInterval(() => {
              setBackHoldProgress(prev => {
                if (prev >= 100) {
                  clearInterval(timer);
                  onBack();
                  return 100;
                }
                return prev + 10;
              });
            }, 50);
            setBackHoldTimer(timer);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (backHoldTimer) clearInterval(backHoldTimer);
            setBackHoldTimer(null);
            setBackHoldProgress(0);
          }}
          style={{
            padding: '8px 15px',
            fontSize: '0.8rem',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: '#ad1457',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            width: '80px'
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            backgroundColor: 'rgba(255,255,255,0.3)', width: `${backHoldProgress}%`,
            transition: 'width 0.05s linear'
          }} />
          <span style={{ position: 'relative', zIndex: 1 }}>TITLE</span>
        </button>
        <h2 style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)', margin: '0 5px', flex: 1, fontSize: '1.2rem', whiteSpace: 'nowrap' }}>らいふく</h2>
        <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHasStartedOnce(true);
              setGameState('start');
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.6rem',
              borderRadius: '10px',
              border: '1px solid white',
              backgroundColor: 'transparent',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: 0.8,
              whiteSpace: 'nowrap'
            }}
          >
            遊び方
          </button>
        </div>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 'bold', flexWrap: 'wrap' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.6)', padding: '4px 0', borderRadius: '10px', width: '110px',
          border: '2px solid #ad1457', boxShadow: '0 3px 0 #880e4f', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ fontSize: '0.6rem', color: '#ff80ab' }}>SCORE</span>
          <span style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>{score.toString().padStart(3, '0')}</span>
        </div>
        
        <div style={{
          background: 'rgba(0,0,0,0.6)', padding: '4px 0', borderRadius: '10px', width: '110px',
          border: '2px solid #ad1457', boxShadow: '0 3px 0 #880e4f', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ fontSize: '0.6rem', color: '#ff80ab' }}>TIME LEFT</span>
          <span style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>{timeLeft}<span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>秒</span></span>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '8px', height: '32px',
            width: '180px'
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#ff80ab', fontWeight: 'bold' }}>音量</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minWidth: '100px',
              height: '4px',
              cursor: 'pointer',
              accentColor: '#ff80ab'
            }}
          />
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ marginBottom: '15px', display: 'none' }}
      >
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            e.currentTarget.style.transform = 'translateY(2px)';
            spawnGlider();
          }}
          onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          style={{
            background: '#0288d1', color: 'white', border: 'none',
            padding: '12px 40px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 5px 0 #01579b', fontSize: '1.2rem',
            transition: 'transform 0.1s'
          }}
        >
          GLIDER! (ライフゲーム召喚)
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={600}
        height={900}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleAction(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          // e.preventDefault() は React 17+ では passiveListener の関係で直接呼べない場合があるが
          // ここでは伝播阻止を優先
          e.stopPropagation();
          const touch = e.touches[0];
          handleAction(touch.clientX, touch.clientY);
        }}
        style={{
          border: '6px solid #ad1457',
          borderRadius: '16px',
          cursor: 'pointer',
          maxWidth: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '90vw' : '600px',
          maxHeight: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '70vh' : '75vh',
          width: 'auto',
          height: 'auto',
          boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
          backgroundColor: 'white',
          margin: '10px auto',
          display: 'block'
        }}
      />



      {gameState === 'result' && (
        <div style={{
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.5s'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: '2rem', marginBottom: '10px' }}>おわり！</h3>
          <div style={{
            fontSize: '4.5rem',
            fontWeight: 'bold',
            marginBottom: '10px',
            color: score >= 100 ? 'transparent' : (score >= 50 ? '#ffd700' : '#f06292'),
            backgroundImage: score >= 100 ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' : 'none',
            WebkitBackgroundClip: score >= 100 ? 'text' : 'none',
            textShadow: score >= 100 ? '0 0 10px rgba(255,255,255,0.5)' : (score >= 50 ? '0 0 20px #ffd700, 0 0 40px #fff' : 'none'),
            animation: score >= 100 ? 'rainbowAnim 2s linear infinite, bounceIn 0.8s' : (score >= 50 ? 'goldAnim 2s ease-in-out infinite, bounceIn 0.8s' : 'bounceIn 0.8s')
          }}>
            {score}<span style={{ fontSize: '1.5rem', marginLeft: '5px' }}>個</span>
          </div>
          
          {user ? (
            isNewHighscore && (
              <p style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '20px', animation: 'fadeIn 0.5s' }}>
                ハイスコア更新！ランキングに登録しました！
              </p>
            )
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', marginBottom: '20px', maxWidth: '300px' }}>
              <p style={{ fontSize: '0.9rem', margin: '0 0 0 0' }}>ユーザ登録すると、このスコアを<br/>ランキングに登録できます！</p>
            </div>
          )}

          {showResultButtons && (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeIn 0.5s' }}>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsShowingAd(true)}
                  style={{
                  padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
                  border: 'none', backgroundColor: '#ad1457', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  リトライ！
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setGameState('ranking')}
                  style={{
                  padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
                  border: 'none', backgroundColor: '#ffd700', color: '#333', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  ランキング
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={shareToX}
                  style={{
                  padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
                  border: 'none', backgroundColor: '#000', color: 'white', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 0 #333', cursor: 'pointer'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  ポスト
                </button>
              </div>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onBack}
                style={{
                marginTop: '20px', padding: '12px 30px', fontSize: '1rem', borderRadius: '30px',
                border: 'none', backgroundColor: 'white', color: '#ad1457', fontWeight: 'bold', cursor: 'pointer'
              }}>
                タイトルにもどる
              </button>
            </>
          )}
        </div>
      )}

      {gameState === 'start' && (
        <div style={{
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 1200, animation: 'fadeIn 0.5s'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#ad1457', padding: '30px', borderRadius: '25px', border: '4px solid white',
            maxWidth: '500px', width: '90%', boxShadow: '0 0 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '2rem', margin: '0 0 20px 0' }}>遊び方</h3>
            <div style={{ textAlign: 'left', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '30px' }}>
              <p>「らいふく」をつついて増やそう！</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>❤️ <b>増える:</b> 赤い時 (周りに仲間が 1〜2個いる時)</li>
                <li>💥 <b>爆発:</b> 白い時 (孤立している、または密集しすぎている時)</li>
                <li>⏱️ <b>制限時間:</b> 90秒</li>
                <li>✨ <b>タイムボーナス:</b> +10個初達成で +15秒</li>
                <li>🌎 <b>50個、100個到達で何かが起こる！？</b></li>
              </ul>
              <p>※紫電一閃とは一切関係がありません。</p>
            </div>
            <button onClick={() => setGameState('playing')} style={{
              padding: '15px 60px', fontSize: '1.5rem', borderRadius: '40px',
              border: 'none', backgroundColor: 'white', color: '#ad1457', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 5px 0 #eee'
            }}>
              {hasStartedOnce ? 'ゲームに戻る' : 'はじめる！'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'ranking' && (
        <div style={{
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 1300, animation: 'fadeIn 0.5s'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#ad1457', padding: '20px', borderRadius: '25px', border: '4px solid white',
            maxWidth: '500px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '1.8rem', margin: '0 0 15px 0' }}>ランキング</h3>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)', color: '#ffd700' }}>
                    <th style={{ padding: '8px', textAlign: 'center' }}>順位</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>プレイヤー</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const profilesMap = allProfiles.reduce((acc: any, p: any) => {
                      if (p.lifukuHighscore !== undefined) {
                        if (!acc[p.uid] || acc[p.uid].lifukuHighscore < p.lifukuHighscore) {
                          acc[p.uid] = p;
                        }
                      }
                      return acc;
                    }, {});
                    
                    if (myProfile && myProfile.lifukuHighscore !== undefined && !profilesMap[myProfile.uid]) {
                      profilesMap[myProfile.uid] = myProfile;
                    }
                    
                    return Object.values(profilesMap)
                      .sort((a: any, b: any) => (b.lifukuHighscore || 0) - (a.lifukuHighscore || 0))
                      .slice(0, 50)
                      .map((p: any, idx) => (
                        <tr key={p.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: p.uid === user?.uid ? 'rgba(255, 215, 0, 0.2)' : 'transparent' }}>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? '#ffd700' : 'white' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={(p.photoURL || '').startsWith('/') && getStorageUrl ? getStorageUrl(p.photoURL) : (p.photoURL || 'https://via.placeholder.com/24')} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                            <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{p.displayName}</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'monospace', fontSize: '1.1rem' }}>
                            {p.lifukuHighscore}
                          </td>
                        </tr>
                      ));
                  })()}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setGameState('result')} style={{
                padding: '10px 30px', fontSize: '1rem', borderRadius: '30px',
                border: 'none', backgroundColor: 'white', color: '#ad1457', fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {isShowingAd && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: '#000', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000, animation: 'fadeIn 0.3s'
        }}>
          <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '20px' }}>SHIDEN-ISSEN</div>
          <div style={{
            width: '300px', minHeight: '250px', backgroundColor: '#111', border: '1px solid #333',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            borderRadius: '10px', marginBottom: '30px', position: 'relative', overflow: 'hidden'
          }}>
            <AdCard 
              getStorageUrl={getStorageUrl} 
              mode={(retryCount % 2 === 1) ? 'boss' : 'kenju'} 
              bossInfo={currentBoss}
            />
          </div>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              setIsShowingAd(false);
              resetGame(true);
            }}
            style={{
              padding: '12px 40px', borderRadius: '30px', border: '2px solid white',
              backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            閉じてリトライ
          </button>

        </div>
      )}

      {bonusEffect.show && (
        <div style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1500, pointerEvents: 'none', textAlign: 'center', width: '100%'
        }}>
          <h2 style={{
            fontSize: '3.5rem', fontWeight: '900', 
            color: bonusEffect.color?.includes('gradient') ? 'transparent' : (bonusEffect.color || '#ffd700'),
            backgroundImage: bonusEffect.color?.includes('gradient') ? bonusEffect.color : 'none',
            WebkitBackgroundClip: bonusEffect.color?.includes('gradient') ? 'text' : 'none',
            textShadow: bonusEffect.color?.includes('gradient') ? 'none' : `0 0 10px ${bonusEffect.color || '#ad1457'}, 0 0 20px ${bonusEffect.color || '#ad1457'}, 0 0 40px #fff`,
            margin: 0, animation: 'bonusAnim 1.5s ease-out forwards',
            fontStyle: 'italic', WebkitTextStroke: '1px #ad1457'
          }}>
            {bonusEffect.text}
          </h2>
          {bonusEffect.subText && (
            <div style={{
              fontSize: '2rem', fontWeight: 'bold', color: '#fff',
              textShadow: '0 0 10px #000', animation: 'fadeIn 0.5s 0.3s both'
            }}>
              {bonusEffect.subText}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bonusAnim {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.2); opacity: 1; }
          40% { transform: scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(1.1); opacity: 0; }
        }
        @keyframes rainbowAnim {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes goldAnim {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 5px #ffd700); }
          50% { filter: brightness(1.5) drop-shadow(0 0 15px #ffd700); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
        </div>
    </div>
  );
};

export default Lifuku;
