// 盤の描画とタッチ／クリック処理

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  var boardEl;
  var onCellTap;
  var animating = false;

  /**
   * @param {HTMLElement} el
   * @param {function(number, number): void} tapHandler
   */
  ns.initBoard = function(el, tapHandler) {
    boardEl = el;
    onCellTap = tapHandler;

    boardEl.innerHTML = '';

    for (var row = ns.ROWS; row >= 1; row--) {
      for (var col = 1; col <= ns.COLS; col++) {
        var cell = document.createElement('div');
        cell.classList.add('cell');
        cell.classList.add((row + col) % 2 === 0 ? 'cell-light' : 'cell-dark');
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('role', 'gridcell');

        (function(r, c) {
          cell.addEventListener('click', function() {
            if (!animating) onCellTap(r, c);
          });
        })(row, col);

        boardEl.appendChild(cell);
      }
    }
  };

  function getCell(row, col) {
    return boardEl.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
  }

  /**
   * @param {Object} state
   */
  ns.renderBoard = function(state) {
    var cells = boardEl.querySelectorAll('.cell');
    var selectedPiece = null;
    if (state.selectedPieceId) {
      for (var i = 0; i < state.pieces.length; i++) {
        if (state.pieces[i].id === state.selectedPieceId) { selectedPiece = state.pieces[i]; break; }
      }
    }

    var moves = selectedPiece ? ns.movablePositions(state.pieces, selectedPiece) : [];

    for (var ci = 0; ci < cells.length; ci++) {
      var cell = cells[ci];
      var row = Number(cell.dataset.row);
      var col = Number(cell.dataset.col);

      cell.classList.remove('selected', 'movable', 'capturable');

      var existingPiece = cell.querySelector('.piece');
      if (existingPiece) existingPiece.remove();

      var piece = ns.pieceAt(state.pieces, row, col);

      if (piece) {
        var pieceEl = createPieceElement(piece);
        cell.appendChild(pieceEl);

        if (selectedPiece && piece.id === selectedPiece.id) {
          cell.classList.add('selected');
        }
      }

      var isMove = false;
      for (var mi = 0; mi < moves.length; mi++) {
        if (moves[mi].row === row && moves[mi].col === col) { isMove = true; break; }
      }
      if (isMove) {
        var occupant = ns.pieceAt(state.pieces, row, col);
        if (occupant && occupant.side !== selectedPiece.side) {
          cell.classList.add('capturable');
        } else {
          cell.classList.add('movable');
        }
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
  ns.animateMove = function(fromRow, fromCol, toRow, toCol) {
    return new Promise(function(resolve) {
      animating = true;

      var fromCell = getCell(fromRow, fromCol);
      var toCell = getCell(toRow, toCol);
      if (!fromCell || !toCell) {
        animating = false;
        resolve();
        return;
      }

      var fromRect = fromCell.getBoundingClientRect();
      var toRect = toCell.getBoundingClientRect();
      var dx = toRect.left - fromRect.left;
      var dy = toRect.top - fromRect.top;

      var pieceEl = fromCell.querySelector('.piece');
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

      requestAnimationFrame(function() {
        pieceEl.style.left = dx + 'px';
        pieceEl.style.top = dy + 'px';
      });

      setTimeout(function() {
        animating = false;
        resolve();
      }, 260);
    });
  };

  /**
   * @param {number} row
   * @param {number} col
   */
  ns.playCaptureEffect = function(row, col) {
    var cell = getCell(row, col);
    if (!cell) return;

    var rect = cell.getBoundingClientRect();
    var boardRect = boardEl.getBoundingClientRect();
    var cx = rect.left - boardRect.left + rect.width / 2;
    var cy = rect.top - boardRect.top + rect.height / 2;

    for (var i = 0; i < 8; i++) {
      var particle = document.createElement('div');
      particle.classList.add('particle');
      var angle = (Math.PI * 2 * i) / 8;
      var dist = 30 + Math.random() * 20;
      particle.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      particle.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      boardEl.appendChild(particle);
      (function(p) {
        setTimeout(function() { p.remove(); }, 500);
      })(particle);
    }
  };

  function createPieceElement(piece) {
    var el = document.createElement('div');
    el.classList.add('piece', 'piece-' + piece.side);
    if (piece.promoted) {
      el.classList.add('piece-promoted');
    }

    var typeInfo = ns.PIECE_TYPES[piece.type];
    var displayName = piece.promoted ? typeInfo.promotedName : typeInfo.name;

    var img = document.createElement('img');
    img.src = typeInfo.image[piece.side];
    img.alt = displayName;
    img.classList.add('piece-img');
    img.draggable = false;
    el.appendChild(img);

    if (piece.promoted) {
      var badge = document.createElement('div');
      badge.classList.add('promoted-badge');
      badge.textContent = '★';
      el.appendChild(badge);
    }

    el.setAttribute('aria-label', (piece.side === 'red' ? 'あか' : 'あお') + 'の' + displayName);

    return el;
  }

})(window.DenshaShogi);
