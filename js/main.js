// エントリポイント。DOMContentLoaded で起動。

(() => {
  'use strict';

  const ns = window.DenshaShogi;
  let state;
  let processing = false;
  let peekedPieceId = null;

  const render = () => {
    const side = ns.currentSide(state);
    const threatenedIds = side ? ns.threatenedPieceIds(state.pieces, side) : [];

    ns.renderBoard(state, {
      peekedPieceId,
      threatenedIds,
      hintsEnabled: ns.getHintsEnabled(),
    });

    if (side) {
      ns.updateTurnDisplay(side);
      ns.updateUndoButton(2 - state.undoCount.red, 2 - state.undoCount.blue, side);
    }

    ns.updateDepots(state.pieces);
  };

  const handleCellTap = (row, col) => {
    if (processing) return;

    const side = ns.currentSide(state);
    if (!side) return;

    const tappedPiece = ns.pieceAt(state.pieces, row, col);

    // === 自分の駒が選択中 ===
    if (state.selectedPieceId) {
      if (tappedPiece && tappedPiece.side === side) {
        peekedPieceId = null;
        state = ns.selectPiece(state, tappedPiece.id);
        if (state.selectedPieceId) ns.playSelectSound();
        render();
        return;
      }

      const selectedPiece = ns.findPieceById(state.pieces, state.selectedPieceId);
      const fromRow = selectedPiece.pos.row;
      const fromCol = selectedPiece.pos.col;

      const result = ns.movePiece(state, row, col);
      if (result.moved) {
        processing = true;
        peekedPieceId = null;
        ns.playMoveSound(selectedPiece.type);

        ns.animateMove(fromRow, fromCol, row, col).then(() => {
          state = result.state;

          if (result.captured) {
            ns.playCaptureEffect(row, col);
            ns.playCaptureSound();
          }

          if (result.promoted) {
            ns.playPromoteSound();
          }

          render();

          if (state.phase === 'win') {
            ns.stopBgm();
            setTimeout(() => {
              ns.playWinSound();
              ns.playConfetti();
              ns.showWinScreen(state.winner);
              setTimeout(() => {
                ns.playLoseSound();
              }, 1500);
            }, 300);
            processing = false;
            return;
          }

          processing = false;
        });
        return;
      }

      state = ns.deselectPiece(state);
      peekedPieceId = (tappedPiece && tappedPiece.side !== side) ? tappedPiece.id : null;
      render();
      return;
    }

    // === ピーク中 ===
    if (peekedPieceId) {
      if (tappedPiece && tappedPiece.id === peekedPieceId) {
        peekedPieceId = null;
        render();
        return;
      }
      if (tappedPiece && tappedPiece.side !== side && !tappedPiece.captured) {
        peekedPieceId = tappedPiece.id;
        render();
        return;
      }
      peekedPieceId = null;
    }

    // === 何も選択していない ===
    if (tappedPiece && tappedPiece.side === side) {
      const moves = ns.movablePositions(state.pieces, tappedPiece);
      if (moves.length > 0) {
        state = ns.selectPiece(state, tappedPiece.id);
        ns.playSelectSound();
      }
    } else if (tappedPiece && tappedPiece.side !== side) {
      peekedPieceId = tappedPiece.id;
    }
    render();
  };

  document.addEventListener('DOMContentLoaded', () => {
    state = ns.createGameState();

    const beginGame = () => {
      peekedPieceId = null;
      state = ns.startGame();
      ns.showScreen('game-screen');
      ns.updateMuteButton();
      ns.startBgm();
      render();
    };

    const returnToTitle = () => {
      ns.stopBgm();
      peekedPieceId = null;
      state = ns.createGameState();
      ns.showScreen('title-screen');
    };

    document.getElementById('start-btn').addEventListener('click', () => {
      ns.initAudio();
      if (localStorage.getItem('tutorialSeen') !== 'true') {
        ns.startTutorial(beginGame);
        return;
      }
      beginGame();
    });

    document.getElementById('tutorial-btn').addEventListener('click', () => {
      ns.initAudio();
      ns.startTutorial(beginGame, () => {});
    });

    document.getElementById('quit-btn').addEventListener('click', returnToTitle);

    document.getElementById('undo-btn').addEventListener('click', () => {
      peekedPieceId = null;
      state = ns.undoMove(state);
      render();
    });

    document.getElementById('replay-btn').addEventListener('click', () => {
      ns.stopFanfare();
      beginGame();
    });

    document.getElementById('quit-win-btn').addEventListener('click', () => {
      ns.stopFanfare();
      returnToTitle();
    });

    document.getElementById('mute-btn').addEventListener('click', () => {
      ns.toggleMute();
      ns.updateMuteButton();
    });

    document.getElementById('hints-toggle').addEventListener('click', () => {
      ns.setHintsEnabled(!ns.getHintsEnabled());
      ns.updateHintsButton();
    });

    ns.updateHintsButton();
    ns.initTutorialNav();
    ns.initBoard(document.getElementById('board'), handleCellTap);
  });

})();
