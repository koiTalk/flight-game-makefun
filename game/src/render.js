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
    const n = ridge.peaks.length;
    for (let x = -W; x <= W * 2; x += 90) {
      const idx = Math.floor((((x + shift) / 90) % n + n) % n);
      ctx.lineTo(x, horizonY - ridge.peaks[idx] * h);
    }
    ctx.lineTo(W * 2, horizonY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFields(ctx, plane, horizonY, world) {
  const cx = CONFIG.canvasWidth / 2;
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
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    // Garis batas sawah tipis.
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  void cx;
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
}

function drawRunway(ctx, plane, horizonY) {
  const L = CONFIG.runwayLength / 2;
  const Wd = CONFIG.runwayWidth / 2;
  const corners = [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]];
  const pts = [];
  for (const [wx, wz] of corners) {
    const r = relCoords(plane, wx, wz);
    if (r.fwd < 12) return; // sudah di atas/lewat runway
    pts.push(groundScreen(plane, horizonY, r.fwd, r.lat, 0));
  }
  ctx.fillStyle = '#3c4148';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Garis tengah putus-putus dan ambang.
  ctx.strokeStyle = '#f5f0dc';
  ctx.lineWidth = Math.max(1.5, 5 * pts[0].scale);
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  const a = groundScreen(plane, horizonY, relCoords(plane, -L + 40, 0).fwd, relCoords(plane, -L + 40, 0).lat, 0);
  const b = groundScreen(plane, horizonY, relCoords(plane, L - 40, 0).fwd, relCoords(plane, L - 40, 0).lat, 0);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Label runway 09.
  const mid = groundScreen(plane, horizonY, relCoords(plane, 0, 0).fwd, relCoords(plane, 0, 0).lat, 0);
  if (mid.scale > 0.12) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold ${Math.round(34 * Math.min(1.6, mid.scale * 2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('09', mid.x, mid.y);
  }
}

function drawTrees(ctx, plane, horizonY, world) {
  ctx.fillStyle = '#2f6b34';
  for (const t of world.trees) {
    const r = relCoords(plane, t.x, t.z);
    if (r.fwd < 40 || r.fwd > 2200) continue;
    const s = groundScreen(plane, horizonY, r.fwd, r.lat, 0);
    const size = Math.max(2, 14 * s.scale);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - size * 1.6);
    ctx.lineTo(s.x - size, s.y);
    ctx.lineTo(s.x + size, s.y);
    ctx.closePath();
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
  ctx.lineWidth = Math.max(3, rx * 0.12);
  ctx.strokeStyle = active ? '#ff7a1a' : 'rgba(255,150,60,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, rx, rx * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, rx * 0.04);
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
  ctx.scale(1, 1);
  // Sayap utama.
  ctx.fillStyle = '#eef3f6';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(150, 6);
  ctx.lineTo(138, 20); ctx.lineTo(0, 14); ctx.lineTo(-138, 20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#9fb2c0'; ctx.lineWidth = 2; ctx.stroke();
  // Badan (tampak belakang).
  const body = ctx.createLinearGradient(0, -26, 0, 26);
  body.addColorStop(0, '#2fa8a0');
  body.addColorStop(0.55, '#1d7f86');
  body.addColorStop(1, '#14606a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  // Garis livery oranye.
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(-30, -6, 60, 7);
  // Kanopi.
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.ellipse(0, -26, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e4a52'; ctx.lineWidth = 2; ctx.stroke();
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
  drawRiver(ctx, plane, horizonY, world);
  drawTrees(ctx, plane, horizonY, world);
  drawRunway(ctx, plane, horizonY);
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
