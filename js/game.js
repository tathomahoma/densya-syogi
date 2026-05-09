// ゲーム状態の管理（純粋ロジック、DOM に触らない）

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  /**
   * @returns {Object} GameState
   */
  ns.createGameState = function() {
    return {
      phase: 'title',
      pieces: ns.createInitialPieces(),
      selectedPieceId: null,
      winner: null,
      undoCount: { red: 0, blue: 0 },
      prevState: null,
    };
  };

  /**
   * @param {Object} state
   * @returns {Object}
   */
  ns.startGame = function(state) {
    return {
      phase: 'red_turn',
      pieces: ns.createInitialPieces(),
      selectedPieceId: null,
      winner: null,
      undoCount: { red: 0, blue: 0 },
      prevState: null,
    };
  };

  /**
   * @param {Object} state
   * @returns {string|null}
   */
  ns.currentSide = function(state) {
    if (state.phase === 'red_turn') return 'red';
    if (state.phase === 'blue_turn') return 'blue';
    return null;
  };

  /**
   * @param {Object} state
   * @param {string} pieceId
   * @returns {Object}
   */
  ns.selectPiece = function(state, pieceId) {
    var side = ns.currentSide(state);
    if (!side) return state;

    var piece = null;
    for (var i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i].id === pieceId) { piece = state.pieces[i]; break; }
    }
    if (!piece || piece.captured || piece.side !== side) return state;

    if (state.selectedPieceId === pieceId) {
      return Object.assign({}, state, { selectedPieceId: null });
    }

    return Object.assign({}, state, { selectedPieceId: pieceId });
  };

  /**
   * @param {Object} state
   * @returns {Object}
   */
  ns.deselectPiece = function(state) {
    return Object.assign({}, state, { selectedPieceId: null });
  };

  /**
   * @param {Object} state
   * @param {number} toRow
   * @param {number} toCol
   * @returns {{state: Object, moved: boolean, captured: Object|null}}
   */
  ns.movePiece = function(state, toRow, toCol) {
    var side = ns.currentSide(state);
    if (!side || !state.selectedPieceId) {
      return { state: state, moved: false, captured: null };
    }

    var piece = null;
    for (var i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i].id === state.selectedPieceId) { piece = state.pieces[i]; break; }
    }
    if (!piece) return { state: state, moved: false, captured: null };

    var moves = ns.movablePositions(state.pieces, piece);
    var isValid = false;
    for (var j = 0; j < moves.length; j++) {
      if (moves[j].row === toRow && moves[j].col === toCol) { isValid = true; break; }
    }
    if (!isValid) return { state: state, moved: false, captured: null };

    var capturedPiece = ns.pieceAt(state.pieces, toRow, toCol);

    // 成り判定: 相手陣の最後2行に入ったら成る
    var shouldPromote = false;
    if (!piece.promoted) {
      if (side === 'red' && toRow >= ns.ROWS - ns.PROMOTION_ZONE + 1) {
        shouldPromote = true;
      } else if (side === 'blue' && toRow <= ns.PROMOTION_ZONE) {
        shouldPromote = true;
      }
    }

    var newPieces = state.pieces.map(function(p) {
      if (p.id === piece.id) {
        var updated = Object.assign({}, p, { pos: { row: toRow, col: toCol } });
        if (shouldPromote) updated.promoted = true;
        return updated;
      }
      if (capturedPiece && p.id === capturedPiece.id) {
        return Object.assign({}, p, { captured: true });
      }
      return p;
    });

    var isWin = capturedPiece && capturedPiece.type === 'shinkansen';
    var nextPhase = isWin
      ? 'win'
      : state.phase === 'red_turn'
        ? 'blue_turn'
        : 'red_turn';

    var newState = {
      phase: nextPhase,
      pieces: newPieces,
      selectedPieceId: null,
      winner: isWin ? side : null,
      undoCount: Object.assign({}, state.undoCount),
      prevState: state,
    };

    return { state: newState, moved: true, captured: capturedPiece, promoted: shouldPromote };
  };

  /**
   * @param {Object} state
   * @returns {Object}
   */
  ns.undoMove = function(state) {
    if (!state.prevState) return state;

    var side = ns.currentSide(state);
    if (!side) return state;

    if (state.undoCount[side] >= 2) return state;

    var newUndoCount = Object.assign({}, state.undoCount);
    newUndoCount[side] = state.undoCount[side] + 1;

    return Object.assign({}, state.prevState, { undoCount: newUndoCount });
  };

})(window.DenshaShogi);
