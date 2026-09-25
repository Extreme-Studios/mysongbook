import { JWT } from 'google-auth-library'
import type { Song } from '../../src/data/types.js'
import { parseSongInput, validSongId } from '../../src/data/validation.js'
import { ApiError } from './http.js'

const HEADERS = ['id', 'title', 'artist', 'original_key', 'content_json', 'sort_order', 'updated_at']
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function spreadsheetId() {
  const value = process.env.GOOGLE_SHEET_ID
  if (!value) throw new ApiError(500, 'Google Sheet belum dikonfigurasi.')
  return value
}

async function sheetRequest(path: string, init: RequestInit = {}) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new ApiError(500, 'Akses Google Sheet belum dikonfigurasi.')
  const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const { token } = await auth.getAccessToken()
  if (!token) throw new ApiError(500, 'Akses Google Sheet gagal.')
  let response: Response
  try {
    response = await fetch(`${BASE}/${spreadsheetId()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    throw new ApiError(500, 'Google Sheet tidak dapat dijangkau.')
  }
  if (!response.ok) {
    console.error('Google Sheets API error', response.status, path.split('?')[0])
    throw new ApiError(500, response.status === 404 ? 'Google Sheet tidak ditemukan.' : 'Google Sheet sedang bermasalah.')
  }
  return response.json() as Promise<Record<string, unknown>>
}

function songRow(song: Song, sortOrder: number) {
  return [
    song.id,
    song.title,
    song.artist,
    song.originalKey,
    JSON.stringify({ blocks: song.blocks }),
    sortOrder,
    new Date().toISOString(),
  ]
}

type SheetSong = { song: Song; rowNumber: number; sortOrder: number }

export async function readSongs(): Promise<SheetSong[]> {
  const response = await sheetRequest(`/values/${encodeURIComponent('Songs!A:G')}`)
  const values = response.values
  if (!Array.isArray(values) || values.length === 0) throw new ApiError(500, 'Tab Songs belum memiliki header.')
  const header = values[0]
  if (!Array.isArray(header) || HEADERS.some((name, index) => header[index] !== name)) {
    throw new ApiError(500, 'Header tab Songs tidak sesuai schema.')
  }
  const result: SheetSong[] = []
  const ids = new Set<string>()
  for (let index = 1; index < values.length; index++) {
    const row = values[index]
    if (!Array.isArray(row) || row.every((cell) => !cell)) continue
    try {
      const id = row[0]
      const content = JSON.parse(String(row[4] ?? '{}')) as { blocks?: unknown }
      const input = parseSongInput({
        title: row[1],
        artist: row[2],
        originalKey: row[3],
        blocks: content.blocks,
      })
      if (!validSongId(id) || !input || ids.has(id)) throw new Error('Malformed or duplicate song')
      ids.add(id)
      const order = Number(row[5])
      result.push({ song: { id, ...input }, rowNumber: index + 1, sortOrder: Number.isFinite(order) ? order : index })
    } catch {
      console.warn('Skipping invalid Songbook row', index + 1)
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder || a.rowNumber - b.rowNumber)
}

export async function createSong(song: Song) {
  const entries = await readSongs()
  if (entries.some((entry) => entry.song.id === song.id)) throw new ApiError(400, 'ID lagu sudah ada.')
  const nextOrder = Math.max(0, ...entries.map((entry) => entry.sortOrder)) + 1
  await sheetRequest(`/values/${encodeURIComponent('Songs!A:G')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: [songRow(song, nextOrder)] }),
  })
}

export async function updateSong(id: string, song: Song) {
  const entries = await readSongs()
  const entry = entries.find((item) => item.song.id === id)
  if (!entry) throw new ApiError(404, 'Lagu tidak ditemukan.')
  await sheetRequest(`/values/${encodeURIComponent(`Songs!A${entry.rowNumber}:G${entry.rowNumber}`)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [songRow(song, entry.sortOrder)] }),
  })
}

export async function deleteSong(id: string) {
  const entries = await readSongs()
  const entry = entries.find((item) => item.song.id === id)
  if (!entry) throw new ApiError(404, 'Lagu tidak ditemukan.')
  const metadata = await sheetRequest('?fields=sheets(properties(sheetId,title))')
  const tabs = metadata.sheets
  const songsTab = Array.isArray(tabs)
    ? tabs.find((tab) => typeof tab === 'object' && tab !== null && (tab as { properties?: { title?: string } }).properties?.title === 'Songs')
    : undefined
  const sheetId = (songsTab as { properties?: { sheetId?: number } } | undefined)?.properties?.sheetId
  if (typeof sheetId !== 'number') throw new ApiError(500, 'Tab Songs tidak ditemukan.')
  await sheetRequest(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: entry.rowNumber - 1, endIndex: entry.rowNumber },
        },
      }],
    }),
  })
}

export const songHeaders = HEADERS
