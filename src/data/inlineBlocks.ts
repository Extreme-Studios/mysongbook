import type { ChordBlock, LyricBlock, SongBlock } from './types'

export function insertInlineBlock(
  blocks: SongBlock[],
  sourceId: string,
  type: 'chord' | 'lyric',
  createId: () => string = () => crypto.randomUUID(),
): { blocks: SongBlock[]; id: string } | null {
  const index = blocks.findIndex((block) => block.id === sourceId)
  if (index < 0 || blocks.length >= 500) return null
  const source = blocks[index]
  const ids = new Set(blocks.map((block) => block.id))
  let id = createId()
  while (ids.has(id)) id = createId()

  if (type === 'chord') {
    const existingRef = source.type === 'chord' && blocks.some((block) => block.type === 'lyric' && block.id === source.lyricRef)
      ? source.lyricRef ?? null : null
    const chord: ChordBlock = {
      id,
      type: 'chord',
      lyricRef: source.type === 'lyric' ? source.id : existingRef,
      chords: [],
    }
    const insertAt = source.type === 'lyric' ? index : index + 1
    return { blocks: [...blocks.slice(0, insertAt), chord, ...blocks.slice(insertAt)], id }
  }

  const lyric: LyricBlock = { id, type: 'lyric', text: '' }
  const updated = blocks.map((block) => block.id === sourceId && block.type === 'chord'
    && !blocks.some((candidate) => candidate.type === 'lyric' && candidate.id === block.lyricRef)
    ? { ...block, lyricRef: id }
    : block)
  return { blocks: [...updated.slice(0, index + 1), lyric, ...updated.slice(index + 1)], id }
}
