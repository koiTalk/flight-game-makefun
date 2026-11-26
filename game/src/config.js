// Konstanta permainan dan definisi tiga misi. Satu-satunya sumber angka tuning.
export const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 720,
  // Model terbang (satuan arcade, bukan simulasi nyata).
  minSpeed: 45,          // kt — di bawah ini pesawat stall
  maxSpeed: 240,         // kt
  cruiseSpeed: 130,      // kt pada throttle 55%
  climbRate: 22,         // ft/detik pada pitch penuh dan kecepatan cukup
  turnRate: 26,          // derajat/detik pada bank penuh
  maxBank: 55,           // derajat
  maxPitch: 18,          // derajat
  fuelBurnBase: 0.55,    // %/detik pada throttle 50%
  fuelBurnThrottle: 1.4, // pengali tambahan pada throttle penuh
  stallSpeed: 62,        // kt
  damageGroundHit: 34,   // % per benturan tanah
  damageHardLanding: 42, // % bila touchdown terlalu keras
  worldSize: 9000,       // meter, sisi area terbang (dibatasi lembut)
  runwayHeading: 90,     // derajat — runway 09, menghadap timur
  runwayLength: 900,     // meter
  runwayWidth: 60,       // meter
};

// Setiap misi: titik awal, bahan bakar, dan daftar target.
// Koordinat dunia: x = timur (meter), z = utara (meter), alt = kaki.
export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'Cincin Langit',
    brief: 'Terbang melewati 8 cincin — tersisa ',
    start: { x: -2600, z: -2600, alt: 1500, heading: 45, speed: 130, throttle: 55 },
    fuel: 100,
    ringRadius: 55,
    ringPoints: 250,
    targets: [
      { x: -1800, z: -1800, alt: 1500 }, { x: -900, z: -1200, alt: 1800 },
      { x: 0, z: -600, alt: 1400 }, { x: 900, z: 100, alt: 2000 },
      { x: 1500, z: 900, alt: 1600 }, { x: 900, z: 1700, alt: 1300 },
      { x: 0, z: 2200, alt: 1800 }, { x: -900, z: 2600, alt: 1500 },
    ],
  },
  landing: {
    id: 'landing',
    name: 'Landasan Merpati',
    brief: 'Sejajarkan dengan runway 09 dan mendarat mulus — kecepatan di bawah 95 kt.',
    start: { x: -2800, z: 0, alt: 850, heading: 90, speed: 120, throttle: 45 },
    fuel: 100,
    ringRadius: 0,
    ringPoints: 0,
    targets: [],
    landingBonus: 1000,
  },
  canyon: {
    id: 'canyon',
    name: 'Ngarai Badai',
    brief: 'Lewati 6 gerbang di antara tebing — tersisa ',
    start: { x: -2600, z: 2600, alt: 900, heading: 135, speed: 140, throttle: 60 },
    fuel: 100,
    ringRadius: 48,
    ringPoints: 200,
    targets: [
      { x: -1700, z: 1700, alt: 800 }, { x: -900, z: 900, alt: 1000 },
      { x: -100, z: 100, alt: 750 }, { x: 700, z: -700, alt: 1100 },
      { x: 1500, z: -1500, alt: 850 }, { x: 2300, z: -2300, alt: 1000 },
    ],
  },
};

// Nama landmark untuk peta dan pesan — semuanya orisinal.
export const LANDMARKS = [
  { x: -1800, z: 1800, name: 'Danau Biru' },
  { x: 1800, z: 1800, name: 'Bukit Kembar' },
  { x: 0, z: 0, name: 'Lapangan Merpati' },
  { x: 2200, z: -1800, name: 'Hutan Pinus' },
  { x: -2200, z: -2000, name: 'Desa Awan' },
];
