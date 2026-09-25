import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { requireAdmin } from './_lib/auth.js'
import { allowMethods, sendError } from './_lib/http.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowMethods(req, res, ['GET'])) return
  try {
    await requireAdmin(req)
    res.status(200).json({ admin: true })
  } catch (error) {
    sendError(res, error)
  }
}
