import type { ApiRequest } from './http.js'
import { OAuth2Client } from 'google-auth-library'
import { ApiError } from './http.js'

export async function verifyGoogleIdentity(req: ApiRequest) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1]
  if (!token) throw new ApiError(401, 'Login Google diperlukan.')
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new ApiError(500, 'Login admin belum dikonfigurasi.')

  let sub: string | undefined
  let email: string | undefined
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: token, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
      throw new Error('Invalid issuer')
    }
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('Expired token')
    if (payload.email_verified !== true) throw new Error('Unverified email')
    sub = payload.sub
    email = payload.email
  } catch {
    throw new ApiError(401, 'Sesi Google tidak valid atau sudah berakhir.')
  }

  return { sub, email }
}

export async function requireAdmin(req: ApiRequest) {
  const identity = await verifyGoogleIdentity(req)
  const adminSub = process.env.ADMIN_GOOGLE_SUB
  if (!adminSub || identity.sub !== adminSub) throw new ApiError(403, 'Akun ini bukan Super User Songbook.')
  return identity
}
