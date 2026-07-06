// ゲーム状態の管理（純粋ロジック、DOM に触らない）

window.DenshaShogi = window.DenshaShogi || {};

((ns) => {
  'use strict';

  /**
   * @param {string} [phase] - 省略時は 'title'
   * @returns {Object} GameState
   */
  ns.createGameState = (phase) => ({
    phase: phase || 'title',
    pieces: ns.createInitialPieces(),
    selectedPieceId: null,
    winner: null,
    undoCount: { red: 0, blue: 0 },
    prevState: null,
  });

  /**
   * @returns {Object}
   */
  ns.startGame = () => ns.createGameState('red_turn');

  /**
   * @param {Object} state
   * @returns {string|null}
   */
  ns.currentSide = (state) => {
    if (state.phase === 'red_turn') return 'red';
    if (state.phase === 'blue_turn') return 'blue';
    return null;
  };

  /**
   * @param {Object} state
   * @param {string} pieceId
   * @returns {Object}
   */
  ns.selectPiece = (state, pieceId) => {
    const side = ns.currentSide(state);
    if (!side) return state;

    const piece = ns.findPieceById(state.pieces, pieceId);
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
  ns.deselectPiece = (state) => Object.assign({}, state, { selectedPieceId: null });

  /**
   * @param {Object} state
   * @param {number} toRow
   * @param {number} toCol
   * @returns {{state: Object, moved: boolean, captured: Object|null}}
   */
  ns.movePiece = (state, toRow, toCol) => {
    const side = ns.currentSide(state);
    if (!side || !state.selectedPieceId) {
      return { state, moved: false, captured: null };
    }

    const piece = ns.findPieceById(state.pieces, state.selectedPieceId);
    if (!piece) return { state, moved: false, captured: null };

    const moves = ns.movablePositions(state.pieces, piece);
    const isValid = moves.some((m) => m.row === toRow && m.col === toCol);
    if (!isValid) return { state, moved: false, captured: null };

    const capturedPiece = ns.pieceAt(state.pieces, toRow, toCol);

    // 成り判定: 相手陣の最後2行に入ったら成る
    let shouldPromote = false;
    if (!piece.promoted) {
      if (side === 'red' && toRow >= ns.ROWS - ns.PROMOTION_ZONE + 1) {
        shouldPromote = true;
      } else if (side === 'blue' && toRow <= ns.PROMOTION_ZONE) {
        shouldPromote = true;
      }
    }

    const newPieces = state.pieces.map((p) => {
      if (p.id === piece.id) {
        const updated = Object.assign({}, p, { pos: { row: toRow, col: toCol } });
        if (shouldPromote) updated.promoted = true;
        return updated;
      }
      if (capturedPiece && p.id === capturedPiece.id) {
        return Object.assign({}, p, { captured: true });
      }
      return p;
    });

    const isWin = capturedPiece && capturedPiece.type === 'shinkansen';
    const nextPhase = isWin
      ? 'win'
      : state.phase === 'red_turn'
        ? 'blue_turn'
        : 'red_turn';

    const newState = {
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
  ns.undoMove = (state) => {
    if (!state.prevState) return state;

    const side = ns.currentSide(state);
    if (!side) return state;

    if (state.undoCount[side] >= 2) return state;

    const newUndoCount = Object.assign({}, state.undoCount);
    newUndoCount[side] = state.undoCount[side] + 1;

    return Object.assign({}, state.prevState, { undoCount: newUndoCount });
  };

})(window.DenshaShogi);
