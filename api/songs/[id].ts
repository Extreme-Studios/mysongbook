import type { ApiRequest, ApiResponse } from '../_lib/http'
import { requireAdmin } from '../_lib/auth'
import { allowMethods, requestBody, sendError, ApiError } from '../_lib/http'
import { deleteSong, readSongs, updateSong } from '../_lib/sheets'
import { parseSongInput, validSongId } from '../../src/data/validation'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return
  try {
    const id = req.query.id
    if (!validSongId(id)) throw new ApiError(400, 'ID lagu tidak valid.')
    if (req.method === 'GET') {
      const song = (await readSongs()).find((entry) => entry.song.id === id)?.song
      if (!song) throw new ApiError(404, 'Lagu tidak ditemukan.')
      res.status(200).json({ song })
      return
    }
    await requireAdmin(req)
    if (req.method === 'DELETE') {
      await deleteSong(id)
      res.status(200).json({ deleted: true })
      return
    }
    const input = parseSongInput(requestBody(req))
    if (!input) throw new ApiError(400, 'Data lagu tidak valid.')
    const song = { id, ...input }
    await updateSong(id, song)
    res.status(200).json({ song })
  } catch (error) {
    sendError(res, error)
  }
}
