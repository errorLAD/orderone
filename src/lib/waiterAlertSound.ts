class WaiterAlertSound {
  private context: AudioContext | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private enabled = true;

  private getContext() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    return this.context;
  }

  private playPattern() {
    const context = this.getContext();
    if (!context || !this.enabled) return;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const start = context.currentTime;
    // A bright, short call-bell pattern distinct from the order notification chimes.
    [880, 1174.66, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * 0.24;
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.2);
    });
  }

  start(intervalSeconds = 6) {
    if (!this.enabled || this.interval) return;
    this.playPattern();
    this.interval = setInterval(() => this.playPattern(), Math.max(3, intervalSeconds) * 1000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}

export const waiterAlertSound = new WaiterAlertSound();
