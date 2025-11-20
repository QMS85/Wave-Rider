// Wave Rider - Phaser 3 game (single file)
// Save as src/main.js

(() => {
  const config = {
    type: Phaser.CANVAS,
    parent: 'game-root',
    canvas: document.getElementById('game-canvas'),
    backgroundColor: null,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%'
    },
    scene: [BootScene, GameScene]
  };

  // Small audio/effects helper using WebAudio
  class Sfx {
    constructor() {
      this.ctx = null;
      this.master = 0.5;
      this.enabled = true;
    }
    _init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    toggle(b) {
      this.enabled = b !== undefined ? b : !this.enabled;
      if (!this.enabled && this.ctx) {
        // suspend audio
        this.ctx.suspend && this.ctx.suspend();
      } else if (this.enabled && this.ctx) {
        this.ctx.resume && this.ctx.resume();
      }
    }
    tone(freq = 440, time = 0.08, type = 'sine', gain = 0.12) {
      if (!this.enabled) return;
      this._init();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(0, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(gain * this.master, this.ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + time);
      o.connect(g); g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + time + 0.02);
    }
    splash() { this.tone(600, 0.12, 'sine', 0.18); }
    collect() { this.tone(1200, 0.06, 'triangle', 0.12); }
    hit() { this.tone(160, 0.16, 'sawtooth', 0.22); }
    win() { this.tone(880, 0.2, 'sine', 0.2); this.tone(1100,0.18,'sine',0.16); }
  }

  // Boot scene to set up things and show loading UI
  function BootScene() { Phaser.Scene.call(this, { key: 'BootScene' }); }
  BootScene.prototype = Object.create(Phaser.Scene.prototype);
  BootScene.prototype.constructor = BootScene;
  BootScene.prototype.preload = function() {
    // nothing to load (procedural)
  };
  BootScene.prototype.create = function() {
    // Hook up UI buttons and start menu
    window.sfx = new Sfx();
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');
    const btnStart = document.getElementById('btn-start');
    const btnTime = document.getElementById('btn-time');
    const btnCredits = document.getElementById('btn-credits');
    const btnSound = document.getElementById('btn-sound');

    const startGame = (mode) => {
      menu.style.display = 'none';
      overlay.classList.add('hidden');
      this.scene.start('GameScene', { mode });
    };

    btnStart.onclick = () => startGame('endless');
    btnTime.onclick = () => startGame('time');
    btnCredits.onclick = () => {
      alert("How to play:\n- Move left/right (arrows, A/D, touch)\n- Jump to ride wave crests and avoid whirlpools\n- Collect shells for points\n- Tilt device to steer if supported");
    };
    btnSound.onclick = () => {
      window.sfx.toggle();
      btnSound.textContent = window.sfx.enabled ? 'Toggle Sound' : 'Sound Off';
    };

    // Show initial menu
    menu.style.display = 'block';
  };

  // GameScene
  function GameScene() { Phaser.Scene.call(this, { key: 'GameScene' }); }
  GameScene.prototype = Object.create(Phaser.Scene.prototype);
  GameScene.prototype.constructor = GameScene;

  GameScene.prototype.init = function(data) {
    this.mode = data.mode || 'endless';
    this.score = 0;
    this.lives = 3;
    this.timeLeft = this.mode === 'time' ? 60 : 9999;
    this.gameSpeed = 1;
    this.deviceTilt = 0;
  };

  GameScene.prototype.create = function() {
    // Responsive sizes
    this.width = this.scale.width;
    this.height = this.scale.height;

    // Procedural wave layers as graphics objects
    this.waveGraphics = this.add.graphics({ x: 0, y: 0, add: true });
    this.foamParticles = this.add.particles();
    this.shellGroup = this.add.group();
    this.whirlpoolGroup = this.add.group();

    // Player sprite (procedural shape)
    this.player = this.add.container(200, this.height * 0.45);
    this.playerDepth = 50;
    this.playerSpeed = 240;
    this.playerAngle = 0;
    this.playerVelY = 0;
    this.playerOnWave = false;

    const board = this.add.graphics();
    drawBoard(board, 0xffffff, 36, 12);
    const rider = this.add.graphics();
    drawRider(rider);
    this.player.add([board, rider]);
    this.player.setSize(36, 12);

    this.physics = this.scene.physics || this; // not using Arcade physics heavy

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Touch buttons
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const jumpBtn = document.getElementById('jump-btn');

    let leftDown = false, rightDown = false, jumpDown = false;
    const setBtn = (el, name) => {
      el.addEventListener('pointerdown', () => { if (name==='left') leftDown=true; if(name==='right') rightDown=true; if(name==='jump') jumpDown=true; });
      el.addEventListener('pointerup', () => { if (name==='left') leftDown=false; if(name==='right') rightDown=false; if(name==='jump') jumpDown=false; });
      el.addEventListener('pointerout', () => { if (name==='left') leftDown=false; if(name==='right') rightDown=false; if(name==='jump') jumpDown=false; });
      el.addEventListener('touchstart', (e)=>{ e.preventDefault(); if (name==='left') leftDown=true; if(name==='right') rightDown=true; if(name==='jump') jumpDown=true; }, {passive:false});
      el.addEventListener('touchend', ()=>{ if (name==='left') leftDown=false; if(name==='right') rightDown=false; if(name==='jump') jumpDown=false; });
    };
    setBtn(leftBtn,'left'); setBtn(rightBtn,'right'); setBtn(jumpBtn,'jump');

    this.inputState = { leftDown, rightDown, jumpDown, getLeft:()=>leftDown, getRight:()=>rightDown, getJump:()=>jumpDown };

    // Device orientation
    window.addEventListener('deviceorientation', (ev) => {
      if (ev.gamma !== null) {
        this.deviceTilt = Phaser.Math.Clamp(ev.gamma / 30, -1, 1); // normalized
      }
    });

    // Timers and spawning
    this.lastShellSpawn = 0;
    this.lastWhirlpoolSpawn = 0;
    this.timeSinceStart = 0;

    // HUD bindings
    this.scoreEl = document.getElementById('score-val');
    this.timeEl = document.getElementById('time-val');
    this.livesEl = document.getElementById('lives-val');

    // Particles (foam)
    this.foamEmitter = this.add.particles().createEmitter({
      lifespan: { min: 700, max: 1400 },
      speed: { min: 10, max: 60 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      quantity: 0
    });

    // Start values
    this.score = 0;
    this.lives = 3;
    this.timeLeft = (this.mode === 'time') ? 60 : 9999;

    // SFX object exists as window.sfx
    if (!window.sfx) window.sfx = new Sfx();

    // Start loop
    this.t = 0;

    // Overlay bindings
    document.getElementById('overlay-restart').onclick = () => this.scene.restart({ mode: this.mode });
    document.getElementById('overlay-back').onclick = () => location.reload();

    // Prevent screen from sleeping on mobile where supported (wake lock)
    if ('wakeLock' in navigator) {
      try { navigator.wakeLock.request('screen'); } catch (e) {}
    }
  };

  // core update loop
  GameScene.prototype.update = function(time, delta) {
    delta = delta / 1000; // in seconds
    this.t += delta * this.gameSpeed;
    this.timeSinceStart += delta;

    // Responsive update of sizes in case of resize
    this.width = this.scale.width;
    this.height = this.scale.height;

    handleInput.call(this, delta);

    // Evaluate player height using procedural wave field
    const playerX = Phaser.Math.Clamp(this.player.x, 40, this.width - 40);
    const waveY = sampleWaves(playerX, this.t, this.width, this.height);

    // Smooth vertical position to ride wave
    const targetY = waveY - 14; // offset to sit slightly above crest
    this.player.y += (targetY - this.player.y) * Phaser.Math.Clamp(6 * delta, 0, 1);

    // Rotation to match slope
    const slope = sampleWavesDeriv(playerX, this.t, this.width, this.height);
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, -slope * 0.12, 6*delta);

    // Spawn shells occasionally in crests
    if (this.timeSinceStart - this.lastShellSpawn > 1.0) {
      this.lastShellSpawn = this.timeSinceStart;
      // spawn with chance based on width
      if (Math.random() < 0.8) spawnShell.call(this);
    }

    // spawn whirlpools occasionally
    if (this.timeSinceStart - this.lastWhirlpoolSpawn > 5.0) {
      this.lastWhirlpoolSpawn = this.timeSinceStart;
      if (Math.random() < 0.35) spawnWhirlpool.call(this);
    }

    // update shells and collisions
    Phaser.Actions.Call(this.shellGroup.getChildren(), function(shell) {
      shell.x -= 80 * delta * this.gameSpeed; // drift left
      shell.rotation += 0.02;
      // remove if offscreen
      if (shell.x < -60) shell.destroy();
      // collision check with player (simple distance)
      const d = Phaser.Math.Distance.Between(shell.x, shell.y, this.player.x, this.player.y);
      if (!shell.collected && d < 36) {
        shell.collected = true;
        collectShell.call(this, shell);
      }
    }, this);

    // whirlpools update
    Phaser.Actions.Call(this.whirlpoolGroup.getChildren(), function(w) {
      w.x -= 60 * delta * this.gameSpeed;
      w.scale += delta * 0.03;
      if (w.x < -120) w.destroy();
      const d = Phaser.Math.Distance.Between(w.x, w.y, this.player.x, this.player.y);
      if (!w.hit && d < w.hitRadius) {
        w.hit = true;
        playerHit.call(this, w);
      }
    }, this);

    // Foam emitter attached to board
    this.foamEmitter.setPosition(this.player.x - 10, this.player.y + 10);
    this.foamEmitter.setEmitZone({ type: 'edge', source: new Phaser.Geom.Circle(0,0,8), quantity: 1 });
    this.foamEmitter.frequency = 120;

    // Draw waves each frame
    drawWaves.call(this);

    // Update HUD
    this.scoreEl.textContent = Math.floor(this.score);
    this.livesEl.textContent = this.lives;
    this.timeEl.textContent = Math.max(0, Math.floor(this.timeLeft));

    // Decrease time in time mode
    if (this.mode === 'time') {
      this.timeLeft -= delta;
      if (this.timeLeft <= 0) {
        showOverlay.call(this, 'Time Up', `Your score: ${Math.floor(this.score)}`);
      }
    }

    // End conditions
    if (this.lives <= 0) {
      showOverlay.call(this, 'Game Over', `Your score: ${Math.floor(this.score)}`);
    }
  };

  // Helper: handle input states and apply horizontal movement
  function handleInput(delta) {
    const s = this.inputState;
    const left = s.getLeft() || this.cursors.left.isDown || this.keyA.isDown || (this.deviceTilt < -0.15);
    const right = s.getRight() || this.cursors.right.isDown || this.keyD.isDown || (this.deviceTilt > 0.15);
    const jump = s.getJump() || this.cursors.up.isDown || this.keySpace.isDown;

    if (left) {
      this.player.x -= this.playerSpeed * delta;
      this.player.x = Phaser.Math.Clamp(this.player.x, 24, this.width - 24);
    }
    if (right) {
      this.player.x += this.playerSpeed * delta;
      this.player.x = Phaser.Math.Clamp(this.player.x, 24, this.width - 24);
    }
    if (jump) {
      // quick boost upward to catch crest
      this.player.y -= 150 * delta;
      window.sfx.splash();
    }
  }

  // Procedural wave sampling function (sum of sines with travel)
  function sampleWaves(x, t, width, height) {
    const nx = (x / width) * Math.PI * 2;
    // three layered waves
    const w1 = Math.sin(nx * 0.9 + t * 1.1) * 22;
    const w2 = Math.sin(nx * 2.6 + t * 0.7) * 14;
    const w3 = Math.sin(nx * 4.8 + t * 2.1) * 6;
    const base = height * 0.6;
    return base + w1 + w2 + w3;
  }

  // derivative sample (approx slope)
  function sampleWavesDeriv(x, t, width, height) {
    const eps = 4;
    const y1 = sampleWaves(x+eps, t, width, height);
    const y0 = sampleWaves(x-eps, t, width, height);
    return (y1 - y0) / (2*eps);
  }

  // draw wide multi-layer waves with gradient fill
  function drawWaves() {
    const g = this.waveGraphics;
    g.clear();

    // background sea gradient rectangle
    const h = this.height;
    const w = this.width;

    // draw multi layered wave shapes
    for (let layer = 0; layer < 4; layer++) {
      const hue = 200 + layer * 8;
      const alpha = 0.28 + layer * 0.12;
      g.fillStyle(Phaser.Display.Color.GetColor((20+layer*5)+50, (90+layer*30), (200+layer*10)), alpha);
      g.beginPath();
      g.moveTo(0, h);
      const segments = Math.max(12, Math.floor(w / 24));
      for (let i=0;i<=segments;i++) {
        const x = (i/segments) * w;
        const y = sampleWaves(x, this.t * (0.7 + layer*0.2), w, h) + (layer*6);
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fillPath();
    }

    // foam crest highlight (thin white line)
    g.lineStyle(2, 0xffffff, 0.55);
    g.beginPath();
    const seg = Math.max(30, Math.floor(w/30));
    for (let i=0;i<=seg;i++){
      const x = (i/seg)*w;
      const y = sampleWaves(x, this.t, w, h) - 4;
      if (i===0) g.moveTo(x,y); else g.lineTo(x,y);
    }
    g.strokePath();
  }

  // draw surfboard shape helper
  function drawBoard(graphics, color, w = 36, h = 12) {
    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.ValueToColor(color).color, 1);
    graphics.beginPath();
    graphics.ellipse(0,0,w, h, 0, 0, Math.PI*2);
    graphics.fillPath();
    // stripe
    graphics.lineStyle(3, 0x222222, 0.6);
    graphics.strokeEllipse(0,0,w,h);
  }

  // draw rider small
  function drawRider(graph) {
    graph.clear();
    graph.fillStyle(0x00334d, 1);
    graph.fillCircle(0, -6, 4); // head
    graph.fillRect(-2, -2, 4, 6); // body
  }

  // spawn shell collectible near a crest
  function spawnShell() {
    const w = this.width;
    const spawnX = w + 60;
    // find a crest Y by sampling center region
    const x = spawnX;
    const y = sampleWaves(x - Math.random()*150, this.t, w, this.height) - (10 + Math.random()*40);
    const shell = this.add.container(x, y);
    const g = this.add.graphics();
    // draw shell (simple fan)
    g.fillStyle(0xffdd77, 1);
    g.beginPath();
    g.moveTo(-8, 6);
    g.quadraticCurveTo(0, -6, 8, 6);
    g.lineTo(0, 12);
    g.closePath();
    g.fillPath();
    shell.add(g);
    shell.collected = false;
    shell.setSize(24,24);
    this.shellGroup.add(shell);
  }

  // collect shell
  function collectShell(shell) {
    window.sfx.collect();
    this.score += 15;
    // burst particle effect
    const p = this.add.particles();
    p.createEmitter({
      x: shell.x,
      y: shell.y,
      speed: { min: 40, max: 110 },
      lifespan: { min: 300, max: 900 },
      scale: { start: 0.6, end: 0 },
      quantity: 8,
      blendMode: 'SCREEN'
    });
    shell.destroy();
  }

  // spawn whirlpool hazard
  function spawnWhirlpool() {
    const w = this.width;
    const spawnX = w + 80;
    const x = spawnX;
    const y = sampleWaves(x - Math.random()*160, this.t, w, this.height) + 18 + Math.random()*80;
    const g = this.add.graphics();
    drawWhirlpool(g);
    const cont = this.add.container(x, y, [g]);
    cont.hitRadius = 48;
    cont.hit = false;
    this.whirlpoolGroup.add(cont);
  }

  // draw whirlpool
  function drawWhirlpool(g) {
    g.clear();
    g.lineStyle(4, 0x112233, 0.8);
    for (let i=0;i<6;i++){
      g.strokeEllipse(0,0,40 - i*6, 22 - i*3);
    }
    g.fillStyle(0x001122,0.2);
    g.fillCircle(0,0,10);
  }

  // player hit handler
  function playerHit(whirlpool) {
    window.sfx.hit();
    this.lives -= 1;
    // spin and knock back
    const tl = this.t;
    const knock = 60;
    this.player.x = Phaser.Math.Clamp(this.player.x - knock, 24, this.width-24);
    // small camera shake (canvas-level)
    const canvas = document.getElementById('game-canvas');
    canvas.style.transform = 'translateX(-6px) rotate(-1deg)';
    setTimeout(()=> canvas.style.transform = '', 160);
  }

  // show overlay (end screen)
  function showOverlay(title, message) {
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayBody = document.getElementById('overlay-body');
    overlayTitle.textContent = title;
    overlayBody.textContent = message;
    overlay.classList.remove('hidden');
    // play win or end sound
    if (title === 'Game Over') window.sfx.hit();
    else window.sfx.win();
    this.scene.pause();
  }

  // Boot and GameScene registration requires these functions to be in scope; add after declared
  // We'll now initialize Phaser with config

  // Phaser requires classes to exist before config reference; we create config now:
  const cfg = {
    type: Phaser.CANVAS,
    parent: 'game-root',
    canvas: document.getElementById('game-canvas'),
    backgroundColor: null,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: []
  };

  // Because of function hoisting, push scenes
  cfg.scene.push({ preload: BootScene.prototype.preload, create: BootScene.prototype.create });
  cfg.scene.push({ preload: GameScene.prototype.preload || function(){}, create: GameScene.prototype.create, update: GameScene.prototype.update });

  // Create Phaser game instance
  window.game = new Phaser.Game(cfg);

  // attach resize listener to update canvas size
  window.addEventListener('resize', () => {
    if (window.game && window.game.scale) {
      window.game.scale.resize(window.innerWidth, window.innerHeight);
    }
  });

  // Minimal polyfills for older browsers (no-op if not needed)
})();
      
