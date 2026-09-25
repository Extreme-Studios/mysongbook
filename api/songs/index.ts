import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'
import { allowMethods, requestBody, sendError, ApiError } from '../_lib/http.js'
import { createSong, readSongs } from '../_lib/sheets.js'
import { parseSongInput } from '../../src/data/validation.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowMethods(req, res, ['GET', 'POST'])) return
  try {
    if (req.method === 'GET') {
      const entries = await readSongs()
      res.status(200).json({ songs: entries.map(({ song }) => song) })
      return
    }
    await requireAdmin(req)
    const input = parseSongInput(requestBody(req))
    if (!input) throw new ApiError(400, 'Data lagu tidak valid.')
    const song = { id: randomUUID(), ...input }
    await createSong(song)
    res.status(201).json({ song })
  } catch (error) {
    sendError(res, error)
  }
}
