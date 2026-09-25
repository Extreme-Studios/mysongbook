import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { createSong, readSongs } from '../api/_lib/sheets'
import { normalizeBlocks } from '../src/data/drafts'
import { songs } from '../src/data/songs'

if (existsSync('.env.local')) loadEnvFile('.env.local')

const existing = new Set((await readSongs()).map(({ song }) => song.id))
let added = 0
for (const song of songs) {
  if (existing.has(song.id)) continue
  await createSong({ ...song, blocks: normalizeBlocks(song.blocks) })
  added += 1
}
console.log(`Songbook seed complete: ${added} added, ${songs.length - added} already present.`)
