// src/main.js - corrected Wave Rider main script (Phaser 3)
// Minimal, robust wiring for menu buttons and touch controls

(() => {
  // Simple SFX helper (Web Audio)
  class Sfx {
    constructor() { this.ctx = null; this.enabled = true; }
    _init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    toggle(b) { this.enabled = b !== undefined ? b : !this.enabled; if (!this.enabled && this.ctx) this.ctx.suspend && this.ctx.suspend(); else if (this.ctx) this.ctx.resume && this.ctx.resume(); }
    tone(freq=440, time=0.08, type='sine', gain=0.12) {
      if (!this.enabled) return; this._init();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + time);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(t + time + 0.02);
    }
    splash(){ this.tone(600,0.12,'sine',0.15); } collect(){ this.tone(1200,0.06,'triangle',0.12); } hit(){ this.tone(160,0.16,'sawtooth',0.22); } win(){ this.tone(880,0.2,'sine',0.2); }
  }

  // Global sfx instance
  window.sfx = new Sfx();

  // Boot / Menu scene
  class BootScene extends Phaser.Scene {
    constructor(){ super({ key: 'BootScene' }); }
    preload(){}
    create(){
      // Safe DOM access: wait until DOM is present
      const tryAttach = () => {
        const menu = document.getElementById('menu');
        if (!menu) {
          console.warn('Menu DOM not found yet; retrying...');
          setTimeout(tryAttach, 100);
          return;
        }

        // menu buttons (guard each element)
        const el = id => document.getElementById(id);
        const btnStart = el('btn-start'), btnTime = el('btn-time'), btnCredits = el('btn-credits'), btnSound = el('btn-sound');

        const startGame = (mode) => {
          if (menu) menu.style.display = 'none';
          this.scene.start('GameScene', { mode });
        };

        if (btnStart) btnStart.addEventListener('click', ()=> startGame('endless'));
        if (btnTime) btnTime.addEventListener('click', ()=> startGame('time'));
        if (btnCredits) btnCredits.addEventListener('click', ()=> {
          // explanatory modal fallback
          alert("How to play:\n- Move left/right (arrows, A/D, touch)\n- Jump to ride wave crests and avoid whirlpools\n- Tilt device to steer if supported");
        });
        if (btnSound) btnSound.addEventListener('click', ()=> { window.sfx.toggle(); btnSound.textContent = window.sfx.enabled ? 'Toggle Sound' : 'Sound Off'; });

        // show menu
        menu.style.display = 'block';
      };

      tryAttach();
    }
  }

  // Main Game scene (simplified for clarity)
  class GameScene extends Phaser.Scene {
    constructor(){ super({ key: 'GameScene' }); }
    init(data){ this.mode = data.mode || 'endless'; this.score = 0; this.lives = 3; this.timeLeft = (this.mode === 'time') ? 60 : 9999; }
    create(){
      // keep references to DOM HUD and overlay; guard for null
      this.scoreEl = document.getElementById('score-val') || { textContent:'' };
      this.timeEl = document.getElementById('time-val') || { textContent:'' };
      this.livesEl = document.getElementById('lives-val') || { textContent:'' };
      this.overlay = document.getElementById('overlay');
      this.overlayTitle = document.getElementById('overlay-title');
      this.overlayBody = document.getElementById('overlay-body');

      // Attach overlay buttons if they exist
      const restartBtn = document.getElementById('overlay-restart');
      const backBtn = document.getElementById('overlay-back');
      if (restartBtn) restartBtn.addEventListener('click', ()=> this.scene.restart({ mode: this.mode }));
      if (backBtn) backBtn.addEventListener('click', ()=> { location.reload(); });

      // Basic world sizing
      this.width = this.scale.width;
      this.height = this.scale.height;

      // Create a placeholder background and a simple player container
      this.cameras.main.setBackgroundColor(null);

      // player
      this.player = this.add.container(this.width*0.25, this.height*0.5);
      const board = this.add.graphics(); board.fillStyle(0xffffff,1); board.fillEllipse(0,0,36,12); board.lineStyle(2,0x222222,0.6); board.strokeEllipse(0,0,36,12);
      const rider = this.add.graphics(); rider.fillStyle(0x00334d,1); rider.fillCircle(0,-6,4); rider.fillRect(-2,-2,4,6);
      this.player.add([board,rider]);

      // groups
      this.shellGroup = this.add.group(); this.whirlpoolGroup = this.add.group();

      // inputs
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // touch buttons - robust attachment
      const safeAttachPointer = (id, downCb, upCb) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', (e)=>{ e.preventDefault(); downCb(); }, {passive:false});
        el.addEventListener('pointerup', (e)=>{ e.preventDefault(); upCb(); });
        el.addEventListener('touchstart', (e)=>{ e.preventDefault(); downCb(); }, {passive:false});
        el.addEventListener('touchend', (e)=>{ e.preventDefault(); upCb(); });
      };
      this.inputState = { left:false, right:false, jump:false };
      safeAttachPointer('left-btn', ()=> this.inputState.left=true, ()=> this.inputState.left=false);
      safeAttachPointer('right-btn', ()=> this.inputState.right=true, ()=> this.inputState.right=false);
      safeAttachPointer('jump-btn', ()=> this.inputState.jump=true, ()=> this.inputState.jump=false);

      // make sure overlay hidden at start
      if (this.overlay) this.overlay.classList.add('hidden');

      // time vars
      this.t = 0;
      this.lastShellSpawn = 0;
      this.lastWhirlpoolSpawn = 0;
      this.timeSinceStart = 0;
    }

    update(time, delta){
      delta = delta / 1000;
      this.t += delta;
      this.timeSinceStart += delta;

      // update sizes in case of window resize
      this.width = this.scale.width; this.height = this.scale.height;

      // handle input
      const left = this.inputState.left || this.cursors.left.isDown || this.keyA.isDown;
      const right = this.inputState.right || this.cursors.right.isDown || this.keyD.isDown;
      const jump = this.inputState.jump || this.cursors.up.isDown || this.keySpace.isDown;

      if (left) this.player.x -= 200 * delta;
      if (right) this.player.x += 200 * delta;
      if (jump) { this.player.y -= 150 * delta; window.sfx.splash(); }

      // keep on screen
      this.player.x = Phaser.Math.Clamp(this.player.x, 24, this.width - 24);
      this.player.y = Phaser.Math.Clamp(this.player.y, 24, this.height - 24);

      // spawn shells and whirlpools occasionally (simple)
      if (this.timeSinceStart - this.lastShellSpawn > 1.0) {
        this.lastShellSpawn = this.timeSinceStart;
        if (Math.random() < 0.8) this.spawnShell();
      }
      if (this.timeSinceStart - this.lastWhirlpoolSpawn > 5.0) {
        this.lastWhirlpoolSpawn = this.timeSinceStart;
        if (Math.random() < 0.35) this.spawnWhirlpool();
      }

      // simple movement of shells/whirlpools and collision checks
      Phaser.Actions.Call(this.shellGroup.getChildren(), function(s){
        s.x -= 80 * delta;
        if (s.x < -60) s.destroy();
        const d = Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y);
        if (!s.collected && d < 36) { s.collected = true; this.collectShell(s); }
      }, this);

      Phaser.Actions.Call(this.whirlpoolGroup.getChildren(), function(w){
        w.x -= 60 * delta;
        if (w.x < -120) w.destroy();
        const d = Phaser.Math.Distance.Between(w.x, w.y, this.player.x, this.player.y);
        if (!w.hit && d < w.hitRadius) { w.hit = true; this.playerHit(w); }
      }, this);

      // HUD update
      this.scoreEl.textContent = Math.floor(this.score || 0);
      this.livesEl.textContent = this.lives || 0;
      this.timeEl.textContent = Math.max(0, Math.floor(this.timeLeft || 0));

      if (this.mode === 'time') {
        this.timeLeft -= delta;
        if (this.timeLeft <= 0) this.showOverlay('Time Up', `Your score: ${Math.floor(this.score||0)}`);
      }
      if (this.lives <= 0) this.showOverlay('Game Over', `Your score: ${Math.floor(this.score||0)}`);
    }

    // helpers
    spawnShell(){
      const x = this.scale.width + 60; const y = (this.scale.height * 0.6) - 40 + (Math.random()*60);
      const container = this.add.container(x,y);
      const g = this.add.graphics(); g.fillStyle(0xffdd77,1); g.beginPath(); g.moveTo(-8,6); g.quadraticCurveTo(0,-6,8,6); g.lineTo(0,12); g.closePath(); g.fillPath();
      container.add(g); container.collected=false; this.shellGroup.add(container);
    }
    collectShell(shell){
      window.sfx.collect();
      this.score = (this.score || 0) + 15;
      // quick particle burst
      const p = this.add.particles(); p.createEmitter({ x: shell.x, y: shell.y, speed:{min:40,max:110}, lifespan: {min:300,max:900}, scale:{start:0.6,end:0}, quantity:8, blendMode:'SCREEN', maxParticles:20 });
      shell.destroy();
    }
    spawnWhirlpool(){
      const x = this.scale.width + 80; const y = (this.scale.height * 0.7) + Math.random()*80;
      const g = this.add.graphics(); g.lineStyle(4,0x112233,0.8); for (let i=0;i<4;i++) g.strokeEllipse(0,0,40 - i*8, 20 - i*4); g.fillStyle(0x001122,0.2); g.fillCircle(0,0,10);
      const cont = this.add.container(x,y,[g]); cont.hitRadius=48; cont.hit=false; this.whirlpoolGroup.add(cont);
    }
    playerHit(w){ window.sfx.hit(); this.lives = Math.max(0, (this.lives||1) - 1); this.player.x = Phaser.Math.Clamp(this.player.x - 60, 24, this.scale.width - 24); }
    showOverlay(title, message){
      if (this.overlayTitle) this.overlayTitle.textContent = title;
      if (this.overlayBody) this.overlayBody.textContent = message;
      if (this.overlay) this.overlay.classList.remove('hidden');
      this.scene.pause();
      window.sfx.win();
    }
  }

  // Phaser config and game init
  const cfg = {
    type: Phaser.CANVAS,
    parent: 'game-root',
    canvas: document.getElementById('game-canvas') || undefined,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene]
  };

  try {
    window.game = new Phaser.Game(cfg);
    window.addEventListener('resize', ()=> { if (window.game && window.game.scale) window.game.scale.resize(window.innerWidth, window.innerHeight); });
  } catch (err) {
    console.error('Failed to start Phaser game:', err);
  }
})();
