// ターン表示・ボタン・効果音合成・勝利演出

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  // --- 効果音システム (§5.5) ---

  var audioCtx = null;
  var masterGain = null;
  var muted = false;
  var activeSounds = {};
  var fanfareNodes = [];
  var noiseBuffer = null;

  ns.initAudio = function() {
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

      var size = audioCtx.sampleRate;
      noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {}
  };

  ns.toggleMute = function() {
    muted = !muted;
    localStorage.setItem('muteAll', muted ? 'true' : 'false');
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 0.5;
    }
    return muted;
  };

  ns.isMuted = function() {
    return muted;
  };

  ns.updateMuteButton = function() {
    var btn = document.getElementById('mute-btn');
    if (btn) {
      btn.textContent = muted ? '🔈' : '🔊';
      btn.setAttribute('aria-label', muted ? 'おとを オンにする' : 'おとを オフにする');
    }
  };

  function stopSound(category) {
    if (activeSounds[category]) {
      for (var i = 0; i < activeSounds[category].length; i++) {
        try { activeSounds[category][i].stop(); } catch (e) {}
      }
    }
    activeSounds[category] = [];
  }

  function createNoise() {
    if (!audioCtx || !noiseBuffer) return null;
    var source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    return source;
  }

  // 駒選択 — 短い「ピッ」（1000Hz サイン波 60ms）
  ns.playSelectSound = function() {
    if (!audioCtx || muted) return;
    stopSound('select');
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
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
  ns.playMoveSound = function(pieceType) {
    if (!audioCtx || muted) return;
    stopSound('move');
    var t = audioCtx.currentTime;
    var nodes = [];

    if (pieceType === 'shinkansen') {
      var noise = createNoise();
      if (!noise) return;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.exponentialRampToValueAtTime(6000, t + 0.12);
      var g = audioCtx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.15);
      nodes.push(noise);
    } else {
      for (var i = 0; i < 2; i++) {
        (function(idx) {
          var offset = idx * 0.12;
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.value = idx === 0 ? 100 : 85;
          gain.gain.setValueAtTime(0, t + offset);
          gain.gain.linearRampToValueAtTime(0.18, t + offset + 0.005);
          gain.gain.setValueAtTime(0.18, t + offset + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + offset);
          osc.stop(t + offset + 0.05);
          nodes.push(osc);
        })(i);
      }
    }
    activeSounds.move = nodes;
  };

  // 駒取り — 柔らかい「ぽふっ」（ノイズ短音 80ms）
  ns.playCaptureSound = function() {
    if (!audioCtx || muted) return;
    stopSound('capture');
    var t = audioCtx.currentTime;
    var noise = createNoise();
    if (!noise) return;
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    var gain = audioCtx.createGain();
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
  ns.playPromoteSound = function() {
    if (!audioCtx || muted) return;
    stopSound('promote');
    var t = audioCtx.currentTime;
    var nodes = [];
    var freqs = [880, 1320, 1760];
    for (var i = 0; i < freqs.length; i++) {
      (function(freq, idx) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
        nodes.push(osc);
      })(freqs[i], i);
    }
    activeSounds.promote = nodes;
  };

  // 勝利ファンファーレ（§5.5.2、約2.5秒）
  ns.playWinSound = function() {
    if (!audioCtx || muted) return;
    stopFanfareNodes();
    var t = audioCtx.currentTime;
    var nodes = [];

    // Part 1: ドミソド↑ アルペジオ
    var arp = [261.63, 329.63, 392.00, 523.25];
    for (var i = 0; i < arp.length; i++) {
      (function(freq, idx) {
        var st = t + idx * 0.18;
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.25, st);
        g.gain.setValueAtTime(0.22, st + 0.15);
        g.gain.exponentialRampToValueAtTime(0.01, st + 0.35);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(st);
        osc.stop(st + 0.35);
        nodes.push(osc);
      })(arp[i], i);
    }

    // Part 2: ソ↑ド↑↑ 高音で締め
    var high = [783.99, 1046.50];
    for (var j = 0; j < high.length; j++) {
      (function(freq, idx) {
        var st = t + 0.85 + idx * 0.25;
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.2, st);
        g.gain.setValueAtTime(0.18, st + 0.2);
        g.gain.exponentialRampToValueAtTime(0.01, st + 0.5);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(st);
        osc.stop(st + 0.5);
        nodes.push(osc);
      })(high[j], j);
    }

    // Part 3: 「シャラララン」キラキラ音
    for (var k = 0; k < 5; k++) {
      (function(idx) {
        var st = t + 1.5 + idx * 0.15;
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000 + idx * 400, st);
        osc.frequency.exponentialRampToValueAtTime(1500 + idx * 200, st + 0.3);
        g.gain.setValueAtTime(0.08, st);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(st);
        osc.stop(st + 0.4);
        nodes.push(osc);
      })(k);
    }

    fanfareNodes = nodes;
  };

  function stopFanfareNodes() {
    for (var i = 0; i < fanfareNodes.length; i++) {
      try { fanfareNodes[i].stop(); } catch (e) {}
    }
    fanfareNodes = [];
  }

  ns.stopFanfare = function() {
    stopFanfareNodes();
  };

  // 敗北側 — 控えめな「ピロリン」（短い上昇音 300ms）
  ns.playLoseSound = function() {
    if (!audioCtx || muted) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
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

  var bgmNodes = [];
  var bgmGain = null;
  var bgmPlaying = false;
  var bgmTimerId = null;

  // ガタンゴトン1打を生成（ノイズバースト＋低い打撃音）
  function makeClickSample(rate, vol) {
    var len = Math.floor(rate * 0.05);
    var buf = audioCtx.createBuffer(1, len, rate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var t = i / rate;
      var env = Math.exp(-t * 60);
      var noise = (Math.random() * 2 - 1) * 0.3;
      var thud = Math.sin(t * 2 * Math.PI * 120) * 0.7;
      var clack = Math.sin(t * 2 * Math.PI * 800) * 0.2 * Math.exp(-t * 120);
      d[i] = (noise + thud + clack) * env * vol;
    }
    return buf;
  }

  // 「ガタン・ゴトン」パターンをバッファに焼く（1周期 = 0.7秒）
  function makeRailBuffer(rate) {
    var period = Math.floor(rate * 0.7);
    var buf = audioCtx.createBuffer(1, period, rate);
    var d = buf.getChannelData(0);
    var click = makeClickSample(rate, 1.0);
    var cd = click.getChannelData(0);

    // ガ（0ms）
    var p0 = 0;
    // タン（70ms）
    var p1 = Math.floor(rate * 0.07);
    // ゴ（350ms）
    var p2 = Math.floor(rate * 0.35);
    // トン（420ms）
    var p3 = Math.floor(rate * 0.42);

    var offsets = [p0, p1, p2, p3];
    var vols = [0.8, 1.0, 0.6, 0.85];
    for (var n = 0; n < offsets.length; n++) {
      for (var i = 0; i < cd.length && (i + offsets[n]) < period; i++) {
        d[i + offsets[n]] += cd[i] * vols[n];
      }
    }
    return buf;
  }

  // 楽しいメロディを ScriptProcessor なしでスケジューリング
  function scheduleMelody(startTime) {
    // 「線路は続くよどこまでも」風のペンタトニック童謡メロディ
    // 1小節 = 0.7秒（ガタンゴトン1周期と同期）
    // 8小節（5.6秒）でループ
    var bpm = 0.7;
    var notes = [
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
    var nodes = [];
    for (var i = 0; i < notes.length; i++) {
      var freq = notes[i][0];
      var noteStart = startTime + notes[i][1] * bpm;
      var noteDur = notes[i][2] * bpm * 0.9;
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
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
  }

  function startBgm() {
    if (!audioCtx || bgmPlaying) return;
    bgmPlaying = true;

    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(masterGain);

    // ガタンゴトン（ループ再生）
    var railBuf = makeRailBuffer(audioCtx.sampleRate);
    var railSrc = audioCtx.createBufferSource();
    railSrc.buffer = railBuf;
    railSrc.loop = true;
    var railGain = audioCtx.createGain();
    railGain.gain.value = 0.35;
    railSrc.connect(railGain);
    railGain.connect(bgmGain);
    railSrc.start();
    bgmNodes.push(railSrc);

    // 控えめな走行ノイズ（薄く敷く）
    var noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.Q.value = 0.3;
    var noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.06;
    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(bgmGain);
    noise.start();
    bgmNodes.push(noise);

    // メロディ（8小節ごとに再スケジュール）
    var loopDur = 0.7 * 8;
    function scheduleLoop() {
      if (!bgmPlaying) return;
      var melodyNodes = scheduleMelody(audioCtx.currentTime + 0.05);
      for (var i = 0; i < melodyNodes.length; i++) {
        bgmNodes.push(melodyNodes[i]);
      }
      bgmTimerId = setTimeout(scheduleLoop, loopDur * 1000);
    }
    scheduleLoop();

    // フェードイン
    bgmGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.5);
  }

  function stopBgm() {
    if (!bgmPlaying) return;
    bgmPlaying = false;
    if (bgmTimerId) {
      clearTimeout(bgmTimerId);
      bgmTimerId = null;
    }
    if (bgmGain) {
      var t = audioCtx.currentTime;
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
      bgmGain.gain.linearRampToValueAtTime(0, t + 0.5);
    }
    var nodes = bgmNodes;
    bgmNodes = [];
    setTimeout(function() {
      for (var i = 0; i < nodes.length; i++) {
        try { nodes[i].stop(); } catch (e) {}
      }
      bgmGain = null;
    }, 600);
  }

  ns.startBgm = function() { startBgm(); };
  ns.stopBgm = function() { stopBgm(); };

  // --- ヒント設定 (§5.8.3) ---

  ns.getHintsEnabled = function() {
    return localStorage.getItem('hintsEnabled') !== 'false';
  };

  ns.setHintsEnabled = function(enabled) {
    localStorage.setItem('hintsEnabled', enabled ? 'true' : 'false');
  };

  ns.updateHintsButton = function() {
    var btn = document.getElementById('hints-toggle');
    if (!btn) return;
    var enabled = ns.getHintsEnabled();
    btn.textContent = '⚠️ あぶないよ サイン：' + (enabled ? 'オン' : 'オフ');
  };

  // --- 画面制御 ---

  /**
   * @param {string} screenId
   */
  ns.showScreen = function(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    document.getElementById(screenId).classList.add('active');

    var muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      var showMute = screenId === 'game-screen' || screenId === 'win-screen' || screenId === 'tutorial-screen';
      muteBtn.style.display = showMute ? 'flex' : 'none';
    }
  };

  /**
   * @param {string} side
   */
  ns.updateTurnDisplay = function(side) {
    var el = document.getElementById('turn-display');
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
  ns.updateDepots = function(pieces) {
    var redDepot = document.querySelector('#red-depot .depot-pieces');
    var blueDepot = document.querySelector('#blue-depot .depot-pieces');

    redDepot.innerHTML = '';
    blueDepot.innerHTML = '';

    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      if (!piece.captured) continue;

      var typeInfo = ns.PIECE_TYPES[piece.type];
      var img = document.createElement('img');
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
  ns.showWinScreen = function(winner) {
    var winnerName = winner === 'red' ? 'あか' : 'あお';
    var loserName = winner === 'red' ? 'あお' : 'あか';

    var messageEl = document.getElementById('win-message');
    messageEl.innerHTML =
      '<div style="font-size: 48px;">🎉</div>' +
      '<div>' + winnerName + 'の かち！</div>' +
      '<div style="font-size: 20px; margin-top: 8px;">やったね！🚄</div>' +
      '<div style="font-size: 16px; color: #888; margin-top: 12px;">' + loserName + 'も がんばったね！</div>';

    ns.showScreen('win-screen');
  };

  ns.playConfetti = function() {
    var colors = ['#f04040', '#4080f0', '#40c040', '#f0c040', '#f080c0', '#80d0f0'];

    for (var i = 0; i < 40; i++) {
      var el = document.createElement('div');
      el.classList.add('confetti');
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.top = (-10 - Math.random() * 20) + 'px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = (6 + Math.random() * 8) + 'px';
      el.style.height = (6 + Math.random() * 8) + 'px';
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(el);
      (function(e) {
        setTimeout(function() { e.remove(); }, 4000);
      })(el);
    }
  };

  /**
   * @param {number} redRemaining
   * @param {number} blueRemaining
   * @param {string|null} side
   */
  ns.updateUndoButton = function(redRemaining, blueRemaining, side) {
    var btn = document.getElementById('undo-btn');
    if (!side) {
      btn.textContent = 'もどす';
      btn.disabled = true;
      return;
    }

    var remaining = side === 'red' ? redRemaining : blueRemaining;
    btn.textContent = 'もどす（' + remaining + '）';
    btn.disabled = remaining <= 0;
  };

})(window.DenshaShogi);
