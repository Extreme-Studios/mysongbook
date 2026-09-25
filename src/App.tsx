import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import SongList from './components/SongList'
import SongPage from './components/SongPage'
import { getSong, getSongs } from './data/api'
import { findSong, songs as mockSongs } from './data/songs'
import { CHROMATIC_ROOTS } from './data/transpose'
import type { Song } from './data/types'

type Source = 'sheet' | 'mock'

function HomePage({ songs, source }: { songs: Song[]; source: Source }) {
  const [query, setQuery] = useState('')
  const filteredSongs = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return term ? songs.filter((song) => `${song.title} ${song.artist}`.toLocaleLowerCase().includes(term)) : songs
  }, [query, songs])
  return (
    <main className="page page--home">
      {source === 'mock' && <p className="source-warning" role="status">Mode pengembangan: API tidak tersedia. Daftar ini berasal dari mock lokal, bukan Google Sheet.</p>}
      <section className="hero">
        <p className="eyebrow"><span className="eyebrow__line" /> YOUR MUSIC, IN ONE PLACE</p>
        <h1>Every song has<br /><em>a place here.</em></h1>
        <p className="hero__description">Kumpulan lagu dan chord untuk menemani setiap sesi musikmu. Pilih lagu, lalu mulai mainkan.</p>
        <div className="hero__note"><span className="hero__note-icon">♪</span> OPEN THE BOOK. PLAY THE MUSIC.</div>
      </section>
      <section className="catalog" aria-labelledby="catalog-title">
        <div className="catalog__heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2 id="catalog-title">Daftar lagu<span className="accent-dot">.</span></h2></div>
          <span className="song-count">{filteredSongs.length} LAGU</span>
        </div>
        <SearchBar value={query} onChange={setQuery} />
        <SongList songs={filteredSongs} />
      </section>
      <footer className="page-footer">SONGBOOK <span>—</span> BUILT FOR THE LOVE OF MUSIC</footer>
    </main>
  )
}

function NewSongPage({ onContinue }: { onContinue: (song: Song) => void }) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [originalKey, setOriginalKey] = useState('C')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onContinue({ id: 'new-draft', title: title.trim(), artist: artist.trim(), originalKey, blocks: [] })
  }
  return (
    <main className="page page--song">
      <a className="back-link" href="/">← Kembali ke daftar</a>
      <div className="new-song">
        <p className="eyebrow">SUPER USER / NEW SONG</p>
        <h1>Lagu baru</h1>
        <p>Buat informasi dasar, lalu susun bagian, lirik, dan chord di editor.</p>
        <form onSubmit={submit}>
          <label className="editor-field"><span>Title</span><input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="editor-field"><span>Artist</span><input maxLength={180} value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
          <label className="editor-field"><span>Original Key</span><select value={originalKey} onChange={(event) => setOriginalKey(event.target.value)}>{CHROMATIC_ROOTS.map((root) => <option key={root}>{root}</option>)}</select></label>
          <button className="toolbar-button toolbar-button--primary">Lanjut ke editor</button>
        </form>
      </div>
    </main>
  )
}

function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="page page--song request-state" role="alert">
      <h1>Songbook belum dapat dimuat.</h1>
      <p>{message}</p>
      <button className="toolbar-button toolbar-button--primary" onClick={onRetry}>Coba lagi</button>
    </main>
  )
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/$/, '') || '/')
  const [token, setToken] = useState('')
  const [songList, setSongList] = useState<Song[] | null>(null)
  const [song, setSong] = useState<Song | null>(null)
  const [source, setSource] = useState<Source>('sheet')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [newSong, setNewSong] = useState<Song | null>(null)
  const songId = path.startsWith('/song/') ? path.slice('/song/'.length) : null
  const onAdmin = useCallback((credential: string) => setToken(credential), [])

  const navigate = useCallback((next: string) => {
    window.history.pushState(null, '', next)
    setPath(next)
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const pop = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    const click = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest<HTMLAnchorElement>('a[href^="/"]')
      if (!link || link.target || link.hasAttribute('download')) return
      event.preventDefault()
      navigate(link.pathname)
    }
    window.addEventListener('popstate', pop)
    document.addEventListener('click', click)
    return () => { window.removeEventListener('popstate', pop); document.removeEventListener('click', click) }
  }, [navigate])

  useEffect(() => {
    if (path === '/new' || path === '/new/edit') return
    let active = true
    if (path === '/') {
      getSongs().then(({ songs }) => {
        if (active) { setSongList(songs); setSource('sheet'); setError('') }
      }).catch((cause) => {
        if (!active) return
        if (import.meta.env.DEV) { setSongList(mockSongs); setSource('mock'); setError('') }
        else setError(cause instanceof Error ? cause.message : 'Daftar lagu gagal dimuat.')
      })
    } else if (songId) {
      getSong(songId).then(({ song }) => {
        if (active) { setSong(song); setSource('sheet'); setError('') }
      }).catch((cause) => {
        if (!active) return
        const fallback = import.meta.env.DEV ? findSong(songId) : undefined
        if (fallback) { setSong(fallback); setSource('mock'); setError('') }
        else setError(cause instanceof Error ? cause.message : 'Lagu gagal dimuat.')
      })
    }
    return () => { active = false }
  }, [path, retry, songId])

  let page
  if (path === '/') {
    page = error ? <ErrorPage message={error} onRetry={() => setRetry((value) => value + 1)} />
      : songList ? <HomePage songs={songList} source={source} />
        : <main className="page page--song request-state" role="status">Loading songbook...</main>
  } else if (path === '/new') {
    page = token ? <NewSongPage onContinue={(draft) => {
      setNewSong(draft); navigate('/new/edit')
    }} /> : <main className="page page--song request-state">Login Super User diperlukan.</main>
  } else if (path === '/new/edit') {
    page = token && newSong
      ? <SongPage key="new-draft" song={newSong} source="sheet" token={token} isNew startEditing onSaved={(created) => {
        setNewSong(null); setSong(created); setSource('sheet'); navigate(`/song/${created.id}`)
      }} onDeleted={() => navigate('/')} onCancelNew={() => navigate('/new')} />
      : <main className="page page--song request-state"><p>Editor lagu baru belum siap.</p><a href="/new">Buka formulir lagu baru</a></main>
  } else if (songId) {
    page = error ? <ErrorPage message={error} onRetry={() => setRetry((value) => value + 1)} />
      : song && song.id === songId
        ? <SongPage key={song.id} song={song} source={source} token={token} onSaved={setSong} onDeleted={() => navigate('/')} />
        : <main className="page page--song request-state" role="status">Loading song...</main>
  } else {
    page = <main className="page not-found"><p className="eyebrow">404 / NOT FOUND</p><h1>Halaman tidak ditemukan.</h1><a className="back-link" href="/">← Kembali ke daftar lagu</a></main>
  }

  return <><Header isAdmin={Boolean(token)} onAdmin={onAdmin} onLogout={() => setToken('')} />{page}</>
}
