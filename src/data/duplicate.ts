import type { ChordBlock, LyricBlock, SongBlock } from './types'

export function duplicateBlock(
  blocks: SongBlock[],
  blockId: string,
  mode: 'copy' | 'pair',
  createId: () => string = () => crypto.randomUUID(),
): SongBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId)
  const block = blocks[index]
  if (!block || block.type === 'section') return blocks

  if (mode === 'copy') {
    const copy: SongBlock = block.type === 'lyric'
      ? { id: createId(), type: 'lyric', text: block.text }
      : { id: createId(), type: 'chord', lyricRef: block.lyricRef ?? null, chords: block.chords.map((chord) => ({ ...chord })) }
    return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]
  }

  if (block.type !== 'chord' || !block.lyricRef) return blocks
  const lyricIndex = blocks.findIndex((candidate) => candidate.id === block.lyricRef && candidate.type === 'lyric')
  if (lyricIndex < 0) return blocks
  const lyric = blocks[lyricIndex] as LyricBlock
  const copiedLyric: LyricBlock = { id: createId(), type: 'lyric', text: lyric.text }
  const copiedChord: ChordBlock = {
    id: createId(),
    type: 'chord',
    lyricRef: copiedLyric.id,
    chords: block.chords.map((chord) => ({ ...chord })),
  }
  const pair = index < lyricIndex ? [copiedChord, copiedLyric] : [copiedLyric, copiedChord]
  const insertAt = Math.max(index, lyricIndex) + 1
  return [...blocks.slice(0, insertAt), ...pair, ...blocks.slice(insertAt)]
}
