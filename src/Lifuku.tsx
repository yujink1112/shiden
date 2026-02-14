import React, { useRef, useEffect, useState } from 'react';

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
    this.radius = isBig ? 72 : 36; // 巨大個体は2倍のサイズ
    
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
}

const Lifuku: React.FC<LifukuProps> = ({ onBack, getStorageUrl, user, onSaveScore, onShowLounge }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [volume, setVolume] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'result'>('start');
  const [bonusEffect, setBonusEffect] = useState<{ show: boolean; text: string; subText?: string; color?: string }>({ show: false, text: '' });
  const [gravityInverted, setGravityInverted] = useState(false);
  const [zeroGravity, setZeroGravity] = useState(false);
  
  const entitiesRef = useRef<LifukuEntity[]>([]);
  const lastMilestoneRef = useRef<number>(10);
  const gravityInvertedRef = useRef(false);
  const zeroGravityRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // BGM
  useEffect(() => {
    const initAudio = async () => {
      const bgmPath = getStorageUrl ? await getStorageUrl('audio/ahiru.ogg') : `${process.env.PUBLIC_URL}/audio/ahiru.ogg`;
      const audio = new Audio(bgmPath);
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;
      
      audio.play().catch(e => console.warn("BGM auto-play blocked, waiting for interaction:", e));
    };
    initAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [getStorageUrl]);

  // 音量変更
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // ポーズ時のBGM制御
  useEffect(() => {
    if (!audioRef.current) return;
    if (gameState === 'paused' || gameState === 'start') {
      audioRef.current.pause();
    } else if (gameState === 'playing' && audioRef.current.paused) {
      // プレイ中にポーズから戻った場合のみ再開
      audioRef.current.play().catch(e => console.warn("BGM resume failed:", e));
    }
  }, [gameState]);

  const resetGame = (skipStart: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    setTimeLeft(60);
    setGravityInverted(false);
    setZeroGravity(false);
    setBonusEffect({ show: false, text: '' });
    setGameState(skipStart ? 'playing' : 'start');
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
          if (onSaveScore) onSaveScore(score);
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

    const clickedIdx = entitiesRef.current.findIndex(ent => {
      const dist = Math.sqrt((ent.x - clickX) ** 2 + (ent.y - clickY) ** 2);
      return dist < ent.radius * 1.5; // 少し判定を広く
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
          ent.vx -= Math.cos(angle) * 2;
          ent.vy -= Math.sin(angle) * 2;
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

      // 10個ごとのボーナス判定 (20, 30, 40...)
      if (newScore >= lastMilestoneRef.current + 10) {
        const is50Milestone = lastMilestoneRef.current < 50 && newScore >= 50;
        const is100Milestone = lastMilestoneRef.current < 100 && newScore >= 100;
        lastMilestoneRef.current += 10;
        setTimeLeft(prev => prev + 5); // 5秒延長
        
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
          setBonusEffect({ show: true, text: `LIFUKU x ${newScore}!! TIME +5s` });
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
      ctx.fillStyle = '#fce4ec';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  const tweetResult = () => {
    const message = `【・ω・】＜大福を${score}個つくりました！ #Lifuku #紫電一閃`;
    const url = `http://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      ref={containerRef} 
      onClick={(e) => {
        if (e.target === e.currentTarget && gameState === 'playing') {
          setGameState('paused');
        }
      }}
      style={{ 
        textAlign: 'center', 
        backgroundColor: '#f06292', 
        padding: '10px', 
        minHeight: '100vh', 
        color: 'white',
        fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
        touchAction: 'pan-y', // スクロールを許可
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent', // スマホのタップハイライトを消去
        position: 'relative'
      }}
    >
      <h2 style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)', margin: '10px 0' }}>らいふく</h2>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '15px', fontSize: '1.2rem', fontWeight: 'bold', flexWrap: 'wrap' }}
      >
        <div style={{ 
          background: 'rgba(0,0,0,0.6)', padding: '8px 0', borderRadius: '12px', width: '130px', 
          border: '2px solid #ad1457', boxShadow: '0 4px 0 #880e4f', display: 'flex', flexDirection: 'column' 
        }}>
          <span style={{ fontSize: '0.7rem', color: '#ff80ab' }}>SCORE</span>
          <span style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{score.toString().padStart(3, '0')}</span>
        </div>
        
        <div style={{ 
          background: 'rgba(0,0,0,0.6)', padding: '8px 0', borderRadius: '12px', width: '130px', 
          border: '2px solid #ad1457', boxShadow: '0 4px 0 #880e4f', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ fontSize: '0.7rem', color: '#ff80ab' }}>TIME LEFT</span>
          <span style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{timeLeft}<span style={{ fontSize: '0.9rem', marginLeft: '2px' }}>秒</span></span>
        </div>

        <div style={{ 
          background: 'rgba(0,0,0,0.4)', padding: '10px 15px', borderRadius: '12px', 
          display: 'flex', alignItems: 'center', gap: '10px', height: '44px'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#ff80ab', fontWeight: 'bold' }}>音量</span>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '80px', cursor: 'pointer', accentColor: '#ff80ab' }}
          />
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={600}
        height={800}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleAction(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          handleAction(touch.clientX, touch.clientY);
        }}
        style={{ 
          border: '6px solid #ad1457', 
          borderRadius: '16px', 
          cursor: 'pointer', 
          maxWidth: '90vw', 
          maxHeight: '70vh',
          width: 'auto',
          height: 'auto',
          boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
          backgroundColor: 'white'
        }}
      />

      <div style={{ 
        marginTop: '15px', 
        fontSize: '0.9rem', 
        background: 'rgba(255,255,255,0.2)', 
        padding: '10px', 
        borderRadius: '10px',
        lineHeight: '1.4'
      }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>【遊び方】</p>
        <p style={{ margin: 0 }}>赤くなっている「らいふく」をつつつくと増えるよ！</p>
        <p style={{ margin: 0 }}>白いのを無理につつくと爆発しちゃうから注意！</p>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onBack(); }} style={{ 
        marginTop: '20px', 
        padding: '12px 30px', 
        fontSize: '1rem',
        borderRadius: '25px',
        border: 'none',
        backgroundColor: '#ad1457',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: '0 4px #880e4f',
        cursor: 'pointer'
      }}>
        タイトルに戻る
      </button>

      {gameState === 'result' && (
        <div style={{
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.5s'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: '2rem', marginBottom: '10px' }}>おわり！</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f06292', marginBottom: '10px' }}>{score}個</div>
          
          {user ? (
            <p style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '20px' }}>ランキングにスコアを登録しました！</p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', marginBottom: '20px', maxWidth: '300px' }}>
              <p style={{ fontSize: '0.9rem', margin: '0 0 10px 0' }}>ユーザ登録すると、このスコアをランキングに登録できます！</p>
              <button onClick={onShowLounge} style={{ padding: '8px 15px', borderRadius: '15px', border: 'none', backgroundColor: '#ffd700', color: '#333', fontWeight: 'bold', fontSize: '0.8rem' }}>
                ユーザ登録/ログインへ
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => resetGame(true)} style={{
              padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
              border: 'none', backgroundColor: '#ad1457', color: 'white', fontWeight: 'bold'
            }}>
              リトライ！
            </button>
            <button onClick={onShowLounge} style={{ 
              padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
              border: 'none', backgroundColor: '#ffd700', color: '#333', fontWeight: 'bold'
            }}>
              ランキング
            </button>
            <button onClick={tweetResult} style={{
              padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px',
              border: 'none', backgroundColor: '#1da1f2', color: 'white', fontWeight: 'bold'
            }}>
              ツイート
            </button>
          </div>
          <button onClick={onBack} style={{
            marginTop: '20px', padding: '12px 30px', fontSize: '1rem', borderRadius: '30px',
            border: 'none', backgroundColor: 'white', color: '#ad1457', fontWeight: 'bold'
          }}>
            タイトルにもどる
          </button>
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
              <p>【・ω・】をつついて増やそう！</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>❤️ <b>増える:</b> 周りに仲間が1〜2個いる時</li>
                <li>💥 <b>爆発:</b> 孤立している、または密集しすぎている時</li>
                <li>✨ <b>タイムボーナス:</b> 10個増えるごとに+5秒</li>
                <li>🆙 <b>50個到達:</b> 重力が反転！？</li>
                <li>🌈 <b>100個到達:</b> 究極の無重力モード！</li>
              </ul>
            </div>
            <button onClick={() => setGameState('playing')} style={{
              padding: '15px 60px', fontSize: '1.5rem', borderRadius: '40px',
              border: 'none', backgroundColor: 'white', color: '#ad1457', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 5px 0 #eee'
            }}>
              はじめる！
            </button>
          </div>
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
      `}</style>
    </div>
  );
};

export default Lifuku;
