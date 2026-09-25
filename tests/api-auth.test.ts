import assert from 'node:assert/strict'
import test from 'node:test'
import songsHandler from '../api/songs/index'
import songHandler from '../api/songs/[id]'
import adminHandler from '../api/admin'
import type { ApiRequest, ApiResponse } from '../api/_lib/http'

async function call(handler: (req: ApiRequest, res: ApiResponse) => Promise<void>, method: string, authorization?: string) {
  let statusCode = 200
  let payload: unknown
  const response: ApiResponse = {
    setHeader() {},
    status(code) { statusCode = code; return this },
    json(body) { payload = body },
  }
  await handler({
    method,
    headers: authorization ? { authorization } : {},
    query: { id: 'song-123' },
    body: { title: 'Attempt', artist: '', originalKey: 'C', blocks: [] },
  }, response)
  return { statusCode, payload }
}

test('manual write requests without token are rejected before Sheet access', async () => {
  assert.equal((await call(songsHandler, 'POST')).statusCode, 401)
  assert.equal((await call(songHandler, 'PUT')).statusCode, 401)
  assert.equal((await call(songHandler, 'DELETE')).statusCode, 401)
  assert.equal((await call(adminHandler, 'GET')).statusCode, 401)
})
