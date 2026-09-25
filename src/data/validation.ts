import type { Song, SongBlock } from './types.js'
import { CHROMATIC_ROOTS } from './transpose.js'

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/
const CHORD_RE = /^(?:C#|D#|F#|G#|A#|C|D|E|F|G|A|B)m?$/
const MAX_BLOCKS = 500

export type SongInput = Omit<Song, 'id'>

export function validSongId(value: unknown): value is string {
  return typeof value === 'string' && ID_RE.test(value)
}

export function parseSongInput(value: unknown): SongInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 180) return null
  if (typeof data.artist !== 'string' || data.artist.length > 180) return null
  if (!CHROMATIC_ROOTS.includes(data.originalKey as (typeof CHROMATIC_ROOTS)[number])) return null
  if (!Array.isArray(data.blocks) || data.blocks.length > MAX_BLOCKS) return null

  const blocks: SongBlock[] = []
  const ids = new Set<string>()
  for (const item of data.blocks) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const block = item as Record<string, unknown>
    if (!validSongId(block.id) || ids.has(block.id)) return null
    ids.add(block.id)
    if (block.type === 'section') {
      if (typeof block.label !== 'string' || block.label.length > 120) return null
      blocks.push({ id: block.id, type: 'section', label: block.label })
    } else if (block.type === 'lyric') {
      if (typeof block.text !== 'string' || block.text.length > 2000) return null
      blocks.push({ id: block.id, type: 'lyric', text: block.text })
    } else if (block.type === 'chord') {
      if (!(block.lyricRef === null || typeof block.lyricRef === 'string')) return null
      if (!Array.isArray(block.chords) || block.chords.length > 100) return null
      const chords = []
      for (const entry of block.chords) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
        const chord = entry as Record<string, unknown>
        if (typeof chord.symbol !== 'string' || !CHORD_RE.test(chord.symbol)) return null
        if (!Number.isInteger(chord.column) || Number(chord.column) < 0 || Number(chord.column) > 2000) return null
        chords.push({ column: Number(chord.column), symbol: chord.symbol })
      }
      blocks.push({ id: block.id, type: 'chord', lyricRef: block.lyricRef as string | null, chords })
    } else return null
  }
  for (const block of blocks) {
    if (block.type !== 'chord' || block.lyricRef === null) continue
    const lyric = blocks.find((candidate) => candidate.id === block.lyricRef)
    if (!lyric || lyric.type !== 'lyric') return null
    if (block.chords.some((chord) => chord.column > lyric.text.length)) return null
  }
  return {
    title: data.title.trim(),
    artist: data.artist.trim(),
    originalKey: data.originalKey as string,
    blocks,
  }
}
