import assert from 'node:assert/strict'
import test from 'node:test'
import { CHROMATIC_ROOTS, transposeBlocks, transposeChord, transposeKey, transposeRoot } from '../src/data/transpose.ts'
import { formatChordLine } from '../src/data/chords.ts'

test('chromatic wrapping and requested major/minor cases', () => {
  const cases = [
    ['C', 1, 'C#'],
    ['C', -1, 'B'],
    ['B', 1, 'C'],
    ['E', 1, 'F'],
    ['F', 1, 'F#'],
    ['C', 12, 'C'],
    ['C', -12, 'C'],
    ['Am', 2, 'Bm'],
    ['F#m', -1, 'Fm'],
    ['Gm', 5, 'Cm'],
  ]
  for (const [input, offset, expected] of cases) assert.equal(transposeChord(input, offset), expected)
  for (const root of CHROMATIC_ROOTS) {
    assert.equal(transposeRoot(root, 12), root)
    assert.equal(transposeRoot(root, -12), root)
    assert.equal(transposeRoot(root, 1), CHROMATIC_ROOTS[(CHROMATIC_ROOTS.indexOf(root) + 1) % 12])
    assert.equal(transposeChord(root + 'm', 12), root + 'm')
  }
  assert.equal(transposeKey('C', 2), 'D')
})

test('all chord blocks transpose while lyric, section, reference, and anchors stay fixed', () => {
  const blocks = [
    { id: 'intro', type: 'section', label: 'Intro' },
    { id: 'intro-chords', type: 'chord', lyricRef: null, chords: [{ symbol: 'C', column: 0 }, { symbol: 'G', column: 8 }, { symbol: 'Am', column: 16 }, { symbol: 'F', column: 24 }] },
    { id: 'verse', type: 'section', label: 'Verse' },
    { id: 'verse-chords-a', type: 'chord', lyricRef: 'line-a', chords: [{ symbol: 'C', column: 0 }, { symbol: 'G', column: 8 }] },
    { id: 'line-a', type: 'lyric', text: 'Satu dua  tiga' },
    { id: 'verse-chords-b', type: 'chord', lyricRef: 'line-b', chords: [{ symbol: 'Am', column: 0 }, { symbol: 'F', column: 8 }] },
    { id: 'line-b', type: 'lyric', text: 'Empat lima' },
    { id: 'chorus', type: 'section', label: 'Chorus' },
    { id: 'chorus-chords', type: 'chord', lyricRef: null, chords: [{ symbol: 'F', column: 0 }, { symbol: 'G', column: 8 }, { symbol: 'C', column: 16 }, { symbol: 'Am', column: 24 }] },
  ]
  const snapshot = structuredClone(blocks)
  const result = transposeBlocks(blocks, 1)
  const symbols = result.filter(block => block.type === 'chord').map(block => block.chords.map(chord => chord.symbol))
  assert.deepEqual(symbols, [['C#', 'G#', 'A#m', 'F#'], ['C#', 'G#'], ['A#m', 'F#'], ['F#', 'G#', 'C#', 'A#m']])
  assert.deepEqual(blocks, snapshot)
  assert.deepEqual(result.map(block => block.id), blocks.map(block => block.id))
  for (let index = 0; index < blocks.length; index++) {
    assert.equal(result[index].type, blocks[index].type)
    if (blocks[index].type === 'chord') {
      assert.equal(result[index].lyricRef, blocks[index].lyricRef)
      assert.deepEqual(result[index].chords.map(chord => chord.column), blocks[index].chords.map(chord => chord.column))
    } else {
      assert.deepEqual(result[index], blocks[index])
    }
  }
  assert.equal(formatChordLine(result[1].chords).indexOf('C#'), 0)
  assert.equal(formatChordLine(result[1].chords).indexOf('G#'), 8)
  assert.equal(formatChordLine(result[1].chords).indexOf('A#m'), 16)
  assert.deepEqual(transposeBlocks(blocks, 0), blocks)
  assert.deepEqual(transposeBlocks(result, -1), blocks)
})
