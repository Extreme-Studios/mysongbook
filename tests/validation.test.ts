import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSongInput, validSongId } from '../src/data/validation'

const valid = {
  title: 'Lagu Contoh',
  artist: 'Musisi',
  originalKey: 'C#',
  blocks: [
    { id: 'verse', type: 'section', label: 'Verse' },
    { id: 'line', type: 'lyric', text: 'Satu dua  tiga' },
    { id: 'chord', type: 'chord', lyricRef: 'line', chords: [{ symbol: 'C#m', column: 9 }] },
  ],
}

test('validates and strips unknown song and block properties', () => {
  const parsed = parseSongInput({ ...valid, admin: true, blocks: [{ ...valid.blocks[0], extra: 'ignored' }, ...valid.blocks.slice(1)] })
  assert.deepEqual(parsed, valid)
  assert.equal(validSongId('abc-123_ABC'), true)
  assert.equal(validSongId('../bad'), false)
})

test('rejects malformed song, unsupported chord, bad anchor and broken reference', () => {
  assert.equal(parseSongInput({ ...valid, title: '  ' }), null)
  assert.equal(parseSongInput({ ...valid, originalKey: 'Db' }), null)
  assert.equal(parseSongInput({ ...valid, blocks: [...valid.blocks, valid.blocks[0]] }), null)
  assert.equal(parseSongInput({ ...valid, blocks: [...valid.blocks.slice(0, 2), { ...valid.blocks[2], chords: [{ symbol: 'C7', column: 0 }] }] }), null)
  assert.equal(parseSongInput({ ...valid, blocks: [...valid.blocks.slice(0, 2), { ...valid.blocks[2], chords: [{ symbol: 'C', column: -1 }] }] }), null)
  assert.equal(parseSongInput({ ...valid, blocks: [...valid.blocks.slice(0, 2), { ...valid.blocks[2], lyricRef: 'missing' }] }), null)
  assert.equal(parseSongInput({ ...valid, blocks: [...valid.blocks.slice(0, 2), { ...valid.blocks[2], chords: [{ symbol: 'C', column: 99 }] }] }), null)
})
