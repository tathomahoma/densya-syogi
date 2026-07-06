// ターン表示・ボタン・効果音合成・勝利演出

window.DenshaShogi = window.DenshaShogi || {};

((ns) => {
  'use strict';

  // --- 効果音システム (§5.5) ---

  let audioCtx = null;
  let masterGain = null;
  let muted = false;
  const activeSounds = {};
  let fanfareNodes = [];
  let noiseBuffer = null;

  ns.initAudio = () => {
    if (audioCtx) {
      audioCtx.resume();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      muted = localStorage.getItem('muteAll') === 'true';
      masterGain.gain.value = muted ? 0 : 0.5;
      masterGain.connect(audioCtx.destination);

      const size = audioCtx.sampleRate;
      noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {}
  };

  ns.toggleMute = () => {
    muted = !muted;
    localStorage.setItem('muteAll', muted ? 'true' : 'false');
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 0.5;
    }
    return muted;
  };

  ns.isMuted = () => muted;

  ns.updateMuteButton = () => {
    const btn = document.getElementById('mute-btn');
    if (btn) {
      btn.textContent = muted ? '🔈' : '🔊';
      btn.setAttribute('aria-label', muted ? 'おとを オンにする' : 'おとを オフにする');
    }
  };

  const stopSound = (category) => {
    if (activeSounds[category]) {
      for (const node of activeSounds[category]) {
        try { node.stop(); } catch (e) {}
      }
    }
    activeSounds[category] = [];
  };

  const createNoise = () => {
    if (!audioCtx || !noiseBuffer) return null;
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    return source;
  };

  // 駒選択 — 短い「ピッ」（1000Hz サイン波 60ms）
  ns.playSelectSound = () => {
    if (!audioCtx || muted) return;
    stopSound('select');
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
    activeSounds.select = [osc];
  };

  /**
   * ガタゴト走行音（§5.5.1）
   * @param {string} [pieceType]
   */
  ns.playMoveSound = (pieceType) => {
    if (!audioCtx || muted) return;
    stopSound('move');
    const t = audioCtx.currentTime;
    const nodes = [];

    if (pieceType === 'shinkansen') {
      const noise = createNoise();
      if (!noise) return;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.exponentialRampToValueAtTime(6000, t + 0.12);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.15);
      nodes.push(noise);
    } else {
      for (let i = 0; i < 2; i++) {
        const offset = i * 0.12;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = i === 0 ? 100 : 85;
        gain.gain.setValueAtTime(0, t + offset);
        gain.gain.linearRampToValueAtTime(0.18, t + offset + 0.005);
        gain.gain.setValueAtTime(0.18, t + offset + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t + offset);
        osc.stop(t + offset + 0.05);
        nodes.push(osc);
      }
    }
    activeSounds.move = nodes;
  };

  // 駒取り — 柔らかい「ぽふっ」（ノイズ短音 80ms）
  ns.playCaptureSound = () => {
    if (!audioCtx || muted) return;
    stopSound('capture');
    const t = audioCtx.currentTime;
    const noise = createNoise();
    if (!noise) return;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(t);
    noise.stop(t + 0.08);
    activeSounds.capture = [noise];
  };

  // 成り — キラーン（鈴音 200ms）
  ns.playPromoteSound = () => {
    if (!audioCtx || muted) return;
    stopSound('promote');
    const t = audioCtx.currentTime;
    const nodes = [];
    const freqs = [880, 1320, 1760];
    for (let i = 0; i < freqs.length; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i];
      gain.gain.setValueAtTime(0.12 / (i + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
      nodes.push(osc);
    }
    activeSounds.promote = nodes;
  };

  // 勝利ファンファーレ（§5.5.2、約2.5秒）
  ns.playWinSound = () => {
    if (!audioCtx || muted) return;
    stopFanfareNodes();
    const t = audioCtx.currentTime;
    const nodes = [];

    // Part 1: ドミソド↑ アルペジオ
    const arp = [261.63, 329.63, 392.00, 523.25];
    for (let i = 0; i < arp.length; i++) {
      const st = t + i * 0.18;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = arp[i];
      g.gain.setValueAtTime(0.25, st);
      g.gain.setValueAtTime(0.22, st + 0.15);
      g.gain.exponentialRampToValueAtTime(0.01, st + 0.35);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(st);
      osc.stop(st + 0.35);
      nodes.push(osc);
    }

    // Part 2: ソ↑ド↑↑ 高音で締め
    const high = [783.99, 1046.50];
    for (let j = 0; j < high.length; j++) {
      const st = t + 0.85 + j * 0.25;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = high[j];
      g.gain.setValueAtTime(0.2, st);
      g.gain.setValueAtTime(0.18, st + 0.2);
      g.gain.exponentialRampToValueAtTime(0.01, st + 0.5);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(st);
      osc.stop(st + 0.5);
      nodes.push(osc);
    }

    // Part 3: 「シャラララン」キラキラ音
    for (let k = 0; k < 5; k++) {
      const st = t + 1.5 + k * 0.15;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + k * 400, st);
      osc.frequency.exponentialRampToValueAtTime(1500 + k * 200, st + 0.3);
      g.gain.setValueAtTime(0.08, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(st);
      osc.stop(st + 0.4);
      nodes.push(osc);
    }

    fanfareNodes = nodes;
  };

  const stopFanfareNodes = () => {
    for (const node of fanfareNodes) {
      try { node.stop(); } catch (e) {}
    }
    fanfareNodes = [];
  };

  ns.stopFanfare = () => {
    stopFanfareNodes();
  };

  // 敗北側 — 控えめな「ピロリン」（短い上昇音 300ms）
  ns.playLoseSound = () => {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.15);
    osc.frequency.linearRampToValueAtTime(1100, t + 0.3);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  // --- BGM: 電車走行音＋メロディループ (§5.5.3) ---

  let bgmNodes = [];
  let bgmGain = null;
  let bgmPlaying = false;
  let bgmTimerId = null;
  let railBuffer = null; // 一度生成したら使い回す

  // ガタンゴトン1打を生成（ノイズバースト＋低い打撃音）
  const makeClickSample = (rate, vol) => {
    const len = Math.floor(rate * 0.05);
    const buf = audioCtx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.exp(-t * 60);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const thud = Math.sin(t * 2 * Math.PI * 120) * 0.7;
      const clack = Math.sin(t * 2 * Math.PI * 800) * 0.2 * Math.exp(-t * 120);
      d[i] = (noise + thud + clack) * env * vol;
    }
    return buf;
  };

  // 「ガタン・ゴトン」パターンをバッファに焼く（1周期 = 0.7秒）
  const makeRailBuffer = (rate) => {
    const period = Math.floor(rate * 0.7);
    const buf = audioCtx.createBuffer(1, period, rate);
    const d = buf.getChannelData(0);
    const click = makeClickSample(rate, 1.0);
    const cd = click.getChannelData(0);

    // ガ（0ms）・タン（70ms）・ゴ（350ms）・トン（420ms）
    const offsets = [0, Math.floor(rate * 0.07), Math.floor(rate * 0.35), Math.floor(rate * 0.42)];
    const vols = [0.8, 1.0, 0.6, 0.85];
    for (let n = 0; n < offsets.length; n++) {
      for (let i = 0; i < cd.length && (i + offsets[n]) < period; i++) {
        d[i + offsets[n]] += cd[i] * vols[n];
      }
    }
    return buf;
  };

  // 楽しいメロディを ScriptProcessor なしでスケジューリング
  const scheduleMelody = (startTime) => {
    // 「線路は続くよどこまでも」風のペンタトニック童謡メロディ
    // 1小節 = 0.7秒（ガタンゴトン1周期と同期）
    // 8小節（5.6秒）でループ
    const bpm = 0.7;
    const notes = [
      // [音高Hz, 開始(小節), 長さ(小節)]
      [392.00, 0,    0.5],  // ソ
      [440.00, 0.5,  0.5],  // ラ
      [523.25, 1,    0.5],  // ド↑
      [440.00, 1.5,  0.5],  // ラ
      [523.25, 2,    1.0],  // ド↑（長め）
      [587.33, 3,    0.5],  // レ↑
      [523.25, 3.5,  0.5],  // ド↑
      [440.00, 4,    1.0],  // ラ（長め）
      [392.00, 5,    0.5],  // ソ
      [329.63, 5.5,  0.5],  // ミ
      [392.00, 6,    0.5],  // ソ
      [440.00, 6.5,  0.5],  // ラ
      [392.00, 7,    1.0],  // ソ（長め）
    ];
    const nodes = [];
    for (const [freq, startBar, durBar] of notes) {
      const noteStart = startTime + startBar * bpm;
      const noteDur = durBar * bpm * 0.9;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, noteStart);
      g.gain.linearRampToValueAtTime(0.12, noteStart + 0.02);
      g.gain.setValueAtTime(0.10, noteStart + noteDur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur);
      osc.connect(g);
      g.connect(bgmGain);
      osc.start(noteStart);
      osc.stop(noteStart + noteDur + 0.01);
      nodes.push(osc);
    }
    return nodes;
  };

  const startBgm = () => {
    if (!audioCtx || bgmPlaying) return;
    bgmPlaying = true;

    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(masterGain);

    // ガタンゴトン（ループ再生）
    if (!railBuffer) railBuffer = makeRailBuffer(audioCtx.sampleRate);
    const railSrc = audioCtx.createBufferSource();
    railSrc.buffer = railBuffer;
    railSrc.loop = true;
    const railGain = audioCtx.createGain();
    railGain.gain.value = 0.35;
    railSrc.connect(railGain);
    railGain.connect(bgmGain);
    railSrc.start();
    bgmNodes.push(railSrc);

    // 控えめな走行ノイズ（薄く敷く）
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.Q.value = 0.3;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.06;
    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(bgmGain);
    noise.start();
    bgmNodes.push(noise);

    // メロディ（8小節ごとに再スケジュール）
    const loopDur = 0.7 * 8;
    const scheduleLoop = () => {
      if (!bgmPlaying) return;
      const melodyNodes = scheduleMelody(audioCtx.currentTime + 0.05);
      bgmNodes.push(...melodyNodes);
      bgmTimerId = setTimeout(scheduleLoop, loopDur * 1000);
    };
    scheduleLoop();

    // フェードイン
    bgmGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.5);
  };

  const stopBgm = () => {
    if (!bgmPlaying) return;
    bgmPlaying = false;
    if (bgmTimerId) {
      clearTimeout(bgmTimerId);
      bgmTimerId = null;
    }
    if (bgmGain) {
      const t = audioCtx.currentTime;
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
      bgmGain.gain.linearRampToValueAtTime(0, t + 0.5);
    }
    const nodes = bgmNodes;
    bgmNodes = [];
    setTimeout(() => {
      for (const node of nodes) {
        try { node.stop(); } catch (e) {}
      }
      bgmGain = null;
    }, 600);
  };

  ns.startBgm = () => startBgm();
  ns.stopBgm = () => stopBgm();

  // --- ヒント設定 (§5.8.3) ---

  ns.getHintsEnabled = () => localStorage.getItem('hintsEnabled') !== 'false';

  ns.setHintsEnabled = (enabled) => {
    localStorage.setItem('hintsEnabled', enabled ? 'true' : 'false');
  };

  ns.updateHintsButton = () => {
    const btn = document.getElementById('hints-toggle');
    if (!btn) return;
    const enabled = ns.getHintsEnabled();
    btn.textContent = `⚠️ あぶないよ サイン：${enabled ? 'オン' : 'オフ'}`;
  };

  // --- 画面制御 ---

  /**
   * @param {string} screenId
   */
  ns.showScreen = (screenId) => {
    const screens = document.querySelectorAll('.screen');
    for (const screen of screens) {
      screen.classList.remove('active');
    }
    document.getElementById(screenId).classList.add('active');

    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      const showMute = screenId === 'game-screen' || screenId === 'win-screen' || screenId === 'tutorial-screen';
      muteBtn.style.display = showMute ? 'flex' : 'none';
    }
  };

  /**
   * @param {string} side
   */
  ns.updateTurnDisplay = (side) => {
    const el = document.getElementById('turn-display');
    el.classList.remove('red-turn', 'blue-turn');

    if (side === 'red') {
      el.textContent = 'あかの ばん';
      el.classList.add('red-turn');
    } else {
      el.textContent = 'あおの ばん';
      el.classList.add('blue-turn');
    }
  };

  /**
   * @param {Array} pieces
   */
  ns.updateDepots = (pieces) => {
    const redDepot = document.querySelector('#red-depot .depot-pieces');
    const blueDepot = document.querySelector('#blue-depot .depot-pieces');

    redDepot.innerHTML = '';
    blueDepot.innerHTML = '';

    for (const piece of pieces) {
      if (!piece.captured) continue;

      const typeInfo = ns.PIECE_TYPES[piece.type];
      const img = document.createElement('img');
      img.src = typeInfo.image[piece.side];
      img.alt = typeInfo.name;
      img.style.width = '36px';
      img.style.height = '36px';
      img.draggable = false;

      if (piece.side === 'red') {
        blueDepot.appendChild(img);
      } else {
        redDepot.appendChild(img);
      }
    }
  };

  /**
   * @param {string} winner
   */
  ns.showWinScreen = (winner) => {
    const winnerName = winner === 'red' ? 'あか' : 'あお';
    const loserName = winner === 'red' ? 'あお' : 'あか';

    const messageEl = document.getElementById('win-message');
    messageEl.innerHTML =
      '<div style="font-size: 48px;">🎉</div>' +
      `<div>${winnerName}の かち！</div>` +
      '<div style="font-size: 20px; margin-top: 8px;">やったね！🚄</div>' +
      `<div style="font-size: 16px; color: #888; margin-top: 12px;">${loserName}も がんばったね！</div>`;

    ns.showScreen('win-screen');
  };

  ns.playConfetti = () => {
    const colors = ['#f04040', '#4080f0', '#40c040', '#f0c040', '#f080c0', '#80d0f0'];

    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.classList.add('confetti');
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top = `${-10 - Math.random() * 20}px`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = `${6 + Math.random() * 8}px`;
      el.style.height = `${6 + Math.random() * 8}px`;
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      el.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  };

  /**
   * @param {number} redRemaining
   * @param {number} blueRemaining
   * @param {string|null} side
   */
  ns.updateUndoButton = (redRemaining, blueRemaining, side) => {
    const btn = document.getElementById('undo-btn');
    if (!side) {
      btn.textContent = 'もどす';
      btn.disabled = true;
      return;
    }

    const remaining = side === 'red' ? redRemaining : blueRemaining;
    btn.textContent = `もどす（${remaining}）`;
    btn.disabled = remaining <= 0;
  };

})(window.DenshaShogi);
