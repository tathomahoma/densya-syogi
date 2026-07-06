// §5.7 チュートリアル。サンドボックス状態で再生

window.DenshaShogi = window.DenshaShogi || {};

((ns) => {
  'use strict';

  const TOTAL_STEPS = 6;
  let currentStep = 0;
  let timers = [];
  let active = false;
  let completeFn = null;
  let skipFn = null;

  const addTimer = (fn, delay) => {
    if (!active) return;
    const id = setTimeout(() => {
      if (active) fn();
    }, delay);
    timers.push(id);
  };

  const clearTimers = () => {
    for (const id of timers) clearTimeout(id);
    timers = [];
  };

  const getBoard = () => document.getElementById('tutorial-board');

  const getCell = (row, col) =>
    getBoard().querySelector(`[data-row="${row}"][data-col="${col}"]`);

  const buildBoard = (rows, cols, pieces) => {
    const board = getBoard();
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = rows; r >= 1; r--) {
      for (let c = 1; c <= cols; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.classList.add((r + c) % 2 === 0 ? 'cell-light' : 'cell-dark');
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        const piece = pieces.find((p) => p.row === r && p.col === c);
        if (piece) {
          cell.appendChild(ns.createPieceElement(piece));
        }
        board.appendChild(cell);
      }
    }
  };

  const showPointer = (row, col) => {
    const cell = getCell(row, col);
    const ptr = document.getElementById('tutorial-pointer');
    if (!cell || !ptr) return;
    const board = getBoard();
    const bRect = board.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();
    ptr.style.left = `${cRect.left - bRect.left + cRect.width / 2}px`;
    ptr.style.top = `${cRect.top - bRect.top + cRect.height * 0.7}px`;
    ptr.style.display = 'block';
  };

  const hidePointer = () => {
    const ptr = document.getElementById('tutorial-pointer');
    if (ptr) ptr.style.display = 'none';
  };

  const tapEffect = () => {
    const ptr = document.getElementById('tutorial-pointer');
    if (!ptr) return;
    ptr.style.transform = 'translate(-50%, -50%) scale(0.7)';
    addTimer(() => {
      ptr.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 150);
  };

  const animateSlide = (fR, fC, tR, tC, cb) => {
    const from = getCell(fR, fC);
    const to = getCell(tR, tC);
    if (!from || !to) { if (cb) cb(); return; }
    const el = from.querySelector('.piece');
    if (!el) { if (cb) cb(); return; }

    const fRect = from.getBoundingClientRect();
    const tRect = to.getBoundingClientRect();

    el.style.position = 'relative';
    el.style.zIndex = '10';
    el.style.transition = 'left 0.25s ease, top 0.25s ease';
    el.style.left = '0px';
    el.style.top = '0px';

    requestAnimationFrame(() => {
      el.style.left = `${tRect.left - fRect.left}px`;
      el.style.top = `${tRect.top - fRect.top}px`;
    });

    addTimer(() => {
      el.style.cssText = '';
      from.removeChild(el);
      to.appendChild(el);
      if (cb) cb();
    }, 280);
  };

  // --- 各ステップのアニメーション ---

  const runStep1 = () => {
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

    const pieces = getBoard().querySelectorAll('.piece');
    for (const piece of pieces) {
      piece.style.opacity = '0';
      piece.style.transition = 'opacity 0.3s';
    }

    let idx = 0;
    const show = () => {
      if (idx < pieces.length) {
        pieces[idx].style.opacity = '1';
        idx++;
        addTimer(show, 200);
      }
    };
    addTimer(show, 400);
  };

  const runStep2 = () => {
    buildBoard(3, 3, [{ side: 'red', type: 'futsuu', row: 1, col: 2 }]);

    const loop = () => {
      const c = getCell(1, 2);
      if (c) c.classList.remove('selected');
      hidePointer();

      addTimer(() => showPointer(1, 2), 400);
      addTimer(() => tapEffect(), 1000);
      addTimer(() => {
        const c2 = getCell(1, 2);
        if (c2) c2.classList.add('selected');
        ns.playSelectSound();
      }, 1200);
      addTimer(() => {
        const c3 = getCell(1, 2);
        if (c3) c3.classList.remove('selected');
        hidePointer();
        addTimer(loop, 400);
      }, 3200);
    };
    loop();
  };

  const runStep3 = () => {
    const loop = () => {
      buildBoard(3, 3, [{ side: 'red', type: 'futsuu', row: 1, col: 2 }]);

      addTimer(() => {
        const c = getCell(1, 2);
        if (c) c.classList.add('selected');
        const m = getCell(2, 2);
        if (m) m.classList.add('movable');
      }, 200);
      addTimer(() => showPointer(2, 2), 600);
      addTimer(() => tapEffect(), 1200);
      addTimer(() => {
        const c = getCell(1, 2);
        if (c) c.classList.remove('selected');
        const m = getCell(2, 2);
        if (m) m.classList.remove('movable');
        hidePointer();
        ns.playMoveSound('futsuu');
        animateSlide(1, 2, 2, 2, () => {
          addTimer(loop, 1200);
        });
      }, 1400);
    };
    loop();
  };

  /**
   * 「あかが あおを 取る」デモの共通ループ（ステップ4・6で共用）。
   * @param {string} attackerType - あか側の駒種
   * @param {string} defenderType - あお側の駒種
   * @param {function|null} afterCapture - 取った直後に呼ぶ演出
   * @param {number} loopDelay - 次ループまでの待ち時間 ms
   */
  const runCaptureDemo = (attackerType, defenderType, afterCapture, loopDelay) => {
    const pieces = [
      { side: 'red', type: attackerType, row: 1, col: 2 },
      { side: 'blue', type: defenderType, row: 2, col: 2 },
    ];

    const loop = () => {
      buildBoard(3, 3, pieces);

      addTimer(() => {
        const c = getCell(1, 2);
        if (c) c.classList.add('selected');
        const m = getCell(2, 2);
        if (m) m.classList.add('capturable');
      }, 200);
      addTimer(() => showPointer(2, 2), 600);
      addTimer(() => tapEffect(), 1200);
      addTimer(() => {
        const c = getCell(1, 2);
        if (c) c.classList.remove('selected');
        const m = getCell(2, 2);
        if (m) m.classList.remove('capturable');
        hidePointer();

        // 取られる駒を縮小
        addTimer(() => {
          const t = getCell(2, 2);
          if (t) {
            const bp = t.querySelector('.piece-blue');
            if (bp) {
              bp.style.transition = 'transform 0.2s, opacity 0.2s';
              bp.style.transform = 'scale(0)';
              bp.style.opacity = '0';
            }
          }
        }, 100);

        ns.playMoveSound(attackerType);
        animateSlide(1, 2, 2, 2, () => {
          const t = getCell(2, 2);
          if (t) {
            const bp = t.querySelector('.piece-blue');
            if (bp && bp.parentNode) bp.remove();
          }
          ns.playCaptureSound();
          if (afterCapture) afterCapture();
          addTimer(loop, loopDelay);
        });
      }, 1400);
    };
    loop();
  };

  const runStep4 = () => {
    runCaptureDemo('tokkyuu', 'futsuu', null, 1800);
  };

  const runStep5 = () => {
    const loop = () => {
      buildBoard(4, 3, [{ side: 'red', type: 'futsuu', row: 2, col: 2 }]);

      // 成りゾーン表示
      for (let r = 3; r <= 4; r++) {
        for (let c = 1; c <= 3; c++) {
          const zc = getCell(r, c);
          if (zc) zc.classList.add('promotion-zone');
        }
      }

      addTimer(() => {
        const c = getCell(2, 2);
        if (c) c.classList.add('selected');
        const m = getCell(3, 2);
        if (m) m.classList.add('movable');
      }, 200);
      addTimer(() => showPointer(3, 2), 600);
      addTimer(() => tapEffect(), 1200);
      addTimer(() => {
        const c = getCell(2, 2);
        if (c) c.classList.remove('selected');
        const m = getCell(3, 2);
        if (m) m.classList.remove('movable');
        hidePointer();
        ns.playMoveSound('futsuu');
        animateSlide(2, 2, 3, 2, () => {
          const cell = getCell(3, 2);
          if (cell) {
            const p = cell.querySelector('.piece');
            if (p) {
              // 成り後の駒要素に差し替え（かいそくアイコン＋★バッジ）
              cell.replaceChild(ns.createPieceElement({ side: 'red', type: 'futsuu', promoted: true }), p);
            }
          }
          ns.playPromoteSound();
          addTimer(loop, 2200);
        });
      }, 1400);
    };
    loop();
  };

  const runStep6 = () => {
    runCaptureDemo('shinkansen', 'shinkansen', () => {
      addTimer(() => {
        ns.playWinSound();
        ns.playConfetti();
      }, 300);
    }, 5000);
  };

  const STEP_MESSAGES = [
    'これは でんしゃしょうぎ だよ',
    'じぶんの でんしゃを タップしてね',
    'みどりの まるに タップ',
    'あいての でんしゃが いると とれる',
    'おくの 2れつで つよくなる（なり）',
    'あいての しんかんせん☆ を\nとれたら かち！',
  ];

  const STEP_RUNNERS = [runStep1, runStep2, runStep3, runStep4, runStep5, runStep6];

  const renderStep = () => {
    clearTimers();
    hidePointer();

    const msg = document.getElementById('tutorial-message');
    msg.textContent = STEP_MESSAGES[currentStep];

    // ステップインジケータ
    const dotsEl = document.getElementById('tutorial-dots');
    let dots = '';
    for (let i = 0; i < TOTAL_STEPS; i++) {
      dots += (i === currentStep ? '● ' : '○ ');
    }
    dotsEl.textContent = dots.trim();

    // ボタン更新
    const prev = document.getElementById('tutorial-prev');
    const next = document.getElementById('tutorial-next');
    prev.disabled = currentStep === 0;
    prev.classList.toggle('tutorial-btn-disabled', currentStep === 0);
    next.textContent = currentStep === TOTAL_STEPS - 1 ? 'はじめる！' : 'つぎへ →';

    // ボードアニメーション開始
    addTimer(() => {
      STEP_RUNNERS[currentStep]();
    }, 100);
  };

  const finish = (skipped) => {
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
  };

  // --- 公開 API ---

  ns.startTutorial = (onComplete, onSkip) => {
    active = true;
    currentStep = 0;
    completeFn = onComplete || null;
    skipFn = onSkip || null;
    ns.showScreen('tutorial-screen');
    renderStep();
  };

  ns.stopTutorial = () => {
    active = false;
    clearTimers();
  };

  ns.initTutorialNav = () => {
    document.getElementById('tutorial-prev').addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
      }
    });

    document.getElementById('tutorial-next').addEventListener('click', () => {
      if (currentStep < TOTAL_STEPS - 1) {
        currentStep++;
        renderStep();
      } else {
        finish(false);
      }
    });

    document.getElementById('tutorial-skip').addEventListener('click', () => {
      finish(true);
    });
  };

})(window.DenshaShogi);
