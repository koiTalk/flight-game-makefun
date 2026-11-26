// Dunia: lembah Merpati — sawah, sungai, runway, tebing — dibuat deterministik
// dari seed agar setiap sesi sama, tanpa aset luar.
import { CONFIG, LANDMARKS } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD_COLORS = ['#7fae56', '#a8b45a', '#5d9a4e', '#c2b25e', '#8fae62', '#6fae7e'];

export function createWorld(missionId) {
  const rand = mulberry32(20261126);
  const fields = [];
  const cell = 500;
  for (let gx = -4200; gx < 4200; gx += cell) {
    for (let gz = -4200; gz < 4200; gz += cell) {
      // Runway dan sekitarnya dibiarkan rumput polos.
      if (Math.abs(gx) < 700 && Math.abs(gz) < 300) continue;
      fields.push({
        x: gx, z: gz, size: cell,
        color: FIELD_COLORS[Math.floor(rand() * FIELD_COLORS.length)],
      });
    }
  }
  // Sungai berkelok dari barat laut ke tenggara.
  const river = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    river.push({ x: -4200 + t * 8400, z: -2600 + Math.sin(t * 9.1) * 700 + t * 4200 });
  }
  // Awan: posisi dunia, ketinggian kaki, ukuran.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: -4000 + rand() * 8000, z: -4000 + rand() * 8000,
      alt: 2600 + rand() * 1800, size: 120 + rand() * 220,
    });
  }
  // Pohon berkelompok di dekat landmark hutan.
  const trees = [];
  for (let i = 0; i < 90; i++) {
    trees.push({
      x: 2200 + (rand() - 0.5) * 1400, z: -1800 + (rand() - 0.5) * 1400,
    });
  }
  // Punggung gunung di kejauhan untuk siluet horizon.
  const ridges = [];
  for (let i = 0; i < 3; i++) {
    const peaks = [];
    for (let j = 0; j <= 12; j++) peaks.push(0.35 + rand() * 0.65);
    ridges.push({ depth: i, peaks, tint: ['#5d7ea6', '#4a6b90', '#3a5a7c'][i] });
  }
  return { missionId, fields, river, clouds, trees, ridges, landmarks: LANDMARKS };
}

// Posisi relatif sebuah titik dunia terhadap pesawat: fwd = jarak ke depan
// sepanjang heading, lat = jarak lateral (positif = kanan).
export function relCoords(plane, wx, wz) {
  const dx = wx - plane.x;
  const dz = wz - plane.z;
  const rad = (plane.heading * Math.PI) / 180;
  const fwd = dx * Math.sin(rad) + dz * Math.cos(rad);
  const lat = dx * Math.cos(rad) - dz * Math.sin(rad);
  return { fwd, lat };
}

// Ketinggian tanah (kaki) di titik dunia. Ngarai: dinding naik di luar koridor;
// misi lain: datar kecuali pegunungan di tepi peta.
export function heightAt(world, x, z) {
  if (world.missionId === 'canyon') {
    // Koridor diagonal dari (-2600,2600) ke (2300,-2300): jarak tegak lurus
    // ke garis arah (1,-1) adalah |dx + dz| / sqrt(2).
    const dx = x + 2600;
    const dz = z - 2600;
    const side = (dx + dz) / Math.SQRT2;
    const wall = Math.max(0, (Math.abs(side) - 480) / 900);
    return Math.min(2600, wall * 2600);
  }
  const edge = Math.max(Math.abs(x), Math.abs(z));
  if (edge < 3600) return 0;
  return Math.min(3000, ((edge - 3600) / 900) * 3000);
}

export function onRunway(x, z) {
  return Math.abs(x) <= CONFIG.runwayLength / 2 && Math.abs(z) <= CONFIG.runwayWidth / 2;
}

export function runwayCenterDist(x, z) {
  return Math.abs(z);
}
