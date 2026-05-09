// エントリポイント。DOMContentLoaded で起動。

(function() {
  'use strict';

  var ns = window.DenshaShogi;
  var state;
  var processing = false;

  function render() {
    ns.renderBoard(state);

    var side = ns.currentSide(state);
    if (side) {
      ns.updateTurnDisplay(side);
      ns.updateUndoButton(2 - state.undoCount.red, 2 - state.undoCount.blue, side);
    }

    ns.updateDepots(state.pieces);
  }

  function handleCellTap(row, col) {
    if (processing) return;

    var side = ns.currentSide(state);
    if (!side) return;

    var tappedPiece = ns.pieceAt(state.pieces, row, col);

    if (state.selectedPieceId) {
      if (tappedPiece && tappedPiece.side === side) {
        state = ns.selectPiece(state, tappedPiece.id);
        render();
        return;
      }

      var selectedPiece = null;
      for (var i = 0; i < state.pieces.length; i++) {
        if (state.pieces[i].id === state.selectedPieceId) { selectedPiece = state.pieces[i]; break; }
      }
      var fromRow = selectedPiece.pos.row;
      var fromCol = selectedPiece.pos.col;

      var result = ns.movePiece(state, row, col);
      if (result.moved) {
        processing = true;

        ns.animateMove(fromRow, fromCol, row, col).then(function() {
          state = result.state;

          if (result.captured) {
            ns.playCaptureEffect(row, col);
            ns.playCaptureSound();
          } else {
            ns.playMoveSound();
          }

          if (result.promoted) {
            ns.playPromoteSound();
          }

          render();

          if (state.phase === 'win') {
            setTimeout(function() {
              ns.playWinSound();
              ns.playConfetti();
              ns.showWinScreen(state.winner);
            }, 300);
            processing = false;
            return;
          }

          processing = false;
        });
        return;
      }

      state = ns.deselectPiece(state);
      render();
      return;
    }

    if (tappedPiece && tappedPiece.side === side) {
      var moves = ns.movablePositions(state.pieces, tappedPiece);
      if (moves.length > 0) {
        state = ns.selectPiece(state, tappedPiece.id);
        render();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    state = ns.createGameState();

    document.getElementById('start-btn').addEventListener('click', function() {
      state = ns.startGame(state);
      ns.showScreen('game-screen');
      render();
    });

    document.getElementById('quit-btn').addEventListener('click', function() {
      state = ns.createGameState();
      ns.showScreen('title-screen');
    });

    document.getElementById('undo-btn').addEventListener('click', function() {
      state = ns.undoMove(state);
      render();
    });

    document.getElementById('replay-btn').addEventListener('click', function() {
      state = ns.startGame(state);
      ns.showScreen('game-screen');
      render();
    });

    document.getElementById('quit-win-btn').addEventListener('click', function() {
      state = ns.createGameState();
      ns.showScreen('title-screen');
    });

    ns.initBoard(document.getElementById('board'), handleCellTap);
  });

})();
