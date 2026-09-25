import AdminLogin from './AdminLogin'

type Props = {
  isAdmin: boolean
  onAdmin: (token: string) => void
  onLogout: () => void
}

export default function Header({ isAdmin, onAdmin, onLogout }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="/" aria-label="Songbook, kembali ke daftar lagu">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 7.5c3.5-1.5 6.5-1.5 9 0v17c-2.5-1.5-5.5-1.5-9 0V7.5Zm18 0c-3.5-1.5-6.5-1.5-9 0v17c2.5-1.5 5.5-1.5 9 0V7.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M11 12.5h2m6 0h2M11 16h2m6 0h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span>SONGBOOK<span className="brand__dot">.</span></span>
        </a>
        <span className="header-caption">THE EVERYDAY SONG COLLECTION</span>
        <AdminLogin isAdmin={isAdmin} onAdmin={onAdmin} onLogout={onLogout} />
      </div>
    </header>
  )
}
