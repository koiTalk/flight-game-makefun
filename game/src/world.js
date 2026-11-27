// Dunia: lembah Merpati — sawah, sungai, jalan, danau, hutan, bukit, tebing —
// dibuat deterministik dari seed agar setiap sesi sama, tanpa aset luar.
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

// Sawah bervariasi: hijau padi, kuning kering, cokelat olahan, hijau tua.
const FIELD_COLORS = ['#7fae56', '#a8b45a', '#5d9a4e', '#c2b25e', '#8fae62', '#6fae7e', '#b7a04b', '#4e8a4a', '#9dbb6a', '#7c9a4d'];
const FIELD_ALT = ['#6b9a48', '#98a44c', '#4e8a42', '#ac9c4e', '#7d9c54', '#5f9c6c', '#a58f3f', '#427a3e', '#8aa85a', '#6b8a41'];

export function createWorld(missionId) {
  const rand = mulberry32(20261126);
  const fields = [];
  const cell = 500;
  for (let gx = -4200; gx < 4200; gx += cell) {
    for (let gz = -4200; gz < 4200; gz += cell) {
      // Runway dan sekitarnya dibiarkan rumput polos.
      if (Math.abs(gx) < 700 && Math.abs(gz) < 300) continue;
      // Danau Biru: bukan sawah.
      if (Math.hypot(gx + 1550, gz - 1650) < 900) continue;
      const ci = Math.floor(rand() * FIELD_COLORS.length);
      fields.push({
        x: gx, z: gz, size: cell,
        color: FIELD_COLORS[ci], alt: FIELD_ALT[ci],
        // Sawah bertingkat: 2-3 larik sejajar dengan arah acak.
        strips: 2 + Math.floor(rand() * 2), horizontal: rand() < 0.5,
        // Sebagian petak tergenang (padi basah, memantulkan langit).
        wet: rand() < 0.22,
      });
    }
  }
  // Sungai berkelok dari barat laut ke tenggara.
  const river = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    river.push({ x: -4200 + t * 8400, z: -2600 + Math.sin(t * 9.1) * 700 + t * 4200 });
  }
  // Jalan utama: berkelok timur-barat di selatan runway, plus jalan
  // utara-selatan ke desa; jalan tanah ke lapangan terbang.
  const roads = [];
  const roadA = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    roadA.push({ x: -4200 + t * 8400, z: 900 + Math.sin(t * 7.3) * 420 });
  }
  const roadB = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    roadB.push({ x: 1700 + Math.sin(t * 5.2) * 350, z: -4200 + t * 8400 });
  }
  const roadC = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    // Jalan tanah barat daya — berhenti di luar runway, tidak memotongnya.
    roadC.push({ x: -4200 + t * 3600, z: -1400 + t * 1050 });
  }
  roads.push(roadA, roadB, roadC);
  // Danau Biru di barat laut lapangan.
  const lake = { x: -1800, z: 1800, rx: 750, rz: 480 };
  // Awan: posisi dunia, ketinggian kaki, ukuran.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: -4000 + rand() * 8000, z: -4000 + rand() * 8000,
      alt: 2600 + rand() * 1800, size: 120 + rand() * 220,
    });
  }
  // Hutan berkelompok di beberapa rumpun, bukan satu titik saja.
  const groves = [
    { x: 2200, z: -1800, r: 800 }, { x: -2600, z: 800, r: 650 },
    { x: 1200, z: 2800, r: 700 }, { x: -800, z: -3200, r: 750 },
    { x: 3000, z: 1200, r: 600 }, { x: -3200, z: -900, r: 650 },
    { x: 600, z: -2600, r: 550 },
  ];
  const trees = [];
  for (const g of groves) {
    const n = 26 + Math.floor(rand() * 14);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * g.r;
      trees.push({
        x: g.x + Math.cos(a) * d, z: g.z + Math.sin(a) * d,
        size: 0.8 + rand() * 0.9, shade: rand(),
      });
    }
  }
  // Bukit berbayang di tepi lembah (di luar koridor terbang utama).
  const hills = [
    { x: -3600, z: -2400, r: 1100, h: 950 }, { x: 3400, z: -3200, r: 1000, h: 820 },
    { x: -3400, z: 3200, r: 1050, h: 900 }, { x: 3300, z: 3000, r: 950, h: 780 },
    { x: 0, z: -3900, r: 1200, h: 700 }, { x: -3900, z: 400, r: 900, h: 650 },
  ];
  // Punggung gunung di kejauhan untuk siluet horizon.
  const ridges = [];
  for (let i = 0; i < 3; i++) {
    const peaks = [];
    for (let j = 0; j <= 12; j++) peaks.push(0.35 + rand() * 0.65);
    ridges.push({ depth: i, peaks, tint: ['#5d7ea6', '#4a6b90', '#3a5a7c'][i] });
  }
  return { missionId, fields, river, roads, lake, clouds, trees, groves, hills, ridges, landmarks: LANDMARKS };
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

// Ketinggian tanah (kaki) di titik dunia. Ngarai: dinding curam di luar
// koridor; misi lain: datar kecuali pegunungan di tepi peta.
export function heightAt(world, x, z) {
  if (world.missionId === 'canyon') {
    // Koridor diagonal dari (-2600,2600) ke (2300,-2300): jarak tegak lurus
    // ke garis arah (1,-1) adalah |dx + dz| / sqrt(2).
    const dx = x + 2600;
    const dz = z - 2600;
    const side = (dx + dz) / Math.SQRT2;
    const wall = Math.max(0, (Math.abs(side) - 380) / 500);
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
