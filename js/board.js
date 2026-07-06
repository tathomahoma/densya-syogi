// 盤の描画とタッチ／クリック処理

window.DenshaShogi = window.DenshaShogi || {};

((ns) => {
  'use strict';

  let boardEl;
  let onCellTap;
  let animating = false;

  /**
   * @param {HTMLElement} el
   * @param {function(number, number): void} tapHandler
   */
  ns.initBoard = (el, tapHandler) => {
    boardEl = el;
    onCellTap = tapHandler;

    boardEl.innerHTML = '';

    for (let row = ns.ROWS; row >= 1; row--) {
      for (let col = 1; col <= ns.COLS; col++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.classList.add((row + col) % 2 === 0 ? 'cell-light' : 'cell-dark');
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('role', 'gridcell');
        boardEl.appendChild(cell);
      }
    }

    // セル個別ではなく盤全体で1つのリスナーに委譲する
    boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell || animating) return;
      onCellTap(Number(cell.dataset.row), Number(cell.dataset.col));
    });
  };

  const getCell = (row, col) =>
    boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);

  /**
   * @param {Object} state
   * @param {Object} [opts]
   * @param {string|null} [opts.peekedPieceId]
   * @param {string[]} [opts.threatenedIds]
   * @param {boolean} [opts.hintsEnabled]
   */
  ns.renderBoard = (state, opts) => {
    opts = opts || {};
    const peekedPieceId = opts.peekedPieceId || null;
    const threatenedIds = opts.threatenedIds || [];
    const hintsEnabled = opts.hintsEnabled !== false;
    const isPeeking = !!peekedPieceId;

    const selectedPiece = ns.findPieceById(state.pieces, state.selectedPieceId);
    const peekedPiece = ns.findPieceById(state.pieces, peekedPieceId);

    // 位置キー（'row,col'）でまとめて引けるようにし、セル毎の線形探索をなくす
    const pieceMap = {};
    for (const p of state.pieces) {
      if (!p.captured) pieceMap[`${p.pos.row},${p.pos.col}`] = p;
    }

    const toKeySet = (positions) => {
      const set = {};
      for (const pos of positions) {
        set[`${pos.row},${pos.col}`] = true;
      }
      return set;
    };

    const moveSet = toKeySet(selectedPiece ? ns.movablePositions(state.pieces, selectedPiece) : []);
    const peekMoveSet = toKeySet(peekedPiece ? ns.movablePositions(state.pieces, peekedPiece) : []);

    const cells = boardEl.querySelectorAll('.cell');
    for (const cell of cells) {
      const key = `${cell.dataset.row},${cell.dataset.col}`;

      cell.classList.remove('selected', 'movable', 'capturable', 'peeked', 'peek-movable');

      const existingPiece = cell.querySelector('.piece');
      if (existingPiece) existingPiece.remove();

      const piece = pieceMap[key] || null;

      if (piece) {
        const pieceEl = ns.createPieceElement(piece);

        if (hintsEnabled && threatenedIds.includes(piece.id)) {
          const badge = document.createElement('div');
          badge.classList.add('danger-badge');
          if (isPeeking) badge.classList.add('danger-dimmed');
          badge.textContent = '！';
          pieceEl.appendChild(badge);
        }

        cell.appendChild(pieceEl);

        if (selectedPiece && piece.id === selectedPiece.id) {
          cell.classList.add('selected');
        }
        if (peekedPiece && piece.id === peekedPieceId) {
          cell.classList.add('peeked');
        }
      }

      if (moveSet[key]) {
        if (piece && piece.side !== selectedPiece.side) {
          cell.classList.add('capturable');
        } else {
          cell.classList.add('movable');
        }
      }

      if (peekMoveSet[key]) {
        cell.classList.add('peek-movable');
      }
    }
  };

  /**
   * @param {number} fromRow
   * @param {number} fromCol
   * @param {number} toRow
   * @param {number} toCol
   * @returns {Promise<void>}
   */
  ns.animateMove = (fromRow, fromCol, toRow, toCol) => {
    return new Promise((resolve) => {
      animating = true;

      const fromCell = getCell(fromRow, fromCol);
      const toCell = getCell(toRow, toCol);
      if (!fromCell || !toCell) {
        animating = false;
        resolve();
        return;
      }

      const fromRect = fromCell.getBoundingClientRect();
      const toRect = toCell.getBoundingClientRect();
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      const pieceEl = fromCell.querySelector('.piece');
      if (!pieceEl) {
        animating = false;
        resolve();
        return;
      }

      pieceEl.style.position = 'relative';
      pieceEl.style.zIndex = '10';
      pieceEl.style.transition = 'left 0.25s ease, top 0.25s ease';
      pieceEl.style.left = '0px';
      pieceEl.style.top = '0px';

      requestAnimationFrame(() => {
        pieceEl.style.left = `${dx}px`;
        pieceEl.style.top = `${dy}px`;
      });

      setTimeout(() => {
        animating = false;
        resolve();
      }, 260);
    });
  };

  /**
   * @param {number} row
   * @param {number} col
   */
  ns.playCaptureEffect = (row, col) => {
    const cell = getCell(row, col);
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();
    const cx = rect.left - boardRect.left + rect.width / 2;
    const cy = rect.top - boardRect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 30 + Math.random() * 20;
      particle.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      particle.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      particle.style.left = `${cx}px`;
      particle.style.top = `${cy}px`;
      boardEl.appendChild(particle);
      setTimeout(() => particle.remove(), 500);
    }
  };

  /**
   * 駒の DOM 要素を生成する。チュートリアルの盤描画からも共用する。
   * @param {Piece} piece
   * @returns {HTMLElement}
   */
  ns.createPieceElement = (piece) => {
    const el = document.createElement('div');
    el.classList.add('piece', `piece-${piece.side}`);
    if (piece.promoted) {
      el.classList.add('piece-promoted');
    }

    const typeInfo = ns.PIECE_TYPES[piece.type];
    const displayName = piece.promoted ? typeInfo.promotedName : typeInfo.name;

    const img = document.createElement('img');
    img.src = ns.pieceImage(piece);
    img.alt = displayName;
    img.classList.add('piece-img');
    img.draggable = false;
    el.appendChild(img);

    if (piece.promoted) {
      const badge = document.createElement('div');
      badge.classList.add('promoted-badge');
      badge.textContent = '★';
      el.appendChild(badge);
    }

    el.setAttribute('aria-label', `${piece.side === 'red' ? 'あか' : 'あお'}の${displayName}`);

    return el;
  };

})(window.DenshaShogi);
