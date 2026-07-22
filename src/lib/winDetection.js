/** @typedef {'standard' | 'four_corners' | 'x' | 'blackout'} WinMode */

export const WIN_MODES = /** @type {const} */ ([
  'standard',
  'four_corners',
  'x',
  'blackout',
])

/**
 * Normalize win rules from games.config (missing fields = legacy standard 1-line).
 * @param {object | null | undefined} config
 */
export function normalizeWinConfig(config = {}) {
  const winMode = WIN_MODES.includes(config.winMode) ? config.winMode : 'standard'
  let linesToWin = Number(config.linesToWin) || 1
  if (linesToWin < 1) linesToWin = 1
  if (linesToWin > 3) linesToWin = 3
  return { winMode, linesToWin }
}

/**
 * Human-readable rule for host/play UI.
 * @param {object | null | undefined} config
 */
export function describeWinRule(config) {
  const { winMode, linesToWin } = normalizeWinConfig(config)
  switch (winMode) {
    case 'four_corners':
      return 'How to win: mark all four corners'
    case 'x':
      return 'How to win: complete both diagonals (X)'
    case 'blackout':
      return 'How to win: mark every cell on the board'
    case 'standard':
    default:
      if (linesToWin <= 1) return 'How to win: complete one line (row, column, or diagonal)'
      return `How to win: complete ${linesToWin} lines (rows, columns, or diagonals)`
  }
}

/**
 * Label for claim / verification UI.
 * @param {string} type
 * @param {number} [linesToWin]
 */
export function formatClaimType(type, linesToWin = 1) {
  switch (type) {
    case 'row':
      return 'Row'
    case 'column':
      return 'Column'
    case 'diagonal':
      return 'Diagonal'
    case 'multi_line':
      return `${linesToWin}+ lines`
    case 'corners':
    case 'four_corners':
      return 'Four corners'
    case 'x':
      return 'X (both diagonals)'
    case 'blackout':
      return 'Blackout'
    default:
      return type ? String(type).replace(/_/g, ' ') : 'Bingo'
  }
}

function cellText(board, index) {
  const cell = board[index]
  if (!cell) return ''
  if (typeof cell === 'string') return cell
  return cell.text || (cell.isFree ? 'FREE' : '') || ''
}

function itemsForIndices(board, indices) {
  return indices.map((idx) => cellText(board, idx))
}

/**
 * @param {Set<number>|number[]} marked
 * @param {number} boardSize
 * @returns {Array<{ type: string, row?: number, column?: number, diagonal?: number, indices: number[] }>}
 */
export function findCompletedLines(marked, boardSize) {
  const markedSet = marked instanceof Set ? marked : new Set(marked)
  const lines = []

  for (let row = 0; row < boardSize; row++) {
    const indices = []
    let complete = true
    for (let col = 0; col < boardSize; col++) {
      const index = row * boardSize + col
      if (!markedSet.has(index)) {
        complete = false
        break
      }
      indices.push(index)
    }
    if (complete) lines.push({ type: 'row', row, indices })
  }

  for (let col = 0; col < boardSize; col++) {
    const indices = []
    let complete = true
    for (let row = 0; row < boardSize; row++) {
      const index = row * boardSize + col
      if (!markedSet.has(index)) {
        complete = false
        break
      }
      indices.push(index)
    }
    if (complete) lines.push({ type: 'column', column: col, indices })
  }

  {
    const indices = []
    let complete = true
    for (let i = 0; i < boardSize; i++) {
      const index = i * boardSize + i
      if (!markedSet.has(index)) {
        complete = false
        break
      }
      indices.push(index)
    }
    if (complete) lines.push({ type: 'diagonal', diagonal: 1, indices })
  }

  {
    const indices = []
    let complete = true
    for (let i = 0; i < boardSize; i++) {
      const index = i * boardSize + (boardSize - 1 - i)
      if (!markedSet.has(index)) {
        complete = false
        break
      }
      indices.push(index)
    }
    if (complete) lines.push({ type: 'diagonal', diagonal: 2, indices })
  }

  return lines
}

function cornerIndices(boardSize) {
  const last = boardSize - 1
  return [
    0,
    last,
    last * boardSize,
    last * boardSize + last,
  ]
}

function diagonalIndices(boardSize) {
  const main = []
  const anti = []
  for (let i = 0; i < boardSize; i++) {
    main.push(i * boardSize + i)
    anti.push(i * boardSize + (boardSize - 1 - i))
  }
  return { main, anti, all: [...new Set([...main, ...anti])] }
}

/**
 * Detect a win for the given mode.
 * @param {{
 *   marked: Set<number>|number[],
 *   board: Array<{ text?: string, isFree?: boolean }|string>,
 *   boardSize: number,
 *   winMode?: WinMode,
 *   linesToWin?: number,
 * }} opts
 * @returns {{ type: string, indices: number[], items: string[], lines?: object[] } | null}
 */
export function detectWin({
  marked,
  board,
  boardSize,
  winMode = 'standard',
  linesToWin = 1,
}) {
  if (!boardSize || !board?.length) return null
  const markedSet = marked instanceof Set ? marked : new Set(marked)
  const { winMode: mode, linesToWin: needed } = normalizeWinConfig({ winMode, linesToWin })

  if (mode === 'four_corners') {
    const indices = cornerIndices(boardSize)
    if (!indices.every((i) => markedSet.has(i))) return null
    return {
      type: 'corners',
      indices,
      items: itemsForIndices(board, indices),
    }
  }

  if (mode === 'x') {
    const { main, anti, all } = diagonalIndices(boardSize)
    if (!main.every((i) => markedSet.has(i))) return null
    if (!anti.every((i) => markedSet.has(i))) return null
    return {
      type: 'x',
      indices: all,
      items: itemsForIndices(board, all),
    }
  }

  if (mode === 'blackout') {
    const indices = []
    for (let i = 0; i < boardSize * boardSize; i++) {
      if (!markedSet.has(i)) return null
      indices.push(i)
    }
    return {
      type: 'blackout',
      indices,
      items: itemsForIndices(board, indices),
    }
  }

  // standard — N complete lines
  const lines = findCompletedLines(markedSet, boardSize)
  if (lines.length < needed) return null

  if (needed <= 1) {
    const line = lines[0]
    return {
      type: line.type,
      row: line.row,
      column: line.column,
      diagonal: line.diagonal,
      indices: line.indices,
      items: itemsForIndices(board, line.indices),
      lines: [line],
    }
  }

  const selected = lines.slice(0, needed)
  const indexSet = new Set()
  selected.forEach((line) => line.indices.forEach((i) => indexSet.add(i)))
  const indices = [...indexSet].sort((a, b) => a - b)
  return {
    type: 'multi_line',
    indices,
    items: itemsForIndices(board, indices),
    lines: selected,
  }
}
