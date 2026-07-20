(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('gameFrame');
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlayTitle');
  const eyebrow = document.getElementById('overlayEyebrow');
  const overlayText = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const scoreNode = document.getElementById('score');
  const highScoreNode = document.getElementById('highScore');
  const soundButton = document.getElementById('soundButton');
  const rewardCard = document.getElementById('rewardCard');
  const rewardMilestone = document.getElementById('rewardMilestone');
  const rewardMessage = document.getElementById('rewardMessage');
  const continueButton = document.getElementById('continueButton');
  const proposalCard = document.getElementById('proposalCard');
  const proposalTitle = document.getElementById('proposalTitle');
  const proposalText = document.getElementById('proposalText');
  const acceptButton = document.getElementById('acceptButton');
  const restartButton = document.getElementById('restartButton');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 334;
  const CELL_W = 192;
  const CELL_H = 208;
  const SPRITE_W = 92;
  const SPRITE_H = 100;
  const PLAYER_X = 108;
  const rows = { idle: 0, run: 1, jump: 4, failed: 5 };
  const counts = { idle: 6, run: 8, jump: 5, failed: 8 };
  const debugStartScore = Math.max(0, Number(new URLSearchParams(location.search).get('debugScore')) || 0);
  const girlfriendMessages = [
    '今天工作辛苦啦，解决了这么多 Bug。',
    '你认真敲代码的样子，比通关动画还要帅。',
    '又跨过一千分啦，我就知道你一定可以。',
    '别忘了眨眨眼，我会陪你慢慢把问题解决。',
    '这一千分是你的，也是我们一起攒下的小胜利。',
    'Bug 再多也没关系，你身后一直有我。',
    '喝口水再继续吧，最厉害的工程师也要休息。',
    '你负责解决 Bug，我负责在终点给你抱抱。',
    '今天也在努力让生活变得更好，辛苦你啦。',
    '看到分数上涨，我比你还要开心。',
    '慢一点也没关系，我喜欢你认真坚持的样子。',
    '刚刚那一跳太帅了，奖励你一个大大的拥抱。',
    '错误会过去，代码会跑通，我也会一直在。',
    '你已经做得很好了，不需要每一秒都逞强。',
    '这一关完成以后，我们一起去吃点好吃的吧。',
    '又解决了一大堆麻烦，你真的很可靠。',
    '今天的你也在闪闪发光，我全都看见啦。',
    '分数只是数字，你的努力才是最珍贵的奖励。',
    '累了就靠过来一会儿，剩下的关卡慢慢走。',
    '你每认真一分，我们的小日子就更踏实一分。',
    '再难的报错，也挡不住你回家的路。',
    '恭喜你又守住了一千分，今晚给你加鸡腿。',
    '我偷偷记下了：今天的你又比昨天更厉害。',
    '不用和别人比，你已经是我心里的最高分。',
    '前面还有 Bug，不过也有我准备好的惊喜。',
    '你努力工作的样子，让未来看起来特别值得期待。',
    '谢谢你一直认真生活，也谢谢你没有轻易放弃。',
    '先收下这句夸奖：你真的特别特别棒。',
    '每解决一个问题，我们就离想要的生活更近一点。',
    '继续向前吧，通关以后我有一句很重要的话想说。'
  ];
  const monsterCatalog = [
    { kind: 'bug', w: 46, h: 38 },
    { kind: 'error', w: 64, h: 48 },
    { kind: 'stack', w: 38, h: 66 },
    { kind: 'slime', w: 52, h: 35 },
    { kind: 'virus', w: 48, h: 48 },
    { kind: 'spider', w: 54, h: 42 },
    { kind: 'glitch', w: 46, h: 56 },
    { kind: 'byte', w: 60, h: 42 },
    { kind: 'ghost', w: 48, h: 54 }
  ];
  const sprite = new Image();
  sprite.src = 'pixel-girl.webp';

  let mode = 'ready';
  let lastTime = 0;
  let distance = 0;
  let score = 0;
  let highScore = Number(localStorage.getItem('bugRunHighScore') || 0);
  let speed = 330;
  let spawnTimer = 1.4;
  let frameClock = 0;
  let soundEnabled = true;
  let audioCtx = null;
  let masterGain = null;
  let bgmActive = false;
  let bgmStep = 0;
  let nextBeatAt = 0;
  let shake = 0;
  let flash = 0;
  let nextRewardScore = 1000;
  let rewardsShown = 0;
  let rewardDeck = [];
  let obstacles = [];
  let particles = [];
  let codeBits = [];

  const player = { x: PLAYER_X, y: GROUND - SPRITE_H, vy: 0, grounded: true, jumps: 0 };
  highScoreNode.textContent = pad(highScore);

  for (let i = 0; i < 18; i++) {
    codeBits.push({ x: Math.random() * W, y: 48 + Math.random() * 210, text: pick(['const', '{}', '404', '=>', 'fix()', 'null', '01', '</>']), alpha: .08 + Math.random() * .14 });
  }

  function pad(n) { return Math.floor(n).toString().padStart(5, '0'); }
  function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = .72;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx.state === 'suspended' ? audioCtx.resume() : Promise.resolve();
  }

  function beep(freq, duration, type = 'square', volume = .11, delay = 0) {
    if (!soundEnabled) return;
    ensureAudio().then(() => {
      const startAt = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
      osc.connect(gain).connect(masterGain);
      osc.start(startAt);
      osc.stop(startAt + duration);
    }).catch(() => {});
  }

  function playSound(name) {
    if (name === 'start') {
      beep(392, .09, 'square', .10, 0);
      beep(523, .09, 'square', .10, .09);
      beep(659, .15, 'square', .12, .18);
    } else if (name === 'jump') {
      beep(420, .13, 'square', .12, 0);
      beep(720, .14, 'square', .10, .045);
    } else if (name === 'fail') {
      beep(260, .15, 'sawtooth', .13, 0);
      beep(190, .18, 'sawtooth', .14, .13);
      beep(105, .32, 'sawtooth', .16, .28);
    } else if (name === 'reward') {
      beep(523, .12, 'sine', .10, 0);
      beep(659, .14, 'sine', .10, .11);
      beep(784, .24, 'sine', .11, .22);
    } else if (name === 'proposal') {
      [392, 494, 587, 784, 988].forEach((note, index) => beep(note, .24, 'sine', .10, index * .14));
    }
  }

  function scheduleTone(freq, startAt, duration, type, volume) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(startAt);
    osc.stop(startAt + duration);
  }

  function currentBpm() {
    return Math.min(195, Math.round(105 + (speed - 330) * .265));
  }

  function startBgm(delay = .34) {
    if (!soundEnabled) return;
    ensureAudio().then(() => {
      bgmActive = true;
      bgmStep = 0;
      nextBeatAt = audioCtx.currentTime + delay;
    }).catch(() => {});
  }

  function stopBgm() {
    bgmActive = false;
  }

  function updateBgm() {
    if (!bgmActive || !soundEnabled || mode !== 'running' || !audioCtx || audioCtx.state !== 'running') return;
    const melody = [0, 3, 7, 10, 7, 3, 5, 8, 12, 8, 5, 3, 0, 5, 7, 10];
    const bass = [0, 0, -2, -2, -5, -5, -2, -2];
    const beat = 60 / currentBpm() / 2;
    while (nextBeatAt < audioCtx.currentTime + .14) {
      const step = bgmStep % melody.length;
      const bassNote = bass[Math.floor(step / 2) % bass.length];
      const bassFreq = 82.41 * Math.pow(2, bassNote / 12);
      const melodyFreq = 164.81 * Math.pow(2, melody[step] / 12);
      if (step % 2 === 0) scheduleTone(bassFreq, nextBeatAt, beat * .82, 'triangle', .052);
      scheduleTone(melodyFreq, nextBeatAt, beat * .55, 'square', .032);
      if (currentBpm() >= 150 && step % 2 === 1) scheduleTone(1300, nextBeatAt, .018, 'square', .012);
      if (currentBpm() >= 178 && step % 4 === 3) scheduleTone(melodyFreq * 2, nextBeatAt, beat * .25, 'square', .018);
      nextBeatAt += beat;
      bgmStep++;
    }
  }

  function start() {
    if (mode === 'running') return;
    mode = 'running';
    score = debugStartScore;
    distance = debugStartScore * 22;
    speed = Math.min(690, 330 + score * .62);
    spawnTimer = 1.15;
    obstacles = [];
    particles = [];
    rewardsShown = 0;
    rewardDeck = shuffled(girlfriendMessages);
    nextRewardScore = Math.max(1000, (Math.floor(score / 1000) + 1) * 1000);
    player.y = GROUND - SPRITE_H;
    player.vy = 0;
    player.grounded = true;
    overlay.classList.add('hidden');
    rewardCard.hidden = true;
    proposalCard.hidden = true;
    proposalTitle.textContent = '你为了这个家好辛苦，咱们结婚吧';
    proposalText.textContent = '一万个 Bug 都没拦住你，以后的关卡想和你一起过。';
    acceptButton.hidden = false;
    restartButton.textContent = '再跑一局';
    scoreNode.textContent = pad(score);
    playSound('start');
    startBgm();
  }

  function jump() {
    if (mode === 'ready' || mode === 'gameover') { start(); return; }
    if (mode === 'reward') { continueAfterReward(); return; }
    if (mode === 'paused') {
      mode = 'running';
      overlay.classList.add('hidden');
      startBgm(.08);
      return;
    }
    if (mode !== 'running' || !player.grounded) return;
    player.vy = -735;
    player.grounded = false;
    player.jumps++;
    playSound('jump');
  }

  function togglePause() {
    if (mode === 'running') {
      mode = 'paused';
      stopBgm();
      eyebrow.textContent = 'PAUSED / 已暂停';
      title.textContent = '休息一下';
      overlayText.textContent = '按 P 或空格继续';
      startButton.innerHTML = '继续运行 <kbd>SPACE</kbd>';
      overlay.classList.remove('hidden');
    } else if (mode === 'paused') {
      mode = 'running';
      overlay.classList.add('hidden');
      startBgm(.08);
    }
  }

  function gameOver() {
    mode = 'gameover';
    stopBgm();
    shake = 12;
    flash = 1;
    highScore = Math.max(highScore, score);
    localStorage.setItem('bugRunHighScore', highScore);
    highScoreNode.textContent = pad(highScore);
    eyebrow.textContent = 'RUNTIME ERROR / 运行中断';
    title.textContent = `得分 ${pad(score)}`;
    overlayText.textContent = 'Bug 抓到了你。按空格立即重开';
    startButton.innerHTML = '重新运行 <kbd>SPACE</kbd>';
    setTimeout(() => overlay.classList.remove('hidden'), 360);
    playSound('fail');
  }

  function showReward(milestone) {
    mode = 'reward';
    stopBgm();
    rewardMilestone.textContent = `GIRLFRIEND MESSAGE / ${pad(milestone)}`;
    rewardMessage.textContent = rewardDeck[rewardsShown % rewardDeck.length];
    rewardsShown++;
    rewardCard.hidden = false;
    playSound('reward');
  }

  function continueAfterReward() {
    if (mode !== 'reward') return;
    rewardCard.hidden = true;
    mode = 'running';
    startBgm(.12);
  }

  function showProposal() {
    mode = 'proposal';
    stopBgm();
    highScore = Math.max(highScore, score);
    localStorage.setItem('bugRunHighScore', highScore);
    highScoreNode.textContent = pad(highScore);
    proposalCard.hidden = false;
    for (let i = 0; i < 7; i++) burst(150 + i * 110, 110 + (i % 2) * 45, pick(['#ff9d7a', '#ffd08e', '#74e3b3', '#f7b4c6']));
    playSound('proposal');
  }

  function acceptProposal() {
    if (mode !== 'proposal') return;
    proposalTitle.textContent = '婚礼已写入主分支 ♥';
    proposalText.textContent = '以后不管遇到多少 Bug，我们都一起通关。';
    acceptButton.hidden = true;
    restartButton.textContent = '带着她再跑一局';
    playSound('reward');
  }

  function spawnObstacle() {
    const spec = pick(monsterCatalog);
    obstacles.push({
      x: W + 30,
      y: GROUND - spec.h,
      w: spec.w,
      h: spec.h,
      kind: spec.kind,
      phase: Math.random() * 6.28,
      variant: Math.floor(Math.random() * 3)
    });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 11; i++) particles.push({ x, y, vx: -80 + Math.random() * 160, vy: -60 - Math.random() * 140, life: .5 + Math.random() * .35, color });
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (mode !== 'running') return;
    distance += speed * dt;
    score = Math.floor(distance / 22);
    speed = Math.min(690, 330 + score * .62);
    scoreNode.textContent = pad(score);
    frameClock += dt;

    if (score >= 10000) {
      showProposal();
      return;
    }

    if (score >= nextRewardScore) {
      const milestone = nextRewardScore;
      nextRewardScore += 1000;
      showReward(milestone);
      return;
    }

    player.vy += 2020 * dt;
    player.y += player.vy * dt;
    if (player.y >= GROUND - SPRITE_H) {
      player.y = GROUND - SPRITE_H;
      player.vy = 0;
      player.grounded = true;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const pace = Math.max(.68, 1.36 - speed / 1050);
      spawnTimer = pace + Math.random() * .65;
    }

    for (const o of obstacles) { o.x -= speed * dt; o.phase += dt * 7; }
    obstacles = obstacles.filter(o => o.x + o.w > -20);

    const playerHit = { x: player.x + 23, y: player.y + 15, w: SPRITE_W - 42, h: SPRITE_H - 21 };
    for (const o of obstacles) {
      const obstacleHit = { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 5 };
      if (intersects(playerHit, obstacleHit)) { burst(player.x + 58, player.y + 42, '#ff7a45'); gameOver(); break; }
    }

    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 540 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#111518');
    gradient.addColorStop(1, '#0d1012');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.font = '14px Consolas, monospace';
    for (const bit of codeBits) {
      const x = ((bit.x - distance * .09) % (W + 120) + (W + 120)) % (W + 120) - 60;
      ctx.fillStyle = `rgba(176, 190, 184, ${bit.alpha})`;
      ctx.fillText(bit.text, x, bit.y);
    }

    const level = Math.floor(score / 500) + 1;
    ctx.fillStyle = 'rgba(116,227,179,.6)';
    ctx.font = '11px Consolas, monospace';
    ctx.fillText(`LEVEL ${String(level).padStart(2, '0')}  /  SPEED ${Math.floor(speed)}  /  BGM ${currentBpm()} BPM`, 24, 30);

    ctx.strokeStyle = '#394044';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 1);
    ctx.lineTo(W, GROUND + 1);
    ctx.stroke();

    const dashOffset = -(distance % 54);
    ctx.fillStyle = '#242a2d';
    for (let x = dashOffset; x < W; x += 54) ctx.fillRect(x, GROUND + 17, 32, 3);
  }

  function drawPlayer() {
    if (!sprite.complete) return;
    let state = 'idle';
    if (mode === 'running') state = player.grounded ? 'run' : 'jump';
    if (mode === 'gameover') state = 'failed';
    const fps = state === 'run' ? 12 : 7;
    const frameIndex = Math.floor(frameClock * fps) % counts[state];
    ctx.drawImage(sprite, frameIndex * CELL_W, rows[state] * CELL_H, CELL_W, CELL_H, player.x, player.y, SPRITE_W, SPRITE_H);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    const shadow = player.grounded ? 36 : Math.max(15, 36 - (GROUND - SPRITE_H - player.y) * .14);
    ctx.ellipse(player.x + 46, GROUND + 3, shadow, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.kind === 'bug') {
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.rotate(Math.sin(o.phase) * .05);
      ctx.strokeStyle = ['#ff8756', '#ffcc66', '#ff6f91'][o.variant];
      ctx.fillStyle = '#2a1b17';
      ctx.lineWidth = 3;
      for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(s * 12, i * 8); ctx.lineTo(s * 24, i * 12); ctx.stroke();
      }
      ctx.beginPath(); ctx.roundRect(-15, -16, 30, 32, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(-2, -14, 4, 28);
    } else if (o.kind === 'error') {
      ctx.translate(o.x, o.y);
      ctx.fillStyle = '#251b1a'; ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(0, 0, o.w, o.h, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff7a45'; ctx.font = 'bold 11px Consolas'; ctx.fillText('ERROR', 10, 19);
      ctx.fillStyle = '#6e3a2c'; ctx.fillRect(10, 27, 43, 3); ctx.fillRect(10, 35, 31, 3);
    } else if (o.kind === 'stack') {
      ctx.translate(o.x, o.y);
      ctx.fillStyle = '#1e2325'; ctx.strokeStyle = '#aab2ae'; ctx.lineWidth = 2;
      ctx.fillRect(8, 18, 22, 48); ctx.strokeRect(8, 18, 22, 48);
      ctx.fillStyle = '#ff7a45';
      ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(37, 31); ctx.lineTo(1, 31); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1d1e'; ctx.font = 'bold 17px Segoe UI'; ctx.fillText('!', 16, 25);
    } else if (o.kind === 'slime') {
      ctx.translate(o.x, o.y + Math.sin(o.phase) * 2);
      const color = ['#74e3b3', '#78d7ff', '#d59cff'][o.variant];
      ctx.fillStyle = color;
      ctx.strokeStyle = '#172521';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, o.h); ctx.lineTo(5, 16); ctx.quadraticCurveTo(10, 1, 25, 7);
      ctx.quadraticCurveTo(42, 0, 50, 18); ctx.lineTo(50, o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#14201d'; ctx.fillRect(15, 18, 5, 6); ctx.fillRect(34, 18, 5, 6);
      ctx.fillRect(22, 28, 12, 3);
    } else if (o.kind === 'virus') {
      ctx.translate(o.x + 24, o.y + 24);
      ctx.rotate(o.phase * .08);
      const color = ['#ff6f91', '#ff9868', '#d98cff'][o.variant];
      ctx.strokeStyle = color; ctx.fillStyle = '#281a23'; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); ctx.stroke();
        ctx.fillStyle = color; ctx.fillRect(Math.cos(a) * 24 - 2, Math.sin(a) * 24 - 2, 5, 5);
      }
      ctx.fillStyle = '#281a23'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(-9, -5, 5, 5); ctx.fillRect(5, -5, 5, 5); ctx.fillRect(-5, 6, 11, 3);
    } else if (o.kind === 'spider') {
      ctx.translate(o.x + 27, o.y + 21 + Math.sin(o.phase * 1.4) * 2);
      const color = ['#ffd166', '#9be564', '#ff8fab'][o.variant];
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(side * 11, i * 6); ctx.lineTo(side * 21, i * 10); ctx.lineTo(side * 26, i * 10 + 7); ctx.stroke();
      }
      ctx.fillStyle = '#251f17'; ctx.beginPath(); ctx.ellipse(0, 1, 15, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(-7, -4, 4, 5); ctx.fillRect(4, -4, 4, 5);
      ctx.fillStyle = '#251f17'; ctx.fillRect(-5, -3, 2, 2); ctx.fillRect(5, -3, 2, 2);
    } else if (o.kind === 'glitch') {
      ctx.translate(o.x, o.y);
      const colors = ['#65e4ff', '#e481ff', '#7ef29a'];
      ctx.fillStyle = '#172126'; ctx.strokeStyle = colors[o.variant]; ctx.lineWidth = 2;
      ctx.fillRect(7, 7, 34, 46); ctx.strokeRect(7, 7, 34, 46);
      ctx.fillStyle = colors[o.variant];
      ctx.fillRect(1 + Math.sin(o.phase) * 3, 15, 18, 6); ctx.fillRect(27 - Math.sin(o.phase) * 3, 30, 24, 7); ctx.fillRect(5, 45, 12, 6);
      ctx.fillStyle = '#e9ffff'; ctx.fillRect(14, 20, 5, 5); ctx.fillRect(29, 20, 5, 5);
      ctx.fillStyle = '#172126'; ctx.fillRect(18, 36, 14, 3);
    } else if (o.kind === 'byte') {
      ctx.translate(o.x, o.y);
      const color = ['#78d7ff', '#74e3b3', '#ffc56e'][o.variant];
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(17, 6); ctx.lineTo(3, 21); ctx.lineTo(17, 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(43, 6); ctx.lineTo(57, 21); ctx.lineTo(43, 36); ctx.stroke();
      ctx.fillStyle = '#152227'; ctx.fillRect(17, 8, 26, 28);
      ctx.fillStyle = color; ctx.fillRect(22, 15, 5, 5); ctx.fillRect(34, 15, 5, 5); ctx.fillRect(25, 27, 12, 3);
    } else if (o.kind === 'ghost') {
      ctx.translate(o.x, o.y + Math.sin(o.phase) * 3);
      const color = ['#b7a6ff', '#82ddff', '#ff9fc2'][o.variant];
      ctx.fillStyle = color; ctx.strokeStyle = '#25213b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(24, 22, 19, Math.PI, 0); ctx.lineTo(43, 50); ctx.lineTo(34, 44); ctx.lineTo(25, 51); ctx.lineTo(16, 44); ctx.lineTo(5, 51); ctx.lineTo(5, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#25213b'; ctx.fillRect(14, 20, 5, 7); ctx.fillRect(30, 20, 5, 7);
      ctx.fillRect(20, 34, 9, 4);
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life * 1.8); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.save();
    if (shake > .1) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .84; }
    drawBackground();
    for (const o of obstacles) drawObstacle(o);
    drawPlayer();
    drawParticles();
    ctx.restore();
    if (flash > .01) { ctx.fillStyle = `rgba(255,122,69,${flash * .22})`; ctx.fillRect(0, 0, W, H); flash *= .82; }
  }

  function loop(time) {
    const dt = Math.min(.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    updateBgm();
    render();
    requestAnimationFrame(loop);
  }

  function action(e) {
    if (e && ['Space', 'ArrowUp'].includes(e.code)) e.preventDefault();
    jump();
  }

  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') action(e);
    if (e.code === 'KeyP') togglePause();
  });
  canvas.addEventListener('pointerdown', action);
  startButton.addEventListener('click', action);
  continueButton.addEventListener('click', e => {
    e.stopPropagation();
    continueAfterReward();
  });
  acceptButton.addEventListener('click', e => {
    e.stopPropagation();
    acceptProposal();
  });
  restartButton.addEventListener('click', e => {
    e.stopPropagation();
    start();
  });
  soundButton.addEventListener('click', e => {
    e.stopPropagation();
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? '音效 ON' : '音效 OFF';
    if (soundEnabled) {
      ensureAudio().then(() => {
        beep(660, .09, 'sine', .10);
        if (mode === 'running') startBgm(.12);
      });
    } else {
      stopBgm();
    }
  });
  window.addEventListener('blur', () => { if (mode === 'running') togglePause(); });
  frame.addEventListener('contextmenu', e => e.preventDefault());
  requestAnimationFrame(loop);
  if (debugStartScore > 0) setTimeout(start, 120);
})();
