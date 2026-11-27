// HUD dan panel instrumen (DOM): angka, kompas, gauge, attitude, peringatan.
export class Hud {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.alt = this.el('hud-alt');
    this.spd = this.el('hud-spd');
    this.hdg = this.el('hud-hdg');
    this.vs = this.el('hud-vs');
    this.score = this.el('hud-score');
    this.strip = this.el('compass-strip');
    this.objective = this.el('objective');
    this.warning = this.el('warning');
    this.toastEl = this.el('toast');
    this.ball = this.el('attitude-ball');
    this.thr = this.el('gauge-thr');
    this.thrV = this.el('gauge-thr-v');
    this.fuel = this.el('gauge-fuel');
    this.fuelV = this.el('gauge-fuel-v');
    this.dmg = this.el('gauge-dmg');
    this.dmgV = this.el('gauge-dmg-v');
    this.knob = this.el('throttle-knob');
    this.buildCompass();
    this.toastTimer = null;
  }

  buildCompass() {
    // Dua putaran penuh label arah; digeser mengikuti heading.
    const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    let seq = '';
    for (let h = 0; h < 360; h += 10) {
      // Semua label tepat 4 karakter agar jarak antar label seragam.
      // Padding memakai nbsp (\u00A0): spasi biasa berurutan diciutkan
      // browser menjadi satu, nbsp tidak.
      seq += (names[h] || String(h).padStart(3, '0')).padEnd(4, ' ');
    }
    this.strip.textContent = seq + seq;
    this.strip.style.fontFamily = 'monospace';
    // Lebar karakter diukur langsung dari teks yang dirender (bukan asumsi),
    // karena monospace tiap sistem bisa berbeda dan HUD sempat display:none
    // saat konstruksi sehingga scrollWidth tidak bisa dipakai.
    this.pxPerChar = 0;
  }

  measureCompass() {
    try {
      const node = this.strip.firstChild;
      if (!node) return;
      const range = document.createRange();
      range.setStart(node, 160);
      range.setEnd(node, 164);
      const a = range.getBoundingClientRect().left;
      range.setStart(node, 164);
      range.setEnd(node, 168);
      const b = range.getBoundingClientRect().left;
      const px = (b - a) / 4;
      if (px > 0) this.pxPerChar = px;
    } catch { /* biarkan fallback */ }
    if (!this.pxPerChar) this.pxPerChar = 14.1;
  }

  update(plane, objectiveText) {
    this.alt.textContent = Math.round(plane.alt);
    this.spd.textContent = Math.round(plane.speed);
    this.hdg.textContent = String(Math.round(plane.heading)).padStart(3, '0');
    this.vs.textContent = Math.round(plane.vspeed * 60);
    this.score.textContent = plane.score;
    if (objectiveText !== undefined) this.objective.textContent = objectiveText;
    // Kompas: tengah label heading (putaran kedua, tiap label 4 karakter)
    // digeser tepat ke tengah strip (210px).
    if (!this.pxPerChar) this.measureCompass();
    const px = this.pxPerChar || 14.1;
    const centerStripX = (144 + (plane.heading / 10) * 4 + 2) * px;
    this.strip.style.left = `${210 - centerStripX}px`;
    // Attitude: bola berputar lawan bank, bergeser mengikuti pitch —
    // geser dijepit ±28px agar garis horizon SELALU terlihat di lingkaran.
    this.ball.style.transform = `translateY(${Math.max(-28, Math.min(28, plane.pitch * 2.4))}px) rotate(${-plane.bank}deg)`;
    this.thr.style.width = `${plane.throttle}%`;
    this.thrV.textContent = `${Math.round(plane.throttle)}%`;
    this.fuel.style.width = `${Math.max(0, plane.fuel)}%`;
    this.fuelV.textContent = `${Math.round(Math.max(0, plane.fuel))}%`;
    this.dmg.style.width = `${plane.damage}%`;
    this.dmgV.textContent = `${Math.round(plane.damage)}%`;
    this.knob.style.bottom = `${4 + (plane.throttle / 100) * 56}px`;
  }

  showWarning(text) {
    if (!text) {
      this.warning.classList.add('hidden');
      return;
    }
    this.warning.textContent = text;
    this.warning.classList.remove('hidden');
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 1800);
  }
}
