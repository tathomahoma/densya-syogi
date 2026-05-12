// エントリポイント。DOMContentLoaded で起動。

(function() {
  'use strict';

  var ns = window.DenshaShogi;
  var state;
  var processing = false;
  var peekedPieceId = null;

  function findPieceById(id) {
    for (var i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i].id === id) return state.pieces[i];
    }
    return null;
  }

  function render() {
    var side = ns.currentSide(state);
    var threatenedIds = side ? ns.threatenedPieceIds(state.pieces, side) : [];

    ns.renderBoard(state, {
      peekedPieceId: peekedPieceId,
      threatenedIds: threatenedIds,
      hintsEnabled: ns.getHintsEnabled(),
    });

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

    // === 自分の駒が選択中 ===
    if (state.selectedPieceId) {
      if (tappedPiece && tappedPiece.side === side) {
        peekedPieceId = null;
        state = ns.selectPiece(state, tappedPiece.id);
        if (state.selectedPieceId) ns.playSelectSound();
        render();
        return;
      }

      var selectedPiece = findPieceById(state.selectedPieceId);
      var fromRow = selectedPiece.pos.row;
      var fromCol = selectedPiece.pos.col;

      var result = ns.movePiece(state, row, col);
      if (result.moved) {
        processing = true;
        peekedPieceId = null;
        ns.playMoveSound(selectedPiece.type);

        ns.animateMove(fromRow, fromCol, row, col).then(function() {
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
            setTimeout(function() {
              ns.playWinSound();
              ns.playConfetti();
              ns.showWinScreen(state.winner);
              setTimeout(function() {
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
      var moves = ns.movablePositions(state.pieces, tappedPiece);
      if (moves.length > 0) {
        state = ns.selectPiece(state, tappedPiece.id);
        ns.playSelectSound();
      }
    } else if (tappedPiece && tappedPiece.side !== side) {
      peekedPieceId = tappedPiece.id;
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', function() {
    state = ns.createGameState();

    function beginGame() {
      peekedPieceId = null;
      state = ns.startGame(state);
      ns.showScreen('game-screen');
      ns.updateMuteButton();
      ns.startBgm();
      render();
    }

    document.getElementById('start-btn').addEventListener('click', function() {
      ns.initAudio();
      if (localStorage.getItem('tutorialSeen') !== 'true') {
        ns.startTutorial(beginGame);
        return;
      }
      beginGame();
    });

    document.getElementById('tutorial-btn').addEventListener('click', function() {
      ns.initAudio();
      ns.startTutorial(beginGame, function() {});
    });

    document.getElementById('quit-btn').addEventListener('click', function() {
      ns.stopBgm();
      peekedPieceId = null;
      state = ns.createGameState();
      ns.showScreen('title-screen');
    });

    document.getElementById('undo-btn').addEventListener('click', function() {
      peekedPieceId = null;
      state = ns.undoMove(state);
      render();
    });

    document.getElementById('replay-btn').addEventListener('click', function() {
      ns.stopFanfare();
      peekedPieceId = null;
      state = ns.startGame(state);
      ns.showScreen('game-screen');
      ns.startBgm();
      render();
    });

    document.getElementById('quit-win-btn').addEventListener('click', function() {
      ns.stopFanfare();
      ns.stopBgm();
      peekedPieceId = null;
      state = ns.createGameState();
      ns.showScreen('title-screen');
    });

    document.getElementById('mute-btn').addEventListener('click', function() {
      ns.toggleMute();
      ns.updateMuteButton();
    });

    document.getElementById('hints-toggle').addEventListener('click', function() {
      ns.setHintsEnabled(!ns.getHintsEnabled());
      ns.updateHintsButton();
    });

    ns.updateHintsButton();
    ns.initTutorialNav();
    ns.initBoard(document.getElementById('board'), handleCellTap);
  });

})();
