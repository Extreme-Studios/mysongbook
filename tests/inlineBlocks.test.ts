import assert from 'node:assert/strict'
import test from 'node:test'
import { insertInlineBlock } from '../src/data/inlineBlocks'
import { duplicateBlock } from '../src/data/duplicate'
import { importLyricsBlocks, parseLyricsText } from '../src/data/lyricsParser'
import { parseSongInput } from '../src/data/validation'
import type { ChordBlock, SongBlock } from '../src/data/types'

const section: SongBlock = { id: 'section-1', type: 'section', label: 'Verse 1' }
const lyric: SongBlock = { id: 'lyric-1', type: 'lyric', text: 'A B C' }
const chord: ChordBlock = { id: 'chord-1', type: 'chord', lyricRef: lyric.id, chords: [{ symbol: 'C', column: 1 }, { symbol: 'Gm', column: 4 }] }

test('inline chord on a lyric inserts before it, links that lyric, and starts empty', () => {
  const result = insertInlineBlock([section, lyric], lyric.id, 'chord', () => 'new-chord')!
  assert.deepEqual(result.blocks.map((block) => block.id), ['section-1', 'new-chord', 'lyric-1'])
  assert.deepEqual(result.blocks[1], { id: 'new-chord', type: 'chord', lyricRef: lyric.id, chords: [] })
  assert.equal(result.blocks[2], lyric)
})

test('inline lyric on a lyric inserts after with its own empty text and ID', () => {
  const result = insertInlineBlock([section, lyric], lyric.id, 'lyric', () => 'new-lyric')!
  assert.deepEqual(result.blocks.map((block) => block.id), ['section-1', 'lyric-1', 'new-lyric'])
  assert.deepEqual(result.blocks[2], { id: 'new-lyric', type: 'lyric', text: '' })
})

test('inline lyric on a chord links only an unreferenced chord to the new lyric', () => {
  const withoutRef: ChordBlock = { ...chord, lyricRef: null }
  const result = insertInlineBlock([section, withoutRef], chord.id, 'lyric', () => 'new-lyric')!
  assert.equal((result.blocks[1] as ChordBlock).lyricRef, 'new-lyric')
  assert.deepEqual((result.blocks[1] as ChordBlock).chords, chord.chords)
  assert.equal(withoutRef.lyricRef, null)
  const preserved = insertInlineBlock([chord, lyric], chord.id, 'lyric', () => 'other-lyric')!
  assert.equal((preserved.blocks[0] as ChordBlock).lyricRef, lyric.id)
  assert.deepEqual(preserved.blocks.map((block) => block.id), ['chord-1', 'other-lyric', 'lyric-1'])
})

test('inline chord after chord or section starts empty and respects valid reference', () => {
  const afterChord = insertInlineBlock([chord, lyric], chord.id, 'chord', () => 'next-chord')!
  assert.deepEqual(afterChord.blocks[1], { id: 'next-chord', type: 'chord', lyricRef: lyric.id, chords: [] })
  assert.deepEqual(chord.chords, [{ symbol: 'C', column: 1 }, { symbol: 'Gm', column: 4 }])
  const afterSection = insertInlineBlock([section, lyric], section.id, 'chord', () => 'section-chord')!
  assert.deepEqual(afterSection.blocks[1], { id: 'section-chord', type: 'chord', lyricRef: null, chords: [] })
  const lyricAfterSection = insertInlineBlock([section], section.id, 'lyric', () => 'section-lyric')!
  assert.deepEqual(lyricAfterSection.blocks[1], { id: 'section-lyric', type: 'lyric', text: '' })
})

test('bulk paste then inline chord on each lyric keeps distinct references and supports duplicate and Sheet validation', () => {
  const parsed = importLyricsBlocks([], parseLyricsText('Verse 1\nA B C\nD E F'), 'append', (() => { let n = 0; return () => `import-${++n}` })())
  const firstLyricId = parsed[1].id
  const secondLyricId = parsed[2].id
  const withFirst = insertInlineBlock(parsed, firstLyricId, 'chord', () => 'inline-1')!.blocks
  const withBoth = insertInlineBlock(withFirst, secondLyricId, 'chord', () => 'inline-2')!.blocks
  assert.deepEqual(withBoth.map((block) => block.id), ['import-1', 'inline-1', firstLyricId, 'inline-2', secondLyricId])
  assert.equal((withBoth[1] as ChordBlock).lyricRef, firstLyricId)
  assert.equal((withBoth[3] as ChordBlock).lyricRef, secondLyricId)
  const withPlacement = withBoth.map((block) => block.id === 'inline-1' && block.type === 'chord'
    ? { ...block, chords: [{ symbol: 'C', column: 1 }] } : block)
  const duplicated = duplicateBlock(withPlacement, 'inline-1', 'pair', (() => { let n = 0; return () => `duplicate-${++n}` })())
  assert.ok(parseSongInput({ title: 'Inline test', artist: 'QA', originalKey: 'C', blocks: duplicated }))
  assert.equal((withPlacement[1] as ChordBlock).chords[0].column, 1)
})
