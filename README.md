# Merpati Air: Ridge Run

An original flight game built for the make.fun "Make the best flight game" bounty
(best-flight-game-20261126-0057).

Fly a small propeller plane through a mountain valley: chase view over
recognisable terrain, a live cockpit HUD (altitude, speed, heading, vertical
speed, compass, attitude, throttle, fuel and damage), a runway and target rings
ahead. Three missions with different goals — ring run, runway landing, and a
canyon gate run — where throttle and turn discipline, fuel and damage turn each
sortie into decisions.

## Play

Open `game/index.html` in desktop Chrome. No build step, no network: every
file the game loads is under `game/`, and it plays fully offline.

- **Keyboard:** Arrow Up/Down to pitch, A/D or Arrow Left/Right to bank,
  W/S for throttle up/down, Space for airbrake, R to restart, M to mute,
  P to pause.
- **Mouse:** click to pick a mission on the menu.
- **Missions:** 1) Ring Run — fly through 8 rings; 2) Runway 09 — land on the
  runway; 3) Canyon Gates — thread 6 gates through the gorge.
- **Landing:** touch down slow and level on the runway. Too fast, too steep,
  or out of fuel means a crash.

## Structure

- `game/index.html` — page, HUD and cockpit layout
- `game/style.css` — HUD and menu styling
- `game/src/config.js` — tuning, missions and constants
- `game/src/world.js` — terrain, runway, rings and gates
- `game/src/physics.js` — flight model (lift, drag, throttle, damage)
- `game/src/render.js` — chase camera and canvas rendering
- `game/src/hud.js` — instruments: altimeter, speed, compass, attitude
- `game/src/audio.js` — Web Audio engine and wind sounds
- `game/src/input.js` — keyboard and mouse controls
- `game/src/main.js` — game loop and mission state
- `main.ts` — entry program: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`
- `screenshots/` — 4 screenshots taken from the running game

## License

MIT — see `LICENSE`.
