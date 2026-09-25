import type { ApiRequest, ApiResponse } from './_lib/http'
import { ApiError, allowMethods, sendError } from './_lib/http'
import { verifyGoogleIdentity } from './_lib/auth'

// Available only in explicitly enabled local development. Never set SONGBOOK_BOOTSTRAP in Vercel.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowMethods(req, res, ['GET'])) return
  try {
    if (process.env.NODE_ENV === 'production' || process.env.SONGBOOK_BOOTSTRAP !== '1') {
      throw new ApiError(404, 'Endpoint tidak tersedia.')
    }
    const identity = await verifyGoogleIdentity(req)
    const expectedEmail = process.env.ADMIN_GOOGLE_EMAIL
    if (!expectedEmail || identity.email !== expectedEmail) throw new ApiError(403, 'Akun tidak diizinkan untuk bootstrap.')
    res.status(200).json({ sub: identity.sub })
  } catch (error) {
    sendError(res, error)
  }
}
