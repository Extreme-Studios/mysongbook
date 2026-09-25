import type { ChordPlacement, Song, SongBlock } from './types'

const DRAFT_VERSION = 2
const draftKey = (songId: string) => `songbook:draft:v2:${songId}`

export function normalizeBlocks(blocks: SongBlock[]): SongBlock[] {
  const normalized: SongBlock[] = []
  for (const block of blocks) {
    if (block.type === 'section') normalized.push({ ...block })
    if (block.type === 'chord') normalized.push({ ...block, lyricRef: block.lyricRef ?? null, chords: [...block.chords] })
    if (block.type === 'lyric') {
      const { chords = [], ...lyric } = block
      if (chords.length) normalized.push({ id: `${block.id}-chords`, type: 'chord', lyricRef: block.id, chords: [...chords] })
      normalized.push(lyric)
    }
  }
  return normalized
}

function isPlacement(value: unknown): value is ChordPlacement {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return Number.isInteger(item.column) && Number(item.column) >= 0 && typeof item.symbol === 'string'
}

function isBlock(value: unknown): value is SongBlock {
  if (typeof value !== 'object' || value === null) return false
  const block = value as Record<string, unknown>
  if (typeof block.id !== 'string') return false
  if (block.type === 'section') return typeof block.label === 'string'
  if (block.type === 'lyric') return typeof block.text === 'string'
  if (block.type === 'chord') {
    return (block.lyricRef === null || typeof block.lyricRef === 'string')
      && Array.isArray(block.chords) && block.chords.every(isPlacement)
  }
  return false
}

export function loadSongWithDraft(mockSong: Song): { song: Song; hasDraft: boolean } {
  const fallback = { song: { ...mockSong, blocks: normalizeBlocks(mockSong.blocks) }, hasDraft: false }
  try {
    const raw = localStorage.getItem(draftKey(mockSong.id))
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const draft = parsed as Record<string, unknown>
    if (draft.version !== DRAFT_VERSION || draft.songId !== mockSong.id || !Array.isArray(draft.blocks)) return fallback
    if (!draft.blocks.every(isBlock)) return fallback
    const ids = draft.blocks.map((block: SongBlock) => block.id)
    if (new Set(ids).size !== ids.length) return fallback
    return { song: { ...mockSong, blocks: draft.blocks }, hasDraft: true }
  } catch {
    return fallback
  }
}

export function saveDraft(song: Song): boolean {
  try {
    localStorage.setItem(draftKey(song.id), JSON.stringify({
      version: DRAFT_VERSION,
      songId: song.id,
      blocks: song.blocks,
    }))
    return true
  } catch {
    return false
  }
}

export function clearDraft(songId: string) {
  try {
    localStorage.removeItem(draftKey(songId))
  } catch {
    // Successful Sheet saves remain successful when browser storage is unavailable.
  }
}
