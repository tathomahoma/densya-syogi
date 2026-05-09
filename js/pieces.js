// 駒の定義と「どこに動けるか」を返す純粋関数

/**
 * @typedef {'red' | 'blue'} Side
 * @typedef {'futsuu' | 'tokkyuu' | 'kamotsu' | 'shinkansen'} PieceType
 *
 * @typedef {Object} Position
 * @property {number} row - 1〜6
 * @property {number} col - 1〜5
 *
 * @typedef {Object} Piece
 * @property {string} id
 * @property {Side} side
 * @property {PieceType} type
 * @property {Position} pos
 * @property {boolean} captured
 */

window.DenshaShogi = window.DenshaShogi || {};

(function(ns) {
  'use strict';

  ns.ROWS = 7;
  ns.COLS = 5;

  ns.PIECE_TYPES = {
    futsuu: {
      name: 'ふつう',
      symbol: '◯',
      image: { red: 'assets/images/red-futsuu.svg', blue: 'assets/images/blue-futsuu.svg' },
    },
    tokkyuu: {
      name: 'とっきゅう',
      symbol: '△',
      image: { red: 'assets/images/red-tokkyuu.svg', blue: 'assets/images/blue-tokkyuu.svg' },
    },
    kamotsu: {
      name: 'かもつ',
      symbol: '□',
      image: { red: 'assets/images/red-kamotsu.svg', blue: 'assets/images/blue-kamotsu.svg' },
    },
    shinkansen: {
      name: 'しんかんせん',
      symbol: '☆',
      image: { red: 'assets/images/red-shinkansen.svg', blue: 'assets/images/blue-shinkansen.svg' },
    },
  };

  /**
   * @param {PieceType} type
   * @param {Side} side
   * @returns {{dr: number, dc: number}[]}
   */
  function moveOffsets(type, side) {
    var forward = side === 'red' ? 1 : -1;

    switch (type) {
      case 'futsuu':
        return [{ dr: forward, dc: 0 }];

      case 'tokkyuu':
        return [
          { dr: 1, dc: 0 },
          { dr: -1, dc: 0 },
          { dr: 0, dc: 1 },
          { dr: 0, dc: -1 },
        ];

      case 'kamotsu':
        return [
          { dr: 1, dc: 1 },
          { dr: 1, dc: -1 },
          { dr: -1, dc: 1 },
          { dr: -1, dc: -1 },
        ];

      case 'shinkansen':
        return [
          { dr: 1, dc: 0 },
          { dr: -1, dc: 0 },
          { dr: 0, dc: 1 },
          { dr: 0, dc: -1 },
          { dr: 1, dc: 1 },
          { dr: 1, dc: -1 },
          { dr: -1, dc: 1 },
          { dr: -1, dc: -1 },
        ];

      default:
        return [];
    }
  }

  /**
   * @param {Piece[]} pieces
   * @param {number} row
   * @param {number} col
   * @returns {Piece|null}
   */
  ns.pieceAt = function(pieces, row, col) {
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (!p.captured && p.pos.row === row && p.pos.col === col) return p;
    }
    return null;
  };

  /**
   * @param {Piece[]} pieces
   * @param {Piece} piece
   * @returns {Position[]}
   */
  ns.movablePositions = function(pieces, piece) {
    if (piece.captured) return [];

    var offsets = moveOffsets(piece.type, piece.side);
    var result = [];

    for (var i = 0; i < offsets.length; i++) {
      var newRow = piece.pos.row + offsets[i].dr;
      var newCol = piece.pos.col + offsets[i].dc;

      if (newRow < 1 || newRow > ns.ROWS || newCol < 1 || newCol > ns.COLS) continue;

      var occupant = ns.pieceAt(pieces, newRow, newCol);
      if (occupant && occupant.side === piece.side) continue;

      result.push({ row: newRow, col: newCol });
    }

    return result;
  };

  /**
   * @returns {Piece[]}
   */
  ns.createInitialPieces = function() {
    var id = 0;
    function make(side, type, row, col) {
      return {
        id: side + '-' + type + '-' + (id++),
        side: side,
        type: type,
        pos: { row: row, col: col },
        captured: false,
      };
    }

    return [
      make('red', 'tokkyuu', 1, 1),
      make('red', 'shinkansen', 1, 3),
      make('red', 'kamotsu', 1, 5),
      make('red', 'futsuu', 2, 2),
      make('red', 'futsuu', 2, 4),

      make('blue', 'kamotsu', 7, 1),
      make('blue', 'shinkansen', 7, 3),
      make('blue', 'tokkyuu', 7, 5),
      make('blue', 'futsuu', 6, 2),
      make('blue', 'futsuu', 6, 4),
    ];
  };

})(window.DenshaShogi);
