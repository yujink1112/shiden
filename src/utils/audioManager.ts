import { getStorageUrl } from "../firebase";

class AudioManager {
  private static instance: AudioManager;
  private currentBgm: HTMLAudioElement | null = null;
  private currentBgmName: string | null = null;
  private audioData: { [key: string]: string } = {}; // BGM名 -> ファイル名
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private isLoaded: boolean = false;
  private listeners: (() => void)[] = [];

  private constructor() {
    const savedVolume = localStorage.getItem('shiden_bgm_volume');
    this.volume = savedVolume ? parseFloat(savedVolume) : 0.5;
    
    const savedEnabled = localStorage.getItem('shiden_bgm_enabled');
    this.isMuted = savedEnabled === 'false';
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // public/data/story_assets.json から audio データを取得
  public async loadAudioData() {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/data/story_assets.json');
      if (!response.ok) {
        throw new Error(`Failed to load story assets: ${response.statusText}`);
      }
      const data = await response.json();
      
      if (data && data.bgm) {
        this.audioData = data.bgm;
        console.log("Audio data loaded from story_assets.json:", this.audioData);
      } else {
        console.warn("BGM data not found in story_assets.json.");
      }
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to load audio data:", error);
      // エラー時でもロード完了として扱う（無限ロード防止）
      this.isLoaded = true;
    }
  }

  public async playBgm(bgmName: string, loop: boolean = true) {
    if (!this.isLoaded) {
      console.log(`Waiting for audio data to load before playing ${bgmName}...`);
      await this.loadAudioData();
    }

    // "消去" または "Stop" などの指示があれば停止
    if (bgmName === "消去" || bgmName === "Stop" || bgmName === "None" || bgmName === "OFF") {
        this.stopBgm();
        return;
    }

    // bgmName が .mp3, .ogg, .wav などで終わる、あるいは / を含む場合はファイルパスとして扱う
    let fileName = this.audioData[bgmName];
    let isDirectPath = false;

    if (!fileName) {
        if (bgmName.includes("/") || bgmName.includes(".")) {
            fileName = bgmName;
            isDirectPath = true;
        } else {
            console.warn(`BGM config not found for: ${bgmName}`);
            return;
        }
    }

    // 既に同じ曲が再生されている場合は何もしない（ループ設定も同じ場合）
    if (this.currentBgmName === bgmName && this.currentBgm && !this.currentBgm.paused && this.currentBgm.loop === loop) {
      return;
    }

    this.stopBgm();

    // ファイル名が http で始まる場合はそのまま
    // / で始まる場合はローカルパスとして扱う（publicフォルダ直下）
    // それ以外は Storage URL を取得
    let url: string;
    if (fileName.startsWith("http")) {
        url = fileName;
    } else if (fileName.startsWith("/")) {
        url = fileName;
    } else {
        url = getStorageUrl(fileName);
    }
    console.log(`Playing BGM: ${bgmName} (loop: ${loop}) (${url})`);

    this.currentBgm = new Audio(url);
    this.currentBgmName = bgmName;
    this.currentBgm.loop = loop;
    this.currentBgm.volume = this.isMuted ? 0 : this.volume;

    try {
      await this.currentBgm.play();
    } catch (e) {
      console.error("Failed to play BGM:", e);
    }
  }

  public stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = null;
      this.currentBgmName = null;
    }
  }

  public fadeOutAndStop(duration: number = 2000) {
    if (!this.currentBgm) return;

    const audio = this.currentBgm;
    const startVolume = audio.volume;
    const startTime = Date.now();

    // AudioManager上は再生停止扱いにする
    this.currentBgm = null;
    this.currentBgmName = null;

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newVolume = startVolume * (1 - progress);

      audio.volume = Math.max(0, newVolume);

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };
    
    fade();
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('shiden_bgm_volume', this.volume.toString());
    
    if (this.currentBgm && !this.isMuted) {
      this.currentBgm.volume = this.volume;
    }
    this.notify();
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    // localStorageのキーは 'shiden_bgm_enabled' (true=音あり, false=ミュート) なので反転させる
    localStorage.setItem('shiden_bgm_enabled', (!mute).toString());

    if (this.currentBgm) {
        if (mute) {
            this.currentBgm.volume = 0;
        } else {
            this.currentBgm.volume = this.volume;
            // ミュート解除時に再生が止まっていたら再開する等の処理が必要な場合
            // 基本的には volume 0 でも再生は続いているはず
        }
    }
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  public isMutedStatus(): boolean {
    return this.isMuted;
  }
}

export default AudioManager;
