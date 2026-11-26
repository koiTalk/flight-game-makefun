// Model terbang arcade: throttle, pitch, bank, stall, bahan bakar, kerusakan.
import { CONFIG } from './config.js';
import { heightAt, onRunway } from './world.js';

const KT_TO_MS = 0.51444;
const KT_TO_FPS = 1.6878;

export function createPlane(mission) {
  const s = mission.start;
  return {
    x: s.x, z: s.z, alt: s.alt,
    heading: s.heading, pitch: 0, bank: 0,
    speed: s.speed, throttle: s.throttle,
    fuel: mission.fuel, damage: 0, vspeed: 0,
    engineOn: true, stalled: false, landed: false, crashed: false,
    score: 0, ringsPassed: 0, flightTime: 0, maxAlt: s.alt,
  };
}

function angleDiff(a, b) {
  let d = ((a - b + 540) % 360) - 180;
  return d;
}

export function updatePlane(plane, input, world, mission, dt) {
  const events = [];
  if (plane.landed || plane.crashed) return events;
  plane.flightTime += dt;

  // Throttle.
  if (plane.engineOn) {
    if (input.throttleUp) plane.throttle = Math.min(100, plane.throttle + 28 * dt);
    if (input.throttleDown) plane.throttle = Math.max(0, plane.throttle - 28 * dt);
  } else {
    plane.throttle = 0;
  }

  // Kecepatan menuju target throttle; menanjak menguras, menukik menambah.
  const targetSpeed = CONFIG.minSpeed + (plane.throttle / 100) * (CONFIG.maxSpeed - CONFIG.minSpeed);
  let speed = plane.speed + (targetSpeed - plane.speed) * Math.min(1, 0.45 * dt);
  speed -= Math.sin((plane.pitch * Math.PI) / 180) * 26 * dt;
  if (input.airbrake) speed -= 55 * dt;
  plane.speed = Math.max(0, Math.min(CONFIG.maxSpeed, speed));

  // Bank dan belok.
  const bankTarget = input.rollInput * CONFIG.maxBank;
  plane.bank += (bankTarget - plane.bank) * Math.min(1, 3.2 * dt);
  const turnFactor = Math.max(0.4, Math.min(1.2, plane.speed / CONFIG.cruiseSpeed));
  plane.heading = (plane.heading + (plane.bank / CONFIG.maxBank) * CONFIG.turnRate * turnFactor * dt + 360) % 360;

  // Pitch; stall di bawah kecepatan stall.
  plane.stalled = plane.speed < CONFIG.stallSpeed;
  const pitchTarget = plane.stalled ? -8 : input.pitchInput * CONFIG.maxPitch;
  plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, 2.6 * dt);
  plane.vspeed = plane.speed * KT_TO_FPS * Math.sin((plane.pitch * Math.PI) / 180);
  if (plane.stalled) plane.vspeed -= 6; // tenggelam pelan saat stall
  if (plane.stalled && !plane._stallWarned) { events.push('stall'); plane._stallWarned = true; }
  if (!plane.stalled) plane._stallWarned = false;

  plane.alt += plane.vspeed * dt;
  if (plane.alt > plane.maxAlt) plane.maxAlt = plane.alt;
  const v = plane.speed * KT_TO_MS;
  const hRad = (plane.heading * Math.PI) / 180;
  plane.x += Math.sin(hRad) * v * dt;
  plane.z += Math.cos(hRad) * v * dt;

  // Batas lembut area: putar perlahan kembali ke tengah bila terlalu jauh.
  const distCenter = Math.hypot(plane.x, plane.z);
  if (distCenter > CONFIG.worldSize) {
    const homeHeading = (Math.atan2(-plane.x, -plane.z) * 180) / Math.PI;
    const diff = angleDiff(homeHeading, plane.heading);
    plane.heading = (plane.heading + Math.max(-20, Math.min(20, diff)) * dt + 360) % 360;
  }

  // Bahan bakar.
  if (plane.engineOn) {
    plane.fuel -= (0.25 + (plane.throttle / 100) * 0.9) * dt;
    if (plane.fuel <= 25 && !plane._lowFuelWarned) { events.push('lowfuel'); plane._lowFuelWarned = true; }
    if (plane.fuel <= 0) {
      plane.fuel = 0;
      plane.engineOn = false;
      events.push('engineout');
    }
  }

  // Tanah / runway.
  const ground = heightAt(world, plane.x, plane.z);
  if (plane.alt <= ground) {
    plane.alt = ground;
    const aligned = Math.abs(angleDiff(plane.heading, CONFIG.runwayHeading)) < 20;
    const vsFpm = plane.vspeed * 60;
    const gentle = vsFpm > -900;
    if (ground === 0 && onRunway(plane.x, plane.z) && gentle && plane.speed < 110 && aligned) {
      plane.landed = true;
      events.push('landed');
    } else if (ground === 0 && onRunway(plane.x, plane.z) && gentle && plane.speed < 70) {
      plane.landed = true;
      events.push('landed');
    } else {
      plane.damage += vsFpm < -1800 ? 100 : CONFIG.damageGroundHit;
      plane.vspeed = 0;
      plane.pitch = 0;
      plane.bank = 0;
      if (plane.damage >= 100 || plane.speed > 150) {
        plane.crashed = true;
        events.push('crash');
      } else {
        plane.alt = ground + 6;
        events.push('terrain');
      }
    }
  }
  return events;
}

// Jarak 3D pesawat ke target (meter). alt kaki -> meter: 1 ft = 0.3048 m.
export function distToTarget(plane, t) {
  const dx = t.x - plane.x;
  const dz = t.z - plane.z;
  const dy = (t.alt - plane.alt) * 0.3048;
  return Math.hypot(dx, dz, dy);
}
