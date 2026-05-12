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

  ns.ROWS = 6;
  ns.COLS = 7;

  ns.PROMOTION_ZONE = 2;

  ns.PIECE_TYPES = {
    futsuu: {
      name: 'ふつう',
      promotedName: 'かいそく',
      symbol: '◯',
      image: { red: 'assets/images/red-futsuu.svg', blue: 'assets/images/blue-futsuu.svg' },
    },
    tokkyuu: {
      name: 'とっきゅう',
      promotedName: 'スーパーとっきゅう',
      symbol: '△',
      image: { red: 'assets/images/red-tokkyuu.svg', blue: 'assets/images/blue-tokkyuu.svg' },
    },
    kamotsu: {
      name: 'かもつ',
      promotedName: 'スーパーかもつ',
      symbol: '□',
      image: { red: 'assets/images/red-kamotsu.svg', blue: 'assets/images/blue-kamotsu.svg' },
    },
    shinkansen: {
      name: 'しんかんせん',
      promotedName: 'スーパーしんかんせん',
      symbol: '☆',
      image: { red: 'assets/images/red-shinkansen.svg', blue: 'assets/images/blue-shinkansen.svg' },
    },
  };

  /**
   * @param {PieceType} type
   * @param {Side} side
   * @returns {{dr: number, dc: number}[]}
   */
  function moveOffsets(type, side, promoted) {
    var forward = side === 'red' ? 1 : -1;

    if (!promoted) {
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

    // 成り後の動き
    switch (type) {
      case 'futsuu':
        // かいそく: 前後左右に1マス（とっきゅうと同じ）
        return [
          { dr: 1, dc: 0 },
          { dr: -1, dc: 0 },
          { dr: 0, dc: 1 },
          { dr: 0, dc: -1 },
        ];

      case 'tokkyuu':
        // スーパーとっきゅう: 銀将と同じ（前1＋斜め4方向）
        return [
          { dr: forward, dc: 0 },
          { dr: 1, dc: 1 },
          { dr: 1, dc: -1 },
          { dr: -1, dc: 1 },
          { dr: -1, dc: -1 },
        ];

      case 'kamotsu':
        // スーパーかもつ: 金将と同じ（前後左右＋前斜め）
        return [
          { dr: forward, dc: 0 },
          { dr: -forward, dc: 0 },
          { dr: 0, dc: 1 },
          { dr: 0, dc: -1 },
          { dr: forward, dc: 1 },
          { dr: forward, dc: -1 },
        ];

      case 'shinkansen':
        // スーパーしんかんせん: 全方位に2マスまで（movablePositions で range 処理）
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

    var offsets = moveOffsets(piece.type, piece.side, piece.promoted);
    var result = [];
    var range = (piece.promoted && piece.type === 'shinkansen') ? 2 : 1;

    for (var i = 0; i < offsets.length; i++) {
      for (var step = 1; step <= range; step++) {
        var newRow = piece.pos.row + offsets[i].dr * step;
        var newCol = piece.pos.col + offsets[i].dc * step;

        if (newRow < 1 || newRow > ns.ROWS || newCol < 1 || newCol > ns.COLS) break;

        var occupant = ns.pieceAt(pieces, newRow, newCol);
        if (occupant && occupant.side === piece.side) break;

        result.push({ row: newRow, col: newCol });

        if (occupant) break;
      }
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
        promoted: false,
      };
    }

    return [
      make('red', 'tokkyuu', 1, 2),
      make('red', 'shinkansen', 1, 4),
      make('red', 'kamotsu', 1, 6),
      make('red', 'futsuu', 2, 3),
      make('red', 'futsuu', 2, 5),

      make('blue', 'kamotsu', 6, 2),
      make('blue', 'shinkansen', 6, 4),
      make('blue', 'tokkyuu', 6, 6),
      make('blue', 'futsuu', 5, 3),
      make('blue', 'futsuu', 5, 5),
    ];
  };

  /**
   * 指定サイドの駒のうち、相手に取られうるものの ID を返す（1手先のみ）。
   * @param {Piece[]} pieces
   * @param {Side} side
   * @returns {string[]}
   */
  ns.threatenedPieceIds = function(pieces, side) {
    var opponentSide = side === 'red' ? 'blue' : 'red';
    var threatened = [];

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (p.captured || p.side !== opponentSide) continue;

      var moves = ns.movablePositions(pieces, p);
      for (var j = 0; j < moves.length; j++) {
        var target = ns.pieceAt(pieces, moves[j].row, moves[j].col);
        if (target && target.side === side && threatened.indexOf(target.id) === -1) {
          threatened.push(target.id);
        }
      }
    }

    return threatened;
  };

})(window.DenshaShogi);
