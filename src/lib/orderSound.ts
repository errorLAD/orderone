/**
 * OrderOne.in - Web Audio API Synthesizer for Real-Time Order Alerts
 * 
 * Synthesizes clear, professional, attention-grabbing chimes and repeating ringing bells
 * directly in the browser with zero external audio assets or network latency.
 */

export type OrderChimeType = 'store' | 'menu';

class OrderSoundEngine {
  private audioCtx: AudioContext | null = null;
  private ringInterval: NodeJS.Timeout | null = null;
  private waiterRingInterval: NodeJS.Timeout | null = null;
  private waiterAlertEnabled = true;
  private isRingingActive: boolean = false;
  private volume: number = 0.8;
  private soundEnabled: boolean = true;
  private onAutoplayBlockedCallback: ((blocked: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('orderone_sound_enabled');
      if (savedSound !== null) {
        this.soundEnabled = savedSound === 'true';
      }
      const savedVolume = localStorage.getItem('orderone_sound_volume');
      if (savedVolume !== null) {
        const parsed = parseFloat(savedVolume);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
    }
  }

  public setAutoplayBlockedListener(callback: (blocked: boolean) => void) {
    this.onAutoplayBlockedCallback = callback;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      if (this.onAutoplayBlockedCallback) {
        this.onAutoplayBlockedCallback(true);
      }
    }

    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on explicit user interaction (click, tap, keypress).
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Play a tiny silent tone to confirm audio pipeline is active
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      if (this.onAutoplayBlockedCallback) {
        this.onAutoplayBlockedCallback(false);
      }
      return true;
    } catch (e) {
      console.warn('Could not unlock audio context:', e);
      return false;
    }
  }

  public isAutoplayBlocked(): boolean {
    if (!this.audioCtx) return false;
    return this.audioCtx.state === 'suspended';
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderone_sound_enabled', String(enabled));
    }
    if (!enabled) {
      this.stopRinging();
    }
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volume = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderone_sound_volume', String(clamped));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Plays a single melodic alert chime for the given order type.
   */
  public playChime(type: OrderChimeType = 'store') {
    if (!this.soundEnabled || this.volume <= 0) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          if (this.onAutoplayBlockedCallback) {
            this.onAutoplayBlockedCallback(true);
          }
        });
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);

      if (type === 'store') {
        // Bright, crisp 2-tone chime for retail/storefront orders (D5 -> A5)
        this.synthesizeTone(ctx, masterGain, 587.33, now, 0.35, 'triangle');
        this.synthesizeTone(ctx, masterGain, 880.00, now + 0.14, 0.45, 'sine');
      } else {
        // Warm 3-tone arpeggio chime for dining/kitchen tickets (C5 -> E5 -> G5)
        this.synthesizeTone(ctx, masterGain, 523.25, now, 0.3, 'sine');
        this.synthesizeTone(ctx, masterGain, 659.25, now + 0.12, 0.3, 'triangle');
        this.synthesizeTone(ctx, masterGain, 783.99, now + 0.24, 0.5, 'sine');
      }
    } catch (e) {
      console.warn('Error playing order chime:', e);
    }
  }

  /**
   * Starts a continuous ringing loop (plays chime every 2 seconds) until stopRinging() is called.
   */
  public startRinging(type: OrderChimeType = 'store') {
    if (!this.soundEnabled) return;

    this.isRingingActive = true;

    // Check if autoplay is blocked
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      if (this.onAutoplayBlockedCallback) {
        this.onAutoplayBlockedCallback(true);
      }
    }

    // Play immediately
    this.playChime(type);

    // Clear existing interval if any
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
    }

    // Loop chime repeatedly every 2.2 seconds
    this.ringInterval = setInterval(() => {
      if (!this.isRingingActive || !this.soundEnabled) {
        this.stopRinging();
        return;
      }
      this.playChime(type);
    }, 2200);
  }

  /**
   * Stops any active ringing loop immediately.
   */
  public stopRinging() {
    this.isRingingActive = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  /** A separate call-bell loop that shares the dashboard's unlocked audio context. */
  public startWaiterRinging(repeatEverySeconds = 6) {
    if (!this.waiterAlertEnabled || this.waiterRingInterval) return;
    this.playWaiterCallChime();
    this.waiterRingInterval = setInterval(() => {
      if (!this.waiterAlertEnabled) {
        this.stopWaiterRinging();
        return;
      }
      this.playWaiterCallChime();
    }, Math.max(3, repeatEverySeconds) * 1000);
  }

  public stopWaiterRinging() {
    if (this.waiterRingInterval) clearInterval(this.waiterRingInterval);
    this.waiterRingInterval = null;
  }

  public setWaiterAlertEnabled(enabled: boolean) {
    this.waiterAlertEnabled = enabled;
    if (!enabled) this.stopWaiterRinging();
  }

  private playWaiterCallChime() {
    if (!this.waiterAlertEnabled || this.volume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => this.onAutoplayBlockedCallback?.(true));
      }
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);
      // Short double call-bell: intentionally distinct from store/menu order chimes.
      this.synthesizeTone(ctx, masterGain, 1046.5, now, 0.22, 'square');
      this.synthesizeTone(ctx, masterGain, 784, now + 0.28, 0.28, 'triangle');
      this.synthesizeTone(ctx, masterGain, 1046.5, now + 0.62, 0.22, 'square');
    } catch (error) {
      console.warn('Error playing waiter call alert:', error);
    }
  }

  public isRinging(): boolean {
    return this.isRingingActive;
  }

  private synthesizeTone(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine'
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Harmonious slight pitch bend for rich acoustics
    osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + duration * 0.2);

    // Attack - Decay envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

// Singleton instance for the application
export const orderSound = new OrderSoundEngine();
