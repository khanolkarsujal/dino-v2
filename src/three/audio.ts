class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private lastTimes = new Map<string, number>();

  constructor() {
    try {
      this.muted = localStorage.getItem('dc_muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('dc_muted', m ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.45, this.ctx.currentTime, 0.04);
    }
  }

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private canPlay(key: string, minGapMs: number): boolean {
    if (this.muted) return false;
    const now = performance.now();
    const prev = this.lastTimes.get(key) ?? 0;
    if (now - prev < minGapMs) return false;
    this.lastTimes.set(key, now);
    return true;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slide = 1,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 1) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  public playSlash(combo: number): void {
    if (!this.canPlay('slash', 80)) return;
    const pitch = (0.94 + Math.random() * 0.12) * (1 + combo * 0.08);
    this.tone(420 * pitch, 0.11, 'sawtooth', 0.12, 0.35);
    this.tone(720 * pitch, 0.07, 'triangle', 0.08, 0.5);
  }

  public playDash(): void {
    if (!this.canPlay('dash', 150)) return;
    this.tone(240, 0.16, 'triangle', 0.14, 2.2);
  }

  public playHit(heavy = false): void {
    if (!this.canPlay('hit', 45)) return;
    const p = 0.92 + Math.random() * 0.16;
    this.tone((heavy ? 130 : 190) * p, heavy ? 0.14 : 0.08, 'square', heavy ? 0.16 : 0.1, 0.45);
  }

  public playKill(): void {
    if (!this.canPlay('kill', 50)) return;
    const p = 0.92 + Math.random() * 0.16;
    this.tone(360 * p, 0.1, 'triangle', 0.12, 1.5);
    this.tone(540 * p, 0.12, 'sine', 0.09, 1.2, 0.03);
  }

  public playHarvest(): void {
    if (!this.canPlay('harvest', 90)) return;
    this.tone(320, 0.07, 'triangle', 0.14, 1.25);
    this.tone(480, 0.09, 'triangle', 0.1, 1.15, 0.05);
  }

  public playPickup(): void {
    if (!this.canPlay('pickup', 100)) return;
    this.tone(523, 0.08, 'triangle', 0.14, 1, 0);
    this.tone(659, 0.12, 'triangle', 0.14, 1, 0.07);
  }

  public playHatch(): void {
    if (!this.canPlay('hatch', 200)) return;
    [523, 659, 784, 1046].forEach((n, i) => this.tone(n, 0.18, 'triangle', 0.13, 1, i * 0.06));
  }

  public playBuild(): void {
    if (!this.canPlay('build', 120)) return;
    this.tone(180, 0.08, 'square', 0.12, 0.8, 0);
    this.tone(240, 0.1, 'triangle', 0.14, 1.1, 0.07);
  }

  public playWaveStart(isNight: boolean): void {
    if (!this.canPlay('wave', 400)) return;
    if (isNight) {
      this.tone(110, 0.45, 'sawtooth', 0.16, 0.75, 0);
      this.tone(146, 0.5, 'sawtooth', 0.12, 0.75, 0.15);
    } else {
      this.tone(220, 0.25, 'triangle', 0.14, 1.1, 0);
      this.tone(330, 0.3, 'triangle', 0.12, 1.05, 0.12);
    }
  }

  public playHurt(): void {
    if (!this.canPlay('hurt', 160)) return;
    this.tone(160, 0.2, 'sawtooth', 0.16, 0.45);
  }

  public playStoryChord(step: number): void {
    if (this.muted) return;
    const chords = [
      [196, 233, 293],
      [220, 261, 329],
      [261, 329, 392],
      [293, 370, 440],
    ];
    const ch = chords[step % chords.length];
    ch.forEach((f, idx) => this.tone(f, 0.9, 'triangle', 0.07, 1, idx * 0.08));
  }

  public playVictory(): void {
    [523, 659, 784, 1046, 1318].forEach((n, i) =>
      this.tone(n, 0.32, 'triangle', 0.14, 1, i * 0.09),
    );
  }

  public playGameOver(): void {
    [349, 311, 261, 196].forEach((n, i) =>
      this.tone(n, 0.4, 'sawtooth', 0.13, 0.85, i * 0.16),
    );
  }
}

export const soundEngine = new SoundEngine();
