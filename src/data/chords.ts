import type { ChordPlacement } from './types'

export function formatChordLine(chords: ChordPlacement[]) {
  const cells: string[] = []
  for (const { column, symbol } of [...chords].sort((a, b) => a.column - b.column)) {
    while (cells.length < column) cells.push(' ')
    for (let index = 0; index < symbol.length; index += 1) cells[column + index] = symbol[index]
  }
  return cells.map((cell) => cell ?? ' ').join('')
}
