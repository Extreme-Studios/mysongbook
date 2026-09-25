import { useEffect, useRef, useState } from 'react'
import { ClientApiError, getBootstrapSub, verifyAdmin } from '../data/api'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void
          renderButton(element: HTMLElement, options: Record<string, unknown>): void
        }
      }
    }
  }
}

type Props = {
  isAdmin: boolean
  onAdmin: (token: string) => void
  onLogout: () => void
}

let initializedClientId: string | null = null
let credentialHandler: ((credential: string) => void) | null = null

export default function AdminLogin({ isAdmin, onAdmin, onLogout }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || isAdmin) return
    let active = true
    const setup = () => {
      if (!active || !window.google || !buttonRef.current) return
      buttonRef.current.replaceChildren()
      credentialHandler = async (credential) => {
        try {
          await verifyAdmin(credential)
          if (active) {
            setError('')
            onAdmin(credential)
          }
        } catch (cause) {
          if (!active) return
          if (import.meta.env.DEV && cause instanceof ClientApiError && cause.status === 403) {
            try {
              const { sub } = await getBootstrapSub(credential)
              if (active) setError(`ID Super User terverifikasi: ${sub}. Isi ADMIN_GOOGLE_SUB di .env.local lalu mulai ulang server.`)
              return
            } catch { /* Bootstrap is optional and disabled outside local setup. */ }
          }
          if (active) setError(cause instanceof Error ? cause.message : 'Login admin gagal.')
        }
      }
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => credentialHandler?.(credential),
        })
        initializedClientId = clientId
      }
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline', size: 'medium', text: 'signin_with', shape: 'rectangular',
      })
    }
    if (window.google) setup()
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-songbook-gis]')
      const script = existing ?? document.createElement('script')
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.dataset.songbookGis = ''
        document.head.appendChild(script)
      }
      script.addEventListener('load', setup)
      script.addEventListener('error', () => active && setError('Google Login tidak dapat dimuat.'))
      return () => {
        active = false
        script.removeEventListener('load', setup)
      }
    }
    return () => { active = false }
  }, [clientId, isAdmin, onAdmin])

  if (isAdmin) return (
    <div className="admin-header">
      <span className="admin-header__badge">SUPER USER</span>
      <a href="/new" className="admin-header__new">+ Song</a>
      <button type="button" onClick={onLogout}>Keluar</button>
    </div>
  )
  return (
    <div className="admin-login">
      <span className="admin-login__label">Admin Login</span>
      {clientId ? <div ref={buttonRef} /> : <span className="admin-login__unavailable">Belum dikonfigurasi</span>}
      {error && <span className="admin-login__error" role="alert">{error}</span>}
    </div>
  )
}
