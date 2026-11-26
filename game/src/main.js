// Loop utama, state menu/main/jeda/selesai, dan logika tiga misi.
import { CONFIG, MISSIONS } from './config.js';
import { createWorld } from './world.js';
import { createPlane, updatePlane, distToTarget } from './physics.js';
import { drawScene } from './render.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const hud = new Hud();
const input = new Input();
const sounds = new SoundBank();

let state = 'menu'; // menu | playing | paused | over
let mission = MISSIONS.rings;
let world = createWorld('rings');
let plane = createPlane(mission);
let activeIdx = 0;
let lastTime = performance.now();
let paused = false;

const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const debriefEl = document.getElementById('debrief');

function objectiveText() {
  if (mission.id === 'landing') return mission.brief;
  const left = mission.targets.length - activeIdx;
  return mission.brief + left + (mission.id === 'rings' ? ' cincin lagi.' : ' gerbang lagi.');
}

function showMenu() {
  state = 'menu';
  menuEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
  debriefEl.classList.add('hidden');
  mission = MISSIONS.rings;
  world = createWorld('rings');
  plane = createPlane(mission);
  activeIdx = 0;
  sounds.setEngine(0, false);
}

function startMission(id) {
  mission = MISSIONS[id] || MISSIONS.rings;
  world = createWorld(mission.id);
  plane = createPlane(mission);
  activeIdx = 0;
  paused = false;
  state = 'playing';
  sounds.ensure();
  sounds.setEngine(plane.throttle, true);
  menuEl.classList.add('hidden');
  debriefEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  hud.toast(mission.name);
}

function endMission(title, text) {
  state = 'over';
  sounds.setEngine(0, false);
  document.getElementById('debrief-title').textContent = title;
  document.getElementById('debrief-text').textContent = text;
  const mins = Math.floor(plane.flightTime / 60);
  const secs = Math.floor(plane.flightTime % 60);
  document.getElementById('debrief-stats').innerHTML =
    `Skor: <b>${plane.score}</b><br>` +
    `Waktu terbang: ${mins}:${String(secs).padStart(2, '0')} · ` +
    `Alt maks: ${Math.round(plane.maxAlt)} ft<br>` +
    `Bahan bakar tersisa: ${Math.round(Math.max(0, plane.fuel))}% · ` +
    `Kerusakan: ${Math.round(plane.damage)}%`;
  debriefEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
}

function missionComplete() {
  const timeBonus = Math.max(0, Math.round((180 - plane.flightTime) * 5));
  plane.score += timeBonus;
  sounds.success();
  endMission(
    'MISI SELESAI',
    `${mission.name} tuntas! Bonus waktu +${timeBonus}. Lembah Merpati aman di tanganmu.`
  );
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev === 'stall') { hud.toast('STALL!'); sounds.alarm(); }
    if (ev === 'lowfuel') { hud.toast('Bahan bakar menipis!'); sounds.alarm(); }
    if (ev === 'engineout') { hud.toast('Mesin mati — meluncur!'); sounds.alarm(); }
    if (ev === 'terrain') {
      hud.toast('Benturan! Kerusakan +' + Math.round(plane.damage) + '%');
      sounds.thud();
    }
    if (ev === 'landed') {
      sounds.thud();
      const quality = Math.max(0, Math.round(100 - Math.abs(plane.vspeed * 60) / 12 - plane.damage));
      const bonus = mission.id === 'landing'
        ? mission.landingBonus + Math.round(plane.fuel) * 5
        : 300 + quality * 2;
      plane.score += bonus;
      sounds.success();
      endMission('MENDARAT', `Roda menyentuh landasan dengan mulus. Bonus pendaratan +${bonus}.`);
    }
    if (ev === 'crash') {
      sounds.crash();
      endMission('PESAWAT JATUH', 'Merpati Air jatuh. Periksa kecepatan dan ketinggianmu, lalu coba lagi.');
    }
  }
}

function checkTargets() {
  if (!mission.targets.length || activeIdx >= mission.targets.length) return;
  const target = mission.targets[activeIdx];
  const dist = distToTarget(plane, target);
  if (dist < mission.ringRadius) {
    plane.ringsPassed += 1;
    plane.score += mission.ringPoints;
    activeIdx += 1;
    if (mission.id === 'rings') sounds.ringChime(); else sounds.gateChime();
    hud.toast(`+${mission.ringPoints} — ${activeIdx}/${mission.targets.length}`);
    if (activeIdx >= mission.targets.length) missionComplete();
  }
}

function update(dt) {
  if (state === 'menu') {
    // Sinematik latar menu: terbang lurus pelan tanpa habis bahan bakar.
    const demoInput = { rollInput: Math.sin(performance.now() / 4000) * 0.3, pitchInput: 0, throttleUp: false, throttleDown: false, airbrake: false };
    plane.fuel = 100;
    updatePlane(plane, demoInput, world, mission, dt);
    if (plane.alt < 1200) plane.alt = 1200;
    return;
  }
  if (state !== 'playing' || paused) return;
  const events = updatePlane(plane, input, world, mission, dt);
  handleEvents(events);
  if (state !== 'playing') return;
  checkTargets();
  sounds.setEngine(plane.throttle, plane.engineOn);
  // Peringatan prioritas tertinggi yang aktif.
  let warn = null;
  if (plane.stalled) warn = 'STALL — TURUNKAN HIDUNG';
  else if (!plane.engineOn) warn = 'ENGINE OUT';
  else if (plane.fuel <= 25) warn = 'LOW FUEL';
  else if (plane.alt < 300 && plane.vspeed < -500) warn = 'PULL UP';
  else if (plane.damage >= 70) warn = 'DAMAGE ' + Math.round(plane.damage) + '%';
  hud.showWarning(warn);
  if (plane.fuel <= 0 && !plane.engineOn && plane.alt <= 2) {
    sounds.crash();
    endMission('KEHABISAN BAHAN BAKAR', 'Mesin mati dan pesawat mendarat darurat di tanah. Misi gagal.');
  }
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  drawScene(ctx, plane, world, mission, mission.targets, activeIdx, now / 1000);
  if (state === 'playing' || state === 'paused') hud.update(plane, objectiveText());
  requestAnimationFrame(frame);
}

// Menu: klik misi (mouse) atau tombol keyboard.
document.querySelectorAll('.mission').forEach((btn) => {
  btn.addEventListener('click', () => startMission(btn.dataset.mission));
});
document.getElementById('debrief-again').addEventListener('click', () => startMission(mission.id));
document.getElementById('debrief-menu').addEventListener('click', showMenu);
input.onPause = () => {
  if (state !== 'playing') return;
  paused = !paused;
  hud.toast(paused ? 'Jeda — tekan P untuk lanjut' : 'Lanjut terbang');
};
input.onRestart = () => { if (state === 'playing' || state === 'over') startMission(mission.id); };
input.onMute = () => { const m = sounds.toggleMute(); hud.toast(m ? 'Suara mati' : 'Suara hidup'); };

// Dukungan screenshot/playtest: ?mission=rings|landing|canyon langsung mulai.
const params = new URLSearchParams(location.search);
const autoMission = params.get('mission');
if (autoMission && MISSIONS[autoMission]) {
  startMission(autoMission);
} else {
  showMenu();
}

// Hook untuk verifikasi headless (bukan bagian permainan).
window.__game = {
  get state() { return state; },
  get missionId() { return mission.id; },
  get plane() { return plane; },
  get activeIdx() { return activeIdx; },
  start: startMission,
};

requestAnimationFrame(frame);
