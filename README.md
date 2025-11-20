# Wave Rider

Wave Rider is a lightweight, fully client-side browser game built with HTML, CSS and JavaScript using Phaser 3. The theme is Waves — you steer a surfboard/boat on procedural waves, collect shells and avoid whirlpools. The game is intentionally self-contained and uses no external image or audio files: all visuals are drawn programmatically and sound is synthesized with the Web Audio API.

This README explains the architecture, gameplay, controls, accessibility, performance decisions, and how to deploy the project (GitHub Pages and Sevalla). Follow the Deployment section for a live build.

---

## Table of contents

- Game overview
- Gameplay mechanics
- Controls and input
- Graphics and audio design
- Responsiveness and scaling
- Innovation and theme interpretation
- File structure
- Local development
- Deployment (GitHub Pages / Sevalla)
- Tuning and extension ideas
- License

---

## Game overview

- Title: Wave Rider
- Engine: Phaser 3 (CDN)
- Languages: HTML, CSS, JavaScript
- Assets: Procedural (no external image/audio files)
- Modes: Endless (survive and score) and Time Attack (score within a time limit)

The player controls a surfboard/boat which naturally rides the procedural wave field. The sea is generated with layered sine waves that animate in time, producing crests, troughs, and flowing motion. Collectible shells spawn near crests; whirlpools appear as hazards in troughs.

---

## Gameplay mechanics

- Objective: Collect shells to increase score while avoiding whirlpools.
- Lives: Player starts with 3 lives.
- Score: +15 per shell with particle feedback.
- Hazards: Whirlpool reduces a life, knocks player back.
- Mode differences:
  - Endless: survive as long as possible; time display is shown but does not end the game.
  - Time Attack: 60 seconds to get the highest score; when time reaches zero, the game ends and shows final score.

Collision detection is lightweight and distance-based (no heavy physics engine) to preserve responsiveness on mobile.

---

## Controls and input

- Desktop:
  - Left / Right arrows or A / D to move
  - Up arrow / Space to jump (catch crests)
- Mobile / Touch:
  - On-screen left, right, and jump buttons
- Device:
  - Tilt steering using DeviceOrientation (gamma) when available (tilt phone left/right to steer)
- All inputs are smoothed and clamped to keep the player within the play area

---

## Graphics and audio design

Graphics:
- Multi-layered procedural waves are drawn with Phaser Graphics each frame for fluid motion and infinite scaling.
- Surfboard and rider are procedural vector shapes so they remain crisp at any size.
- Shells and whirlpools are generated as simple graphics and containers.

Audio:
- SFX are generated using the Web Audio API (Oscillator + Gain) — splash on jump, collect chime, hit bass, and win jingle.
- Sound can be toggled from the main menu; audio context is created on first interaction.

Accessibility:
- UI elements use large tappable areas on mobile.
- Visual contrast uses clear colors and readable HUD.
- Sound toggling and simple controls make the game more accessible.

---

## Responsiveness and performance

- The game uses Phaser's RESIZE scaling mode and the canvas fills available space while logic samples wave positions using the current canvas width/height so behavior and visuals scale naturally.
- Input and rendering optimizations:
  - No heavy sprite atlases or image decoding.
  - Particle counts are moderate and short-lived.
  - Collision checks are approximate distance tests (fast).
- CSS ensures the HTML UI (HUD, menu, touch controls) reflows appropriately for phones, tablets, and desktop.

---

## Innovation and theme interpretation

- Procedural wave generation interprets the "Waves" theme literally: layered sine waves create believable ocean motion without bitmaps.
- Device tilt steering and synthesized audio increase immersion while keeping the game small and portable.
- The core gameplay loops (collecting shells at crests, avoiding trough whirlpools) encourage reading the wave surface — rewarding awareness of wave patterns.

---

## File structure

- index.html — HTML scaffold, HUD, on-screen controls and menus
- style.css — responsive layout and UI styles
- src/main.js — full game logic (procedural graphics, input, audio)
- README.md — this file
- LICENSE — MIT (optional)

---

## Local development (run locally)

1. Clone the repository or copy the files into a folder.
2. Serve the folder with a static server (recommended). Examples:
   - Using Node (http-server):
     - Install: `npm install -g http-server`
     - Run: `http-server . -p 8080`
     - Open: `http://localhost:8080`
   - Using Python:
     - Python 3: `python -m http.server 8080`
     - Open: `http://localhost:8080`
3. Interact with the main menu, start a mode, and test on mobile by pointing your device to the dev machine address or by deploying.

Note: Some browsers block Web Audio until the page receives user interaction. Click/tap the menu to enable sound.

---

## Deployment

Two deployment choices are provided: GitHub Pages and Sevalla (user requested platform). Both are static-host compatible.

### Deploy to GitHub Pages (recommended)
1. Create a GitHub repository and push your project (files above) to the repo root (not a subfolder).
2. In GitHub, go to Settings > Pages.
3. Under "Source", select the branch (usually main) and folder "root".
4. Save. GitHub will publish the site (URL shown in settings, usually https://<username>.github.io/<repo>).
5. Wait a minute, then open the published URL.

Notes:
- If you want custom domain, add it in the Pages settings and configure DNS accordingly.
- Ensure your index.html is at repo root.

### Deploy to Sevalla
Sevalla is a static hosting provider (user requested). The general steps for static hosts are similar; replace these with Sevalla-specific UI steps:
1. Create an account / login to Sevalla.
2. Create a new static site/project and connect your Git repository (GitHub), or upload the project directory as a ZIP (depending on Sevalla's UI).
3. Point the deployment to the repository root where index.html resides.
4. Trigger a deploy/build — the platform will publish a URL you can share.
5. Ensure `index.html` and `src/main.js` are included and accessible.

If Sevalla provides CLI or Git integration, push to a branch and connect through their UI for continuous deployment.

---

## Tuning and extension ideas

- Add progressive difficulty: faster waves, more whirlpools, rarer golden shells worth more.
- Add power-ups: temporary shield, magnet (pull shells), slow-motion.
- Save high scores using localStorage and optionally sync to a simple backend.
- Replace procedural graphics with illustrated sprites for a different visual style while keeping wave algorithm.
- Add background music (synth or chiptune) generated procedurally or added as small audio files.

---

## Known limitations

- DeviceOrientation requires secure context (HTTPS) and user permission in some browsers.
- Web Audio may be blocked until user interaction.
- Procedural rendering is intentionally simple to maximize portability and responsiveness; for more complex art use static assets.

---

## License

MIT License — copy the LICENSE text into your repo if sharing publicly.

---

## Contact and credits

Created as a single-file Phaser prototype. Use, adapt, and expand. Feedback and pull requests welcome.

