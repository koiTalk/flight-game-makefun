// Status tombol keyboard — dibaca tiap frame oleh model terbang.
export class Input {
  constructor() {
    this.keys = new Set();
    this.onPause = null;
    this.onRestart = null;
    this.onMute = null;
    this.onAnyKey = null;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'p' && this.onPause) this.onPause();
      if (e.key.toLowerCase() === 'r' && this.onRestart) this.onRestart();
      if (e.key.toLowerCase() === 'm' && this.onMute) this.onMute();
      if (this.onAnyKey) this.onAnyKey(e.key);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }

  // -1..1: belok (negatif = kiri), pitch (negatif = menukik), throttle naik/turun.
  get rollInput() {
    if (this.down('a', 'arrowleft')) return -1;
    if (this.down('d', 'arrowright')) return 1;
    return 0;
  }
  get pitchInput() {
    if (this.down('arrowup')) return 1;
    if (this.down('arrowdown')) return -1;
    return 0;
  }
  get throttleUp() { return this.down('w'); }
  get throttleDown() { return this.down('s'); }
  get airbrake() { return this.down(' '); }
}
