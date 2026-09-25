import assert from 'node:assert/strict'
import test from 'node:test'
import { importLyricsBlocks, parseLyricsText } from '../src/data/lyricsParser'
import { loadSongWithDraft, saveDraft } from '../src/data/drafts'
import { parseSongInput } from '../src/data/validation'
import type { SongBlock } from '../src/data/types'

test('full song paste produces separate lyric lines and requested sections', () => {
  const input = `Intro

Verse 1
Aku berjalan sendiri
Mencari arti hidup ini

Chorus
Kau datang membawa cahaya
Mengubah semua cerita

Solo Guitar

Verse 2
Kini aku mengerti

Ending`
  assert.deepEqual(parseLyricsText(input), [
    { type: 'section', label: 'Intro' },
    { type: 'section', label: 'Verse 1' },
    { type: 'lyric', text: 'Aku berjalan sendiri' },
    { type: 'lyric', text: 'Mencari arti hidup ini' },
    { type: 'section', label: 'Chorus' },
    { type: 'lyric', text: 'Kau datang membawa cahaya' },
    { type: 'lyric', text: 'Mengubah semua cerita' },
    { type: 'section', label: 'Solo Guitar' },
    { type: 'section', label: 'Verse 2' },
    { type: 'lyric', text: 'Kini aku mengerti' },
    { type: 'section', label: 'Ending' },
  ])
})

test('recognizes heading variants without treating a normal lyric as a section', () => {
  assert.deepEqual(parseLyricsText('[Chorus]\nCHORUS:\nPre Chorus\nPre-Chorus\nIntro 2x\nVerse 3\nChorus 2\nInterlude 1\nKita bertemu di chorus terakhir'), [
    { type: 'section', label: 'Chorus' },
    { type: 'section', label: 'Chorus' },
    { type: 'section', label: 'Pre Chorus' },
    { type: 'section', label: 'Pre-Chorus' },
    { type: 'section', label: 'Intro 2x' },
    { type: 'section', label: 'Verse 3' },
    { type: 'section', label: 'Chorus 2' },
    { type: 'section', label: 'Interlude 1' },
    { type: 'lyric', text: 'Kita bertemu di chorus terakhir' },
  ])
})

test('normalizes CRLF and blank lines while preserving internal and leading lyric spaces', () => {
  assert.deepEqual(parseLyricsText('\r\n  \r\nchorus  \r\n  Aku  masih di sini  \r\n\r\n'), [
    { type: 'section', label: 'Chorus' },
    { type: 'lyric', text: '  Aku  masih di sini' },
  ])
})

test('append and replace create fresh standard blocks that pass Sheet validation', () => {
  const current: SongBlock[] = [{ id: 'old-id', type: 'lyric', text: 'Original' }]
  const parsed = parseLyricsText('Verse 1\nA B C')
  let id = 0
  const nextId = () => `new-id-${++id}`
  const appended = importLyricsBlocks(current, parsed, 'append', nextId)
  assert.equal(appended[0], current[0])
  assert.deepEqual(appended.slice(1), [
    { id: 'new-id-1', type: 'section', label: 'Verse 1' },
    { id: 'new-id-2', type: 'lyric', text: 'A B C' },
  ])
  const replaced = importLyricsBlocks(current, parsed, 'replace', nextId)
  assert.deepEqual(replaced.map((block) => block.id), ['new-id-3', 'new-id-4'])
  assert.notEqual(replaced[1], appended[2])
  assert.ok(parseSongInput({ title: 'Paste test', artist: 'QA', originalKey: 'C', blocks: appended }))
  assert.ok(replaced.every((block) => block.type !== 'chord'))
})

test('imported blocks persist and reload through the existing local draft format', () => {
  const values = new Map<string, string>()
  const priorStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    },
  })
  try {
    const song = {
      id: 'bulk-draft-test', title: 'Bulk draft', artist: 'QA', originalKey: 'C',
      blocks: importLyricsBlocks([], parseLyricsText('Intro\nA B C'), 'append', (() => { let id = 0; return () => `draft-block-${++id}` })()),
    }
    assert.equal(saveDraft(song), true)
    const loaded = loadSongWithDraft({ ...song, blocks: [] })
    assert.equal(loaded.hasDraft, true)
    assert.deepEqual(loaded.song.blocks, song.blocks)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: priorStorage })
  }
})
