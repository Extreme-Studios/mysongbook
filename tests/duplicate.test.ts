import assert from 'node:assert/strict'
import test from 'node:test'
import { duplicateBlock } from '../src/data/duplicate'
import { parseSongInput } from '../src/data/validation'
import type { ChordBlock, LyricBlock, SongBlock } from '../src/data/types'

const lyric: LyricBlock = { id: 'lyric-original', type: 'lyric', text: 'A B C' }
const chord: ChordBlock = {
  id: 'chord-original', type: 'chord', lyricRef: lyric.id,
  chords: [{ symbol: 'C', column: 1 }, { symbol: 'Gm', column: 4 }],
}
const blocks: SongBlock[] = [chord, lyric]

function ids() {
  let next = 0
  return () => `copy-${++next}`
}

test('Copy Lyric inserts exact text after original with an independent ID', () => {
  const copied = duplicateBlock(blocks, lyric.id, 'copy', ids())
  assert.deepEqual(copied.map((item) => item.id), [chord.id, lyric.id, 'copy-1'])
  const result = copied[2] as LyricBlock
  assert.equal(result.text, lyric.text)
  result.text = 'Changed copy'
  assert.equal(lyric.text, 'A B C')
})

test('Copy Chord keeps every chord, space position and lyric reference without shared objects', () => {
  const copied = duplicateBlock(blocks, chord.id, 'copy', ids())
  const result = copied[1] as ChordBlock
  assert.equal(result.id, 'copy-1')
  assert.equal(result.lyricRef, lyric.id)
  assert.deepEqual(result.chords, chord.chords)
  assert.notEqual(result.chords, chord.chords)
  assert.notEqual(result.chords[0], chord.chords[0])
  result.chords[0].column = 3
  result.chords[1].symbol = 'Am'
  assert.deepEqual(chord.chords, [{ symbol: 'C', column: 1 }, { symbol: 'Gm', column: 4 }])
})

test('Duplicate Pair relinks copied chord to copied lyric and preserves alignment for Sheet validation', () => {
  const copied = duplicateBlock(blocks, chord.id, 'pair', ids())
  assert.deepEqual(copied.map((item) => item.id), [chord.id, lyric.id, 'copy-2', 'copy-1'])
  const resultChord = copied[2] as ChordBlock
  const resultLyric = copied[3] as LyricBlock
  assert.equal(resultChord.lyricRef, resultLyric.id)
  assert.deepEqual(resultChord.chords, chord.chords)
  resultLyric.text = 'X Y Z'
  resultChord.chords[0].symbol = 'Dm'
  resultChord.chords[0].column = 3
  assert.equal(lyric.text, 'A B C')
  assert.equal(chord.chords[0].symbol, 'C')
  assert.equal(chord.chords[0].column, 1)
  const saved = parseSongInput({ title: 'Pair test', artist: 'QA', originalKey: 'C', blocks: copied })
  assert.ok(saved)
  assert.equal((saved.blocks[2] as ChordBlock).lyricRef, resultLyric.id)
  assert.deepEqual((saved.blocks[2] as ChordBlock).chords, resultChord.chords)
})
