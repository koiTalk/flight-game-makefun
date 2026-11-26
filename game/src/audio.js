// Suara sintetis Web Audio — tanpa file audio, semua dibuat di kode.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.alarmTimer = 0;
  }

  // Dipanggil dari gestur pengguna (klik tombol mulai) agar AudioContext diizinkan.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain) this.engineGain.gain.value = this.muted ? 0 : 0.05;
    return this.muted;
  }

  // Dengung mesin mengikuti throttle (0..100) dan hidup/matinya mesin.
  setEngine(throttle, running) {
    if (!this.ctx || !this.engineOsc) return;
    const target = this.muted || !running ? 0 : 0.03 + throttle * 0.0006;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(48 + throttle * 0.9, this.ctx.currentTime, 0.1);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  ringChime() { this.blip(880, 0.25, 'sine', 0.16); setTimeout(() => this.blip(1320, 0.3, 'sine', 0.12), 90); }
  gateChime() { this.blip(660, 0.2, 'triangle', 0.14); setTimeout(() => this.blip(990, 0.25, 'triangle', 0.1), 80); }
  alarm() { this.blip(520, 0.12, 'square', 0.06); }
  thud() { this.blip(90, 0.3, 'sine', 0.22); }
  success() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'sine', 0.14), i * 130)); }
  crash() { this.blip(70, 0.7, 'sawtooth', 0.2); }
}
