// Gambar dunia: langit, horizon, tanah perspektif, runway, cincin, pesawat.
import { CONFIG } from './config.js';
import { relCoords } from './world.js';

const FOCAL = 520; // piksel per meter pada jarak 1 m

function groundScreen(plane, horizonY, fwd, lat, heightM) {
  const scale = FOCAL / Math.max(8, fwd);
  const altM = plane.alt * 0.3048;
  return {
    x: CONFIG.canvasWidth / 2 + lat * scale,
    y: horizonY + (altM - heightM) * scale,
    scale,
  };
}

// Proyeksi titik tanah; titik di belakang pesawat dijepit ke depan agar
// objek besar (runway) tidak hilang saat pesawat sudah di atasnya.
function proj(plane, horizonY, wx, wz, heightM = 0) {
  const r = relCoords(plane, wx, wz);
  const fwd = Math.max(14, r.fwd);
  return groundScreen(plane, horizonY, fwd, r.lat, heightM);
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawSky(ctx, plane, time) {
  const W = CONFIG.canvasWidth;
  const H = CONFIG.canvasHeight;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2f6fb4');
  sky.addColorStop(0.55, '#7fb8e0');
  sky.addColorStop(0.75, '#cfe8f5');
  sky.addColorStop(1, '#e8f2f8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Matahari mengikuti arah pandang (bearing 200°).
  let rel = ((200 - plane.heading + 540) % 360) - 180;
  if (Math.abs(rel) < 85) {
    const sx = W / 2 + Math.tan((rel * Math.PI) / 180) * 420;
    const sy = 92;
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 120);
    glow.addColorStop(0, 'rgba(255,244,200,0.95)');
    glow.addColorStop(0.25, 'rgba(255,220,140,0.55)');
    glow.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 130, sy - 130, 260, 260);
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  void time;
}

function drawRidges(ctx, plane, horizonY, world) {
  const W = CONFIG.canvasWidth;
  for (const ridge of world.ridges) {
    const h = 60 + ridge.depth * 42;
    const shift = (((plane.heading / 360) * (ridge.depth + 1) * 0.5) % 1) * W;
    ctx.fillStyle = ridge.tint;
    ctx.globalAlpha = 0.85 - ridge.depth * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    const tops = [];
    for (let x = -W; x <= W * 2; x += 90) {
      const idx = Math.floor((((x + shift) / 90) % ridge.peaks.length + ridge.peaks.length) % ridge.peaks.length);
      const y = horizonY - ridge.peaks[idx] * h;
      tops.push([x, y]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W * 2, horizonY);
    ctx.closePath();
    ctx.fill();
    // Garis punggung terang + salju di puncak tertinggi.
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    tops.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y] of tops) {
      if (y < horizonY - h * 0.82) {
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 12); ctx.lineTo(x, y - 2); ctx.lineTo(x + 14, y + 12);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawFields(ctx, plane, horizonY, world) {
  for (const f of world.fields) {
    const corners = [
      [f.x, f.z], [f.x + f.size, f.z],
      [f.x + f.size, f.z + f.size], [f.x, f.z + f.size],
    ];
    const pts = [];
    let ok = true;
    for (const [wx, wz] of corners) {
      const r = relCoords(plane, wx, wz);
      if (r.fwd < 40 || r.fwd > 4200) { ok = false; break; }
      pts.push(groundScreen(plane, horizonY, r.fwd, r.lat, 0));
    }
    if (!ok) continue;
    // Sawah bertingkat: larik-larik berselang warna di dalam petak.
    for (let s = 0; s < f.strips; s++) {
      const t0 = s / f.strips;
      const t1 = (s + 1) / f.strips;
      let quad;
      if (f.horizontal) {
        quad = [lerpPt(pts[0], pts[3], t0), lerpPt(pts[1], pts[2], t0), lerpPt(pts[1], pts[2], t1), lerpPt(pts[0], pts[3], t1)];
      } else {
        quad = [lerpPt(pts[0], pts[1], t0), lerpPt(pts[0], pts[1], t1), lerpPt(pts[3], pts[2], t1), lerpPt(pts[3], pts[2], t0)];
      }
      ctx.fillStyle = s % 2 === 0 ? f.color : f.alt;
      ctx.beginPath();
      ctx.moveTo(quad[0].x, quad[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(quad[i].x, quad[i].y);
      ctx.closePath();
      ctx.fill();
    }
    // Petak tergenang: kilau biru langit di larik tengah.
    if (f.wet) {
      ctx.fillStyle = 'rgba(140,190,230,0.35)';
      ctx.beginPath();
      const a = lerpPt(pts[0], pts[3], 0.4);
      const b = lerpPt(pts[1], pts[2], 0.4);
      const c = lerpPt(pts[1], pts[2], 0.6);
      const d = lerpPt(pts[0], pts[3], 0.6);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath(); ctx.fill();
    }
    // Garis batas sawah tipis.
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawRoads(ctx, plane, horizonY, world) {
  for (const road of world.roads || []) {
    const pts = [];
    for (const p of road) {
      const r = relCoords(plane, p.x, p.z);
      if (r.fwd < 40 || r.fwd > 4200) { pts.push(null); continue; }
      pts.push(groundScreen(plane, horizonY, r.fwd, r.lat, 0));
    }
    // Tepi gelap lalu badan jalan terang, agar jalan terbaca dari jauh.
    for (const [color, wMul] of [['#6d5b3f', 34], ['#cbb894', 22]]) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (const s of pts) {
        if (!s) { started = false; continue; }
        ctx.lineWidth = Math.max(1.5, wMul * s.scale);
        if (!started) { ctx.moveTo(s.x, s.y); started = true; }
        else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }
  }
}

function drawLake(ctx, plane, horizonY, world) {
  const lake = world.lake;
  if (!lake) return;
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const wx = lake.x + Math.cos(a) * lake.rx;
    const wz = lake.z + Math.sin(a) * lake.rz;
    const r = relCoords(plane, wx, wz);
    if (r.fwd < 40 || r.fwd > 4200) return;
    pts.push(groundScreen(plane, horizonY, r.fwd, r.lat, 0));
  }
  const grad = ctx.createLinearGradient(0, pts[0].y - 40, 0, pts[0].y + 80);
  grad.addColorStop(0, '#7fc4e8');
  grad.addColorStop(1, '#2f6fa8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHills(ctx, plane, horizonY, world) {
  for (const hill of world.hills || []) {
    const r = relCoords(plane, hill.x, hill.z);
    if (r.fwd < 60 || r.fwd > 6000) continue;
    const base = groundScreen(plane, horizonY, r.fwd, r.lat, 0);
    const hM = hill.h * 0.3048;
    const apex = groundScreen(plane, horizonY, r.fwd, r.lat, hM);
    const halfW = hill.r * base.scale;
    if (halfW < 6) continue;
    // Sisi terang (matahari) vs sisi bayangan.
    ctx.fillStyle = '#5d8a4e';
    ctx.beginPath();
    ctx.moveTo(base.x - halfW, base.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base.x, base.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3f6b3a';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base.x + halfW, base.y);
    ctx.closePath(); ctx.fill();
    // Tutup salju kecil di puncak.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(apex.x - halfW * 0.14, apex.y + (base.y - apex.y) * 0.16);
    ctx.lineTo(apex.x, apex.y);
    ctx.lineTo(apex.x + halfW * 0.14, apex.y + (base.y - apex.y) * 0.16);
    ctx.closePath(); ctx.fill();
  }
}

function drawRiver(ctx, plane, horizonY, world) {
  ctx.strokeStyle = '#4a90c2';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let started = false;
  for (const p of world.river) {
    const r = relCoords(plane, p.x, p.z);
    if (r.fwd < 40 || r.fwd > 4200) { started = false; continue; }
    const s = groundScreen(plane, horizonY, r.fwd, r.lat, 0);
    ctx.lineWidth = Math.max(2, 26 * s.scale);
    if (!started) { ctx.moveTo(s.x, s.y); started = true; }
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
  // Kilau terang di tengah sungai.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  started = false;
  for (const p of world.river) {
    const r = relCoords(plane, p.x, p.z);
    if (r.fwd < 40 || r.fwd > 4200) { started = false; continue; }
    const s = groundScreen(plane, horizonY, r.fwd, r.lat, 0);
    ctx.lineWidth = Math.max(1, 7 * s.scale);
    if (!started) { ctx.moveTo(s.x, s.y); started = true; }
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
}

function drawRunway(ctx, plane, horizonY) {
  const L = CONFIG.runwayLength / 2;
  const Wd = CONFIG.runwayWidth / 2;
  const corners = [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]];
  const pts = [];
  let anyAhead = false;
  for (const [wx, wz] of corners) {
    if (relCoords(plane, wx, wz).fwd >= 12) anyAhead = true;
    pts.push(proj(plane, horizonY, wx, wz));
  }
  if (!anyAhead) return;
  // Bahu rumput gelap di bawah aspal agar strip menonjol.
  ctx.fillStyle = '#4a6b3a';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Strip aspal gelap lebar.
  ctx.fillStyle = '#26292f';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Garis tepi putih penuh.
  ctx.strokeStyle = '#f5f0dc';
  ctx.lineWidth = Math.max(2, 6 * pts[0].scale);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();
  // Garis tengah putus-putus tebal.
  ctx.strokeStyle = '#f5f0dc';
  ctx.lineWidth = Math.max(2, 8 * pts[0].scale);
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  const a = proj(plane, horizonY, -L + 60, 0);
  const b = proj(plane, horizonY, L - 60, 0);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Markah threshold (piano keys) di kedua ujung + zona touchdown.
  for (const endX of [-L + 18, L - 46]) {
    for (let i = 0; i < 6; i++) {
      const z0 = -Wd + 8 + i * ((2 * Wd - 16) / 6);
      const q = [
        proj(plane, horizonY, endX, z0), proj(plane, horizonY, endX + 26, z0),
        proj(plane, horizonY, endX + 26, z0 + 7), proj(plane, horizonY, endX, z0 + 7),
      ];
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y);
      for (let k = 1; k < 4; k++) ctx.lineTo(q[k].x, q[k].y);
      ctx.closePath(); ctx.fill();
    }
  }
  // Angka "09" putih di dekat ambang barat, seukuran lebar landasan
  // (tidak lebih besar dari strip aspalnya) agar terbaca sebagai cat tanah.
  const num = proj(plane, horizonY, -L + 170, 0);
  const numSize = Math.round(Math.min(64, Math.max(16, 72 * num.scale)));
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${numSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('09', num.x, num.y);
  ctx.textBaseline = 'alphabetic';
}

// Dinding tebing ngarai: dua muka batu vertikal yang mengapit koridor.
// Koridor diagonal (-2600,2600) -> (2300,-2300); muka dinding di sisi ±480 m.
function drawCanyonWalls(ctx, plane, horizonY, world) {
  if (world.missionId !== 'canyon') return;
  const SX = -2600;
  const SZ = 2600;
  const dx = 1 / Math.SQRT2;
  const dz = -1 / Math.SQRT2;
  const px = 1 / Math.SQRT2; // tegak lurus koridor
  const pz = 1 / Math.SQRT2;
  const WALL_H = 790; // meter (~2600 ft)
  const segs = [];
  for (let t = -300; t < 7600; t += 350) {
    for (const side of [-1, 1]) {
      // Puncak bergerigi: tiap segmen punya tinggi sendiri (±90 m).
      const segH = WALL_H + (((t / 350) * 37 + side * 53) % 180) - 90;
      const base = (tt, off, h) => {
        const wx = SX + dx * tt + px * off;
        const wz = SZ + dz * tt + pz * off;
        const r = relCoords(plane, wx, wz);
        return { r, s: groundScreen(plane, horizonY, Math.max(14, r.fwd), r.lat, h) };
      };
      const off = side * 480;
      const b0 = base(t, off, 0);
      const b1 = base(t + 350, off, 0);
      const t0 = base(t, off, segH);
      const t1 = base(t + 350, off, segH);
      const rim0 = base(t, off + side * 700, segH + 70);
      const rim1 = base(t + 350, off + side * 700, segH + 70);
      if (b0.r.fwd < 20 && b1.r.fwd < 20) continue;
      if (b0.r.fwd > 7000 && b1.r.fwd > 7000) continue;
      const midFwd = (Math.max(14, b0.r.fwd) + Math.max(14, b1.r.fwd)) / 2;
      segs.push({ side, midFwd, b0, b1, t0, t1, rim0, rim1, idx: Math.floor(t / 350) });
    }
  }
  // Lukis dari jauh ke dekat agar dinding dekat menutupi yang jauh.
  segs.sort((p, q) => q.midFwd - p.midFwd);
  for (const s of segs) {
    const shade = ((s.idx * 7 + (s.side < 0 ? 3 : 0)) % 5) * 0.09;
    // Muka batu: sisi kanan berbayang, sisi kiri kena matahari.
    const baseCol = s.side < 0 ? [150, 118, 92] : [104, 82, 64];
    ctx.fillStyle = `rgb(${Math.round(baseCol[0] - shade * 160)},${Math.round(baseCol[1] - shade * 140)},${Math.round(baseCol[2] - shade * 110)})`;
    ctx.beginPath();
    ctx.moveTo(s.b0.s.x, s.b0.s.y);
    ctx.lineTo(s.b1.s.x, s.b1.s.y);
    ctx.lineTo(s.t1.s.x, s.t1.s.y);
    ctx.lineTo(s.t0.s.x, s.t0.s.y);
    ctx.closePath(); ctx.fill();
    // Retakan vertikal tambahan (tekstur batu, bukan bercak halus).
    // Strata horizontal + retakan vertikal.
    ctx.strokeStyle = 'rgba(40,26,16,0.45)';
    ctx.lineWidth = Math.max(1, 3 * s.b0.s.scale);
    for (const f of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.moveTo(lerpPt(s.b0.s, s.t0.s, f).x, lerpPt(s.b0.s, s.t0.s, f).y);
      ctx.lineTo(lerpPt(s.b1.s, s.t1.s, f).x, lerpPt(s.b1.s, s.t1.s, f).y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(lerpPt(s.b0.s, s.b1.s, 0.5).x, lerpPt(s.b0.s, s.b1.s, 0.5).y);
    ctx.lineTo(lerpPt(s.t0.s, s.t1.s, 0.5).x, lerpPt(s.t0.s, s.t1.s, 0.5).y);
    ctx.stroke();
    // Puncak tebing: punggung batu + garis hijau vegetasi.
    ctx.fillStyle = s.side < 0 ? '#7d5f45' : '#5e4630';
    ctx.beginPath();
    ctx.moveTo(s.t0.s.x, s.t0.s.y);
    ctx.lineTo(s.t1.s.x, s.t1.s.y);
    ctx.lineTo(s.rim1.s.x, s.rim1.s.y);
    ctx.lineTo(s.rim0.s.x, s.rim0.s.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4e7a3a';
    ctx.lineWidth = Math.max(2, 6 * s.b0.s.scale);
    ctx.beginPath();
    ctx.moveTo(s.t0.s.x, s.t0.s.y);
    ctx.lineTo(s.t1.s.x, s.t1.s.y);
    ctx.stroke();
    // Bayangan gelap di kaki dinding.
    ctx.fillStyle = 'rgba(20,12,6,0.35)';
    ctx.beginPath();
    ctx.moveTo(s.b0.s.x, s.b0.s.y);
    ctx.lineTo(s.b1.s.x, s.b1.s.y);
    ctx.lineTo(lerpPt(s.b1.s, s.t1.s, 0.22).x, lerpPt(s.b1.s, s.t1.s, 0.22).y);
    ctx.lineTo(lerpPt(s.b0.s, s.t0.s, 0.22).x, lerpPt(s.b0.s, s.t0.s, 0.22).y);
    ctx.closePath(); ctx.fill();
  }
}

function drawTrees(ctx, plane, horizonY, world) {
  for (const t of world.trees) {
    const r = relCoords(plane, t.x, t.z);
    if (r.fwd < 40 || r.fwd > 2200) continue;
    const s = groundScreen(plane, horizonY, r.fwd, r.lat, 0);
    const size = Math.max(2, 16 * s.scale * t.size);
    // Bayangan di tanah.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(s.x + size * 0.4, s.y, size * 0.9, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Batang.
    ctx.strokeStyle = '#5a3d24';
    ctx.lineWidth = Math.max(1, size * 0.18);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x, s.y - size * 0.9);
    ctx.stroke();
    // Tajuk bundar berlapis: terang di atas, gelap di bawah.
    const shade = t.shade < 0.5 ? '#2f6b34' : '#3a7d3c';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(s.x, s.y - size * 1.3, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a05a';
    ctx.beginPath();
    ctx.arc(s.x - size * 0.25, s.y - size * 1.55, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(ctx, plane, horizonY, world) {
  for (const c of world.clouds) {
    const r = relCoords(plane, c.x, c.z);
    if (r.fwd < 30 || r.fwd > 6000) continue;
    const hM = c.alt * 0.3048;
    const s = groundScreen(plane, horizonY, r.fwd, r.lat, hM);
    const w = c.size * s.scale;
    if (w < 4) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, w, w * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x + w * 0.5, s.y + w * 0.06, w * 0.6, w * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRing(ctx, plane, horizonY, target, radius, active, distM) {
  const r = relCoords(plane, target.x, target.z);
  if (r.fwd < 15 || r.fwd > 5000) return;
  const hM = target.alt * 0.3048;
  const s = groundScreen(plane, horizonY, r.fwd, r.lat, hM);
  const rx = radius * s.scale;
  if (rx < 3 || rx > 900) return;
  ctx.lineWidth = Math.max(4, rx * 0.16);
  ctx.strokeStyle = active ? '#ff7a1a' : 'rgba(255,150,60,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, rx, rx * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, rx * 0.05);
  ctx.strokeStyle = active ? '#ffe1b0' : 'rgba(255,225,176,0.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, rx * 0.86, rx * 0.79, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (active && distM > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(distM)} m`, s.x, s.y - rx - 12);
  }
}

function drawAircraft(ctx, plane, time) {
  const W = CONFIG.canvasWidth;
  const cx = W / 2;
  const cy = 470 + plane.pitch * 2.2;
  const bankRad = (plane.bank * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bankRad * 0.55);
  ctx.scale(1.3, 1.3); // pesawat lebih besar di frame
  // Baling-baling berputar: cakram blur + dua bilah di depan badan.
  const propA = time * 22;
  ctx.save();
  ctx.translate(0, -12);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#dfe9ee';
  ctx.beginPath();
  ctx.ellipse(0, 0, 62, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#3a4a55';
  ctx.rotate(propA);
  ctx.beginPath();
  ctx.ellipse(0, -34, 7, 34, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 34, 7, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sayap utama dengan shading.
  const wing = ctx.createLinearGradient(0, -10, 0, 22);
  wing.addColorStop(0, '#ffffff');
  wing.addColorStop(0.6, '#eef3f6');
  wing.addColorStop(1, '#b9c9d4');
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(150, 6);
  ctx.lineTo(138, 20); ctx.lineTo(0, 14); ctx.lineTo(-138, 20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7d94a6'; ctx.lineWidth = 2; ctx.stroke();
  // Ujung sayap oranye.
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-132, 4); ctx.lineTo(-126, 17); ctx.lineTo(-138, 20);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(150, 6); ctx.lineTo(132, 4); ctx.lineTo(126, 17); ctx.lineTo(138, 20);
  ctx.closePath(); ctx.fill();
  // Badan (tampak belakang) dengan highlight samping.
  const body = ctx.createLinearGradient(-30, 0, 30, 0);
  body.addColorStop(0, '#14606a');
  body.addColorStop(0.35, '#2fa8a0');
  body.addColorStop(0.6, '#1d7f86');
  body.addColorStop(1, '#0f4a55');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b3d44'; ctx.lineWidth = 2; ctx.stroke();
  // Kilau putih di sisi badan.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-12, -8, 5, 26, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Garis livery oranye.
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(-30, -6, 60, 7);
  // Kanopi dengan highlight.
  const canopy = ctx.createLinearGradient(-14, -40, 14, -12);
  canopy.addColorStop(0, '#eafaff');
  canopy.addColorStop(0.5, '#7ec8ee');
  canopy.addColorStop(1, '#3d8fc4');
  ctx.fillStyle = canopy;
  ctx.beginPath();
  ctx.ellipse(0, -26, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e4a52'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-5, -31, 5, 3.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Ekor horizontal + sirip.
  ctx.fillStyle = '#dfe9ee';
  ctx.beginPath();
  ctx.moveTo(-58, 26); ctx.lineTo(-12, 18); ctx.lineTo(12, 18); ctx.lineTo(58, 26);
  ctx.lineTo(50, 34); ctx.lineTo(0, 30); ctx.lineTo(-50, 34);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(-8, 34); ctx.lineTo(0, -2); ctx.lineTo(8, 34);
  ctx.closePath(); ctx.fill();
  // Knalpot: nyala bila throttle tinggi.
  if (plane.throttle > 40 && plane.engineOn) {
    ctx.fillStyle = `rgba(255,${140 + Math.floor(60 * Math.sin(time * 18))},40,0.85)`;
    ctx.beginPath();
    ctx.ellipse(0, 48, 10, 12 + plane.throttle * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lampu navigasi berkedip.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = blink ? '#ff3b30' : '#7a1010';
  ctx.beginPath(); ctx.arc(-150, 12, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blink ? '#2fd35a' : '#0e5a22';
  ctx.beginPath(); ctx.arc(150, 12, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawScene(ctx, plane, world, mission, targets, activeIdx, time) {
  const W = CONFIG.canvasWidth;
  const H = CONFIG.canvasHeight;
  const horizonY = H * 0.52 - plane.pitch * 9;
  drawSky(ctx, plane, time);
  drawRidges(ctx, plane, horizonY, world);
  // Tanah: isi bawah horizon dengan rumput dasar dulu.
  ctx.fillStyle = '#6f9e4f';
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // Dunia dimiringkan mengikuti bank (putar di sekitar tengah layar).
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate((-plane.bank * Math.PI) / 180 * 0.35);
  ctx.translate(-W / 2, -H / 2);
  drawFields(ctx, plane, horizonY, world);
  drawRoads(ctx, plane, horizonY, world);
  drawLake(ctx, plane, horizonY, world);
  drawRiver(ctx, plane, horizonY, world);
  drawHills(ctx, plane, horizonY, world);
  drawTrees(ctx, plane, horizonY, world);
  drawRunway(ctx, plane, horizonY);
  drawCanyonWalls(ctx, plane, horizonY, world);
  // Awan digambar di canvas, di bawah HUD DOM — HUD selalu di atas awan.
  drawClouds(ctx, plane, horizonY, world);
  if (targets && targets.length) {
    targets.forEach((t, i) => {
      const dx = t.x - plane.x;
      const dz = t.z - plane.z;
      const dy = (t.alt - plane.alt) * 0.3048;
      const distM = Math.hypot(dx, dz, dy);
      drawRing(ctx, plane, horizonY, t, mission.ringRadius || 50, i === activeIdx, i === activeIdx ? distM : 0);
    });
  }
  ctx.restore();
  // Garis horizon tipis.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(W, horizonY);
  ctx.stroke();
  drawAircraft(ctx, plane, time);
}
