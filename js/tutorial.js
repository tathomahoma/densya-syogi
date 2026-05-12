// §5.7 チュートリアル。サンドボックス状態で再生

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  var TOTAL_STEPS = 6;
  var currentStep = 0;
  var timers = [];
  var active = false;
  var completeFn = null;
  var skipFn = null;

  function addTimer(fn, delay) {
    if (!active) return;
    var id = setTimeout(function() {
      if (active) fn();
    }, delay);
    timers.push(id);
  }

  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }

  function getBoard() {
    return document.getElementById('tutorial-board');
  }

  function getCell(row, col) {
    return getBoard().querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
  }

  function createPiece(p) {
    var el = document.createElement('div');
    el.classList.add('piece', 'piece-' + p.side);
    if (p.promoted) el.classList.add('piece-promoted');
    var info = ns.PIECE_TYPES[p.type];
    var name = p.promoted ? info.promotedName : info.name;
    var img = document.createElement('img');
    img.src = info.image[p.side];
    img.alt = name;
    img.classList.add('piece-img');
    img.draggable = false;
    el.appendChild(img);
    if (p.promoted) {
      var badge = document.createElement('div');
      badge.classList.add('promoted-badge');
      badge.textContent = '★';
      el.appendChild(badge);
    }
    return el;
  }

  function buildBoard(rows, cols, pieces) {
    var board = getBoard();
    board.innerHTML = '';
    board.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    board.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';

    for (var r = rows; r >= 1; r--) {
      for (var c = 1; c <= cols; c++) {
        var cell = document.createElement('div');
        cell.classList.add('cell');
        cell.classList.add((r + c) % 2 === 0 ? 'cell-light' : 'cell-dark');
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        for (var i = 0; i < pieces.length; i++) {
          if (pieces[i].row === r && pieces[i].col === c) {
            cell.appendChild(createPiece(pieces[i]));
            break;
          }
        }
        board.appendChild(cell);
      }
    }
  }

  function showPointer(row, col) {
    var cell = getCell(row, col);
    var ptr = document.getElementById('tutorial-pointer');
    if (!cell || !ptr) return;
    var board = getBoard();
    var bRect = board.getBoundingClientRect();
    var cRect = cell.getBoundingClientRect();
    ptr.style.left = (cRect.left - bRect.left + cRect.width / 2) + 'px';
    ptr.style.top = (cRect.top - bRect.top + cRect.height * 0.7) + 'px';
    ptr.style.display = 'block';
  }

  function hidePointer() {
    var ptr = document.getElementById('tutorial-pointer');
    if (ptr) ptr.style.display = 'none';
  }

  function tapEffect() {
    var ptr = document.getElementById('tutorial-pointer');
    if (!ptr) return;
    ptr.style.transform = 'translate(-50%, -50%) scale(0.7)';
    addTimer(function() {
      ptr.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 150);
  }

  function animateSlide(fR, fC, tR, tC, cb) {
    var from = getCell(fR, fC);
    var to = getCell(tR, tC);
    if (!from || !to) { if (cb) cb(); return; }
    var el = from.querySelector('.piece');
    if (!el) { if (cb) cb(); return; }

    var fRect = from.getBoundingClientRect();
    var tRect = to.getBoundingClientRect();

    el.style.position = 'relative';
    el.style.zIndex = '10';
    el.style.transition = 'left 0.25s ease, top 0.25s ease';
    el.style.left = '0px';
    el.style.top = '0px';

    requestAnimationFrame(function() {
      el.style.left = (tRect.left - fRect.left) + 'px';
      el.style.top = (tRect.top - fRect.top) + 'px';
    });

    addTimer(function() {
      el.style.cssText = '';
      from.removeChild(el);
      to.appendChild(el);
      if (cb) cb();
    }, 280);
  }

  // --- 各ステップのアニメーション ---

  function runStep1() {
    buildBoard(4, 5, [
      { side: 'blue', type: 'kamotsu', row: 4, col: 1 },
      { side: 'blue', type: 'shinkansen', row: 4, col: 3 },
      { side: 'blue', type: 'tokkyuu', row: 4, col: 5 },
      { side: 'blue', type: 'futsuu', row: 3, col: 2 },
      { side: 'blue', type: 'futsuu', row: 3, col: 4 },
      { side: 'red', type: 'futsuu', row: 2, col: 2 },
      { side: 'red', type: 'futsuu', row: 2, col: 4 },
      { side: 'red', type: 'tokkyuu', row: 1, col: 1 },
      { side: 'red', type: 'shinkansen', row: 1, col: 3 },
      { side: 'red', type: 'kamotsu', row: 1, col: 5 },
    ]);
    hidePointer();

    var pieces = getBoard().querySelectorAll('.piece');
    for (var i = 0; i < pieces.length; i++) {
      pieces[i].style.opacity = '0';
      pieces[i].style.transition = 'opacity 0.3s';
    }

    var idx = 0;
    function show() {
      if (idx < pieces.length) {
        pieces[idx].style.opacity = '1';
        idx++;
        addTimer(show, 200);
      }
    }
    addTimer(show, 400);
  }

  function runStep2() {
    buildBoard(3, 3, [{ side: 'red', type: 'futsuu', row: 1, col: 2 }]);

    function loop() {
      var c = getCell(1, 2);
      if (c) c.classList.remove('selected');
      hidePointer();

      addTimer(function() { showPointer(1, 2); }, 400);
      addTimer(function() { tapEffect(); }, 1000);
      addTimer(function() {
        var c2 = getCell(1, 2);
        if (c2) c2.classList.add('selected');
        ns.playSelectSound();
      }, 1200);
      addTimer(function() {
        var c3 = getCell(1, 2);
        if (c3) c3.classList.remove('selected');
        hidePointer();
        addTimer(loop, 400);
      }, 3200);
    }
    loop();
  }

  function runStep3() {
    function loop() {
      buildBoard(3, 3, [{ side: 'red', type: 'futsuu', row: 1, col: 2 }]);

      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.add('selected');
        var m = getCell(2, 2);
        if (m) m.classList.add('movable');
      }, 200);
      addTimer(function() { showPointer(2, 2); }, 600);
      addTimer(function() { tapEffect(); }, 1200);
      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.remove('selected');
        var m = getCell(2, 2);
        if (m) m.classList.remove('movable');
        hidePointer();
        ns.playMoveSound('futsuu');
        animateSlide(1, 2, 2, 2, function() {
          addTimer(loop, 1200);
        });
      }, 1400);
    }
    loop();
  }

  function runStep4() {
    var pieces = [
      { side: 'red', type: 'tokkyuu', row: 1, col: 2 },
      { side: 'blue', type: 'futsuu', row: 2, col: 2 },
    ];

    function loop() {
      buildBoard(3, 3, pieces);

      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.add('selected');
        var m = getCell(2, 2);
        if (m) m.classList.add('capturable');
      }, 200);
      addTimer(function() { showPointer(2, 2); }, 600);
      addTimer(function() { tapEffect(); }, 1200);
      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.remove('selected');
        var m = getCell(2, 2);
        if (m) m.classList.remove('capturable');
        hidePointer();

        // 取られる駒を縮小
        addTimer(function() {
          var t = getCell(2, 2);
          if (t) {
            var bp = t.querySelector('.piece-blue');
            if (bp) {
              bp.style.transition = 'transform 0.2s, opacity 0.2s';
              bp.style.transform = 'scale(0)';
              bp.style.opacity = '0';
            }
          }
        }, 100);

        ns.playMoveSound('tokkyuu');
        animateSlide(1, 2, 2, 2, function() {
          var t = getCell(2, 2);
          if (t) {
            var bp = t.querySelector('.piece-blue');
            if (bp && bp.parentNode) bp.remove();
          }
          ns.playCaptureSound();
          addTimer(loop, 1800);
        });
      }, 1400);
    }
    loop();
  }

  function runStep5() {
    function loop() {
      buildBoard(4, 3, [{ side: 'red', type: 'futsuu', row: 2, col: 2 }]);

      // 成りゾーン表示
      for (var r = 3; r <= 4; r++) {
        for (var c = 1; c <= 3; c++) {
          var zc = getCell(r, c);
          if (zc) zc.classList.add('promotion-zone');
        }
      }

      addTimer(function() {
        var c = getCell(2, 2);
        if (c) c.classList.add('selected');
        var m = getCell(3, 2);
        if (m) m.classList.add('movable');
      }, 200);
      addTimer(function() { showPointer(3, 2); }, 600);
      addTimer(function() { tapEffect(); }, 1200);
      addTimer(function() {
        var c = getCell(2, 2);
        if (c) c.classList.remove('selected');
        var m = getCell(3, 2);
        if (m) m.classList.remove('movable');
        hidePointer();
        ns.playMoveSound('futsuu');
        animateSlide(2, 2, 3, 2, function() {
          var cell = getCell(3, 2);
          if (cell) {
            var p = cell.querySelector('.piece');
            if (p) {
              p.classList.add('piece-promoted');
              var badge = document.createElement('div');
              badge.classList.add('promoted-badge');
              badge.textContent = '★';
              p.appendChild(badge);
            }
          }
          ns.playPromoteSound();
          addTimer(loop, 2200);
        });
      }, 1400);
    }
    loop();
  }

  function runStep6() {
    var pieces = [
      { side: 'red', type: 'shinkansen', row: 1, col: 2 },
      { side: 'blue', type: 'shinkansen', row: 2, col: 2 },
    ];

    function loop() {
      buildBoard(3, 3, pieces);

      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.add('selected');
        var m = getCell(2, 2);
        if (m) m.classList.add('capturable');
      }, 200);
      addTimer(function() { showPointer(2, 2); }, 600);
      addTimer(function() { tapEffect(); }, 1200);
      addTimer(function() {
        var c = getCell(1, 2);
        if (c) c.classList.remove('selected');
        var m = getCell(2, 2);
        if (m) m.classList.remove('capturable');
        hidePointer();

        addTimer(function() {
          var t = getCell(2, 2);
          if (t) {
            var bp = t.querySelector('.piece-blue');
            if (bp) {
              bp.style.transition = 'transform 0.2s, opacity 0.2s';
              bp.style.transform = 'scale(0)';
              bp.style.opacity = '0';
            }
          }
        }, 100);

        ns.playMoveSound('shinkansen');
        animateSlide(1, 2, 2, 2, function() {
          var t = getCell(2, 2);
          if (t) {
            var bp = t.querySelector('.piece-blue');
            if (bp && bp.parentNode) bp.remove();
          }
          ns.playCaptureSound();
          addTimer(function() {
            ns.playWinSound();
            ns.playConfetti();
          }, 300);
          addTimer(loop, 5000);
        });
      }, 1400);
    }
    loop();
  }

  var STEP_MESSAGES = [
    'これは でんしゃしょうぎ だよ',
    'じぶんの でんしゃを タップしてね',
    'みどりの まるに タップ',
    'あいての でんしゃが いると とれる',
    'おくの 2れつで つよくなる（なり）',
    'あいての しんかんせん☆ を\nとれたら かち！',
  ];

  var STEP_RUNNERS = [runStep1, runStep2, runStep3, runStep4, runStep5, runStep6];

  function renderStep() {
    clearTimers();
    hidePointer();

    var msg = document.getElementById('tutorial-message');
    msg.textContent = STEP_MESSAGES[currentStep];

    // ステップインジケータ
    var dotsEl = document.getElementById('tutorial-dots');
    var dots = '';
    for (var i = 0; i < TOTAL_STEPS; i++) {
      dots += (i === currentStep ? '● ' : '○ ');
    }
    dotsEl.textContent = dots.trim();

    // ボタン更新
    var prev = document.getElementById('tutorial-prev');
    var next = document.getElementById('tutorial-next');
    prev.disabled = currentStep === 0;
    prev.classList.toggle('tutorial-btn-disabled', currentStep === 0);
    next.textContent = currentStep === TOTAL_STEPS - 1 ? 'はじめる！' : 'つぎへ →';

    // ボードアニメーション開始
    addTimer(function() {
      STEP_RUNNERS[currentStep]();
    }, 100);
  }

  function finish(skipped) {
    active = false;
    clearTimers();
    localStorage.setItem('tutorialSeen', 'true');
    ns.showScreen('title-screen');
    ns.stopFanfare();

    if (skipped && skipFn) {
      skipFn();
    } else if (completeFn) {
      completeFn();
    }
  }

  // --- 公開 API ---

  ns.startTutorial = function(onComplete, onSkip) {
    active = true;
    currentStep = 0;
    completeFn = onComplete || null;
    skipFn = onSkip || null;
    ns.showScreen('tutorial-screen');
    renderStep();
  };

  ns.stopTutorial = function() {
    active = false;
    clearTimers();
  };

  ns.initTutorialNav = function() {
    document.getElementById('tutorial-prev').addEventListener('click', function() {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
      }
    });

    document.getElementById('tutorial-next').addEventListener('click', function() {
      if (currentStep < TOTAL_STEPS - 1) {
        currentStep++;
        renderStep();
      } else {
        finish(false);
      }
    });

    document.getElementById('tutorial-skip').addEventListener('click', function() {
      finish(true);
    });
  };

})(window.DenshaShogi);
