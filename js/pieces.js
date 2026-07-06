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

((ns) => {
  'use strict';

  ns.ROWS = 6;
  ns.COLS = 7;

  ns.PROMOTION_ZONE = 2;

  ns.PIECE_TYPES = {
    futsuu: {
      name: 'ふつう',
      promotedName: 'かいそく',
      symbol: '◯',
      image: { red: 'assets/images/red-futsuu.png', blue: 'assets/images/blue-futsuu.png' },
      promotedImage: { red: 'assets/images/red-futsuu-promoted.png', blue: 'assets/images/blue-futsuu-promoted.png' },
    },
    tokkyuu: {
      name: 'とっきゅう',
      promotedName: 'スーパーとっきゅう',
      symbol: '△',
      image: { red: 'assets/images/red-tokkyuu.png', blue: 'assets/images/blue-tokkyuu.png' },
      promotedImage: { red: 'assets/images/red-tokkyuu-promoted.png', blue: 'assets/images/blue-tokkyuu-promoted.png' },
    },
    kamotsu: {
      name: 'かもつ',
      promotedName: 'スーパーかもつ',
      symbol: '□',
      image: { red: 'assets/images/red-kamotsu.png', blue: 'assets/images/blue-kamotsu.png' },
    },
    shinkansen: {
      name: 'しんかんせん',
      promotedName: 'スーパーしんかんせん',
      symbol: '☆',
      image: { red: 'assets/images/red-shinkansen.png', blue: 'assets/images/blue-shinkansen.png' },
      promotedImage: { red: 'assets/images/red-shinkansen-promoted.png', blue: 'assets/images/blue-shinkansen-promoted.png' },
    },
  };

  /**
   * 駒の表示に使う画像パスを返す。成り駒は成り後の画像（未定義の駒種は通常画像）。
   * @param {Piece} piece
   * @returns {string}
   */
  ns.pieceImage = (piece) => {
    const typeInfo = ns.PIECE_TYPES[piece.type];
    if (piece.promoted && typeInfo.promotedImage) {
      return typeInfo.promotedImage[piece.side];
    }
    return typeInfo.image[piece.side];
  };

  /**
   * @param {PieceType} type
   * @param {Side} side
   * @returns {{dr: number, dc: number}[]}
   */
  const moveOffsets = (type, side, promoted) => {
    const forward = side === 'red' ? 1 : -1;

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
  };

  /**
   * ID で駒を探す。
   * @param {Piece[]} pieces
   * @param {string|null} id
   * @returns {Piece|null}
   */
  ns.findPieceById = (pieces, id) => {
    if (!id) return null;
    return pieces.find((p) => p.id === id) || null;
  };

  /**
   * @param {Piece[]} pieces
   * @param {number} row
   * @param {number} col
   * @returns {Piece|null}
   */
  ns.pieceAt = (pieces, row, col) => {
    return pieces.find((p) => !p.captured && p.pos.row === row && p.pos.col === col) || null;
  };

  /**
   * @param {Piece[]} pieces
   * @param {Piece} piece
   * @returns {Position[]}
   */
  ns.movablePositions = (pieces, piece) => {
    if (piece.captured) return [];

    const offsets = moveOffsets(piece.type, piece.side, piece.promoted);
    const result = [];
    const range = (piece.promoted && piece.type === 'shinkansen') ? 2 : 1;

    for (const offset of offsets) {
      for (let step = 1; step <= range; step++) {
        const newRow = piece.pos.row + offset.dr * step;
        const newCol = piece.pos.col + offset.dc * step;

        if (newRow < 1 || newRow > ns.ROWS || newCol < 1 || newCol > ns.COLS) break;

        const occupant = ns.pieceAt(pieces, newRow, newCol);
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
  ns.createInitialPieces = () => {
    let id = 0;
    const make = (side, type, row, col) => ({
      id: `${side}-${type}-${id++}`,
      side,
      type,
      pos: { row, col },
      captured: false,
      promoted: false,
    });

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
  ns.threatenedPieceIds = (pieces, side) => {
    const opponentSide = side === 'red' ? 'blue' : 'red';
    const threatened = [];

    for (const p of pieces) {
      if (p.captured || p.side !== opponentSide) continue;

      const moves = ns.movablePositions(pieces, p);
      for (const move of moves) {
        const target = ns.pieceAt(pieces, move.row, move.col);
        if (target && target.side === side && !threatened.includes(target.id)) {
          threatened.push(target.id);
        }
      }
    }

    return threatened;
  };

})(window.DenshaShogi);
