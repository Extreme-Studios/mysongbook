import type { ChordPlacement, SongBlock } from './types'

export const CHROMATIC_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

function wrappedIndex(index: number, semitones: number) {
  return ((index + semitones) % 12 + 12) % 12
}

export function transposeRoot(root: string, semitones: number): string {
  const index = CHROMATIC_ROOTS.indexOf(root as (typeof CHROMATIC_ROOTS)[number])
  if (index < 0 || !Number.isInteger(semitones)) return root
  return CHROMATIC_ROOTS[wrappedIndex(index, semitones)]
}

export function transposeChord(chord: string, semitones: number): string {
  const match = /^(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)(m?)$/.exec(chord)
  if (!match) return chord
  return transposeRoot(match[1], semitones) + match[2]
}

export function transposeKey(key: string, semitones: number): string {
  return transposeChord(key, semitones)
}

export function transposeBlocks(blocks: SongBlock[], semitones: number): SongBlock[] {
  return blocks.map((block) => {
    if (block.type === 'section') return { ...block }
    if (block.type === 'lyric') return { ...block }
    return {
      ...block,
      chords: block.chords.map((chord): ChordPlacement => ({
        ...chord,
        symbol: transposeChord(chord.symbol, semitones),
      })),
    }
  })
}
