// ── GovPlay Sound Engine ──────────────────────────────────────────────
// Web Audio API synthesizer — all sounds are generated, no audio files needed.

class GameSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggle(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Quick tone helper */
  private tone(freq: number, duration: number, type: OscillatorType = 'sine', startTime = 0): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration / 1000);
  }

  /** Noise burst helper */
  private noise(duration: number, startTime = 0): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * (duration / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration / 1000);
    src.connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + startTime);
  }

  /** 800Hz sine, 30ms, quick fade — piece movement */
  move(): void {
    this.tone(800, 30);
  }

  /** 400->600Hz sine sweep, 80ms — capture/take */
  capture(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /** Ascending arpeggio C5->E5->G5->C6, 60ms each — victory */
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => this.tone(freq, 60, 'sine', i * 0.07));
  }

  /** Descending C4->A3->F3, 80ms each, triangle — defeat */
  lose(): void {
    const notes = [261.63, 220.0, 174.61]; // C4, A3, F3
    notes.forEach((freq, i) => this.tone(freq, 80, 'triangle', i * 0.09));
  }

  /** 200Hz square wave, 100ms — error/invalid */
  error(): void {
    this.tone(200, 100, 'square');
  }

  /** Noise burst 20ms — clock tick */
  tick(): void {
    this.noise(20);
  }

  /** 1200->1600Hz sine, 50ms — point scored */
  score(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /** Noise burst + low thump — dice roll */
  dice(): void {
    this.noise(40);
    this.tone(80, 60, 'sine', 0.02);
  }

  /** Filtered noise sweep — card deal */
  deal(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(6000, ctx.currentTime + 0.06);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  /** 3000Hz sine 10ms — keyboard type */
  type(): void {
    this.tone(3000, 10);
  }
}

export const gameSounds = new GameSoundEngine();
