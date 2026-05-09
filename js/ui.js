// ターン表示・ボタン・効果音・勝利演出

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  /**
   * @param {string} screenId
   */
  ns.showScreen = function(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    document.getElementById(screenId).classList.add('active');
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

  ns.playMoveSound = function() {
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) { /* audio not available */ }
  };

  ns.playCaptureSound = function() {
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) { /* audio not available */ }
  };

  ns.playPromoteSound = function() {
    try {
      var ctx = getAudioCtx();
      var notes = [440, 554, 660];
      for (var i = 0; i < notes.length; i++) {
        (function(freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        })(notes[i], i);
      }
    } catch (_) { /* audio not available */ }
  };

  ns.playWinSound = function() {
    try {
      var ctx = getAudioCtx();
      var notes = [523, 659, 784];
      for (var i = 0; i < notes.length; i++) {
        (function(freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.3);
        })(notes[i], i);
      }
    } catch (_) { /* audio not available */ }
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
