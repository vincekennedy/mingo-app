export type WinMode = 'standard' | 'four_corners' | 'x' | 'blackout'

export const WIN_MODES = [
  'standard',
  'four_corners',
  'x',
  'blackout',
] as const satisfies readonly WinMode[]

export type WinConfigFields = {
  winMode?: string | null
  linesToWin?: number | string | null
}

export type NormalizedWinConfig = {
  winMode: WinMode
  linesToWin: number
}

export type BoardCell = { text?: string; isFree?: boolean } | string

export type CompletedLine = {
  type: 'row' | 'column' | 'diagonal'
  row?: number
  column?: number
  diagonal?: number
  indices: number[]
}

export type WinResult = {
  type: string
  indices: number[]
  items: string[]
  row?: number
  column?: number
  diagonal?: number
  lines?: CompletedLine[]
}

function isWinMode(value: string | null | undefined): value is WinMode {
  return WIN_MODES.includes(value as WinMode)
}

/** Normalize win rules from games.config (missing fields = legacy standard 1-line). */
export function normalizeWinConfig(
  config: WinConfigFields | null | undefined = {},
): NormalizedWinConfig {
  const winMode = isWinMode(config?.winMode) ? config.winMode : 'standard'
  let linesToWin = Number(config?.linesToWin) || 1
  if (linesToWin < 1) linesToWin = 1
  if (linesToWin > 3) linesToWin = 3
  return { winMode, linesToWin }
}

/** Human-readable rule for host/play UI. */
export function describeWinRule(
  config: WinConfigFields | null | undefined,
): string {
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
      if (linesToWin <= 1)
        return 'How to win: complete one line (row, column, or diagonal)'
      return `How to win: complete ${linesToWin} lines (rows, columns, or diagonals)`
  }
}

/** Label for claim / verification UI. */
export function formatClaimType(type: string, linesToWin = 1): string {
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

function cellText(board: BoardCell[], index: number): string {
  const cell = board[index]
  if (!cell) return ''
  if (typeof cell === 'string') return cell
  return cell.text || (cell.isFree ? 'FREE' : '') || ''
}

function itemsForIndices(board: BoardCell[], indices: number[]): string[] {
  return indices.map((idx) => cellText(board, idx))
}

export function findCompletedLines(
  marked: Set<number> | number[],
  boardSize: number,
): CompletedLine[] {
  const markedSet = marked instanceof Set ? marked : new Set(marked)
  const lines: CompletedLine[] = []

  for (let row = 0; row < boardSize; row++) {
    const indices: number[] = []
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
    const indices: number[] = []
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
    const indices: number[] = []
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
    const indices: number[] = []
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

function cornerIndices(boardSize: number): number[] {
  const last = boardSize - 1
  return [0, last, last * boardSize, last * boardSize + last]
}

function diagonalIndices(boardSize: number): {
  main: number[]
  anti: number[]
  all: number[]
} {
  const main: number[] = []
  const anti: number[] = []
  for (let i = 0; i < boardSize; i++) {
    main.push(i * boardSize + i)
    anti.push(i * boardSize + (boardSize - 1 - i))
  }
  return { main, anti, all: [...new Set([...main, ...anti])] }
}

export type DetectWinOptions = {
  marked: Set<number> | number[]
  board: BoardCell[]
  boardSize: number
  winMode?: WinMode | string | null
  linesToWin?: number | string | null
}

/** Detect a win for the given mode. */
export function detectWin({
  marked,
  board,
  boardSize,
  winMode = 'standard',
  linesToWin = 1,
}: DetectWinOptions): WinResult | null {
  if (!boardSize || !board?.length) return null
  const markedSet = marked instanceof Set ? marked : new Set(marked)
  const { winMode: mode, linesToWin: needed } = normalizeWinConfig({
    winMode,
    linesToWin,
  })

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
    const indices: number[] = []
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
    if (!line) return null
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
  const indexSet = new Set<number>()
  selected.forEach((line) => line.indices.forEach((i) => indexSet.add(i)))
  const indices = [...indexSet].sort((a, b) => a - b)
  return {
    type: 'multi_line',
    indices,
    items: itemsForIndices(board, indices),
    lines: selected,
  }
}
