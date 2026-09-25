export type ApiRequest = {
  method?: string
  headers: { authorization?: string }
  query: Record<string, string | string[] | undefined>
  body?: unknown
}

export type ApiResponse = {
  setHeader(name: string, value: string): void
  status(code: number): ApiResponse
  json(body: unknown): void
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function sendError(res: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  console.error('Songbook API request failed', error instanceof Error ? error.message : 'Unknown error')
  res.status(500).json({ error: 'Layanan lagu sedang bermasalah. Coba lagi nanti.' })
}

export function allowMethods(req: ApiRequest, res: ApiResponse, methods: string[]) {
  res.setHeader('Allow', methods.join(', '))
  if (!methods.includes(req.method ?? '')) {
    res.status(405).json({ error: 'Metode tidak didukung.' })
    return false
  }
  return true
}

export function requestBody(req: ApiRequest): unknown {
  if (typeof req.body !== 'string') return req.body
  try {
    return JSON.parse(req.body)
  } catch {
    throw new ApiError(400, 'Format JSON tidak valid.')
  }
}
