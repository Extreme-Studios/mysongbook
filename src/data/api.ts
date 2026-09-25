import type { Song } from './types'

export class ClientApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' })
  } catch {
    throw new ClientApiError(0, 'Server Songbook tidak dapat dihubungi.')
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ClientApiError(response.status, 'Server Songbook belum tersedia.')
  }
  if (!response.ok) {
    const error = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String(payload.error)
      : 'Permintaan gagal. Coba lagi.'
    throw new ClientApiError(response.status, error)
  }
  return payload as T
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export const getSongs = () => apiRequest<{ songs: Song[] }>('/api/songs')
export const getSong = (id: string) => apiRequest<{ song: Song }>(`/api/songs/${encodeURIComponent(id)}`)
export const verifyAdmin = (token: string) => apiRequest<{ admin: true }>('/api/admin', { headers: authHeaders(token) })
export const getBootstrapSub = (token: string) => apiRequest<{ sub: string }>('/api/bootstrap', { headers: authHeaders(token) })
export const createSong = (token: string, input: Omit<Song, 'id'>) =>
  apiRequest<{ song: Song }>('/api/songs', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(input) })
export const updateSong = (token: string, song: Song) =>
  apiRequest<{ song: Song }>(`/api/songs/${encodeURIComponent(song.id)}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify(song),
  })
export const deleteSong = (token: string, id: string) =>
  apiRequest<{ deleted: true }>(`/api/songs/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders(token) })
