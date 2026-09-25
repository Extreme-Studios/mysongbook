import { useState } from 'react'
import { createSong, deleteSong, updateSong } from '../data/api'
import { clearDraft, loadSongWithDraft, normalizeBlocks, saveDraft } from '../data/drafts'
import { transposeBlocks, transposeKey } from '../data/transpose'
import type { Song } from '../data/types'
import SongContent from './SongContent'
import SongEditor from './SongEditor'

type Props = {
  song: Song
  source: 'sheet' | 'mock'
  token: string
  startEditing?: boolean
  isNew?: boolean
  onSaved: (song: Song) => void
  onDeleted: () => void
  onCancelNew?: () => void
}

export default function SongPage({ song, source, token, startEditing = false, isNew = false, onSaved, onDeleted, onCancelNew }: Props) {
  const [initial] = useState(() => source === 'mock'
    ? loadSongWithDraft(song)
    : { song: { ...song, blocks: normalizeBlocks(song.blocks) }, hasDraft: loadSongWithDraft(song).hasDraft })
  const [viewSong, setViewSong] = useState(initial.song)
  const [workingBlocks, setWorkingBlocks] = useState(initial.song.blocks)
  const [hasDraft, setHasDraft] = useState(initial.hasDraft)
  const [editing, setEditing] = useState(startEditing)
  const [busy, setBusy] = useState<'saving' | 'deleting' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [message, setMessage] = useState('')
  const canAdmin = Boolean(token) && source === 'sheet'

  function startEdit() {
    setConfirmingDelete(false)
    setWorkingBlocks(structuredClone(viewSong.blocks))
    setMessage('')
    setEditing(true)
  }

  function cancelEdit() {
    if (isNew) { onCancelNew?.(); return }
    setWorkingBlocks(structuredClone(viewSong.blocks))
    setMessage('Perubahan yang belum disimpan dibatalkan.')
    setEditing(false)
  }

  function handleSaveDraft() {
    if (isNew) return
    if (saveDraft({ ...viewSong, blocks: workingBlocks })) {
      setHasDraft(true)
      setMessage('Draft tersimpan di browser ini. Google Sheet belum berubah.')
    } else setMessage('Draft lokal gagal disimpan di browser ini.')
  }

  async function handleSave() {
    if (!canAdmin || busy) return
    const next = { ...viewSong, blocks: workingBlocks }
    setBusy('saving')
    setMessage('')
    try {
      const saved = isNew
        ? await createSong(token, { title: next.title, artist: next.artist, originalKey: next.originalKey, blocks: next.blocks })
        : await updateSong(token, next)
      setViewSong(saved.song)
      setWorkingBlocks(saved.song.blocks)
      setHasDraft(false)
      if (!isNew) clearDraft(next.id)
      onSaved(saved.song)
      setEditing(false)
      setMessage('Lagu tersimpan ke Google Sheet.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lagu gagal disimpan.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!canAdmin || busy) return
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    setBusy('deleting')
    setMessage('')
    try {
      await deleteSong(token, song.id)
      onDeleted()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lagu gagal dihapus.')
      setBusy(null)
    }
  }

  function useLocalDraft() {
    const draft = loadSongWithDraft(viewSong)
    if (!draft.hasDraft) return
    setWorkingBlocks(draft.song.blocks)
    setEditing(true)
    setMessage('Draft lokal dimuat ke editor. Simpan untuk mengirimnya ke Google Sheet.')
  }

  return (
    <main className="page page--song">
      <a className="back-link" href={isNew ? '/new' : '/'}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5m6 6-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isNew ? 'Kembali ke formulir' : 'Kembali ke daftar'}
      </a>
      <div className="song-heading">
        <div>
          <p className="eyebrow">SONG / {song.artist.toUpperCase()}</p>
          <h1>{song.title}</h1>
          <p className="song-heading__artist">{song.artist}</p>
        </div>
        <div className="song-keys">
          <div className="original-key"><span>ORIGINAL KEY</span><strong>{viewSong.originalKey}</strong></div>
          <div className="original-key current-key"><span>CURRENT KEY</span><strong>{transposeKey(viewSong.originalKey, editing ? 0 : transposeOffset)}</strong></div>
        </div>
      </div>
      <div className="song-toolbar">
        <div className="song-toolbar__state">
          {isNew ? <span className="draft-badge">BELUM DISIMPAN</span> : source === 'sheet' ? <span className="draft-badge">GOOGLE SHEET</span> : <span className="mock-badge">MOCK DEV</span>}
          {!isNew && source === 'sheet' && hasDraft && canAdmin && <button className="local-draft-button" type="button" onClick={useLocalDraft}>Muat draft lokal</button>}
        </div>
        {canAdmin && editing ? (
          <div className="song-toolbar__buttons">
            <button className="toolbar-button toolbar-button--ghost" type="button" onClick={cancelEdit} disabled={Boolean(busy)}>Cancel Edit</button>
            {!isNew && <button className="toolbar-button toolbar-button--ghost" type="button" onClick={handleSaveDraft} disabled={Boolean(busy)}>Save Draft</button>}
            <button className="toolbar-button toolbar-button--primary" type="button" onClick={handleSave} disabled={Boolean(busy)}>{busy === 'saving' ? 'Saving...' : 'Save to Sheet'}</button>
          </div>
        ) : canAdmin ? (
          <div className="song-toolbar__buttons">
            <button className="toolbar-button toolbar-button--primary" type="button" onClick={startEdit}>✎ &nbsp; Edit Mode</button>
            {confirmingDelete && <button className="toolbar-button toolbar-button--ghost" type="button" onClick={() => setConfirmingDelete(false)} disabled={Boolean(busy)}>Batal hapus</button>}
            <button className="toolbar-button toolbar-button--danger" type="button" onClick={handleDelete} disabled={Boolean(busy)}>{busy === 'deleting' ? 'Deleting...' : confirmingDelete ? 'Ya, hapus lagu' : 'Delete'}</button>
          </div>
        ) : null}
      </div>
      {message && <p className="editor-message" role="status">{message}</p>}
      {(!editing || !canAdmin) && (
        <div className="transpose-toolbar" role="group" aria-label="Transpose lagu">
          <span className="transpose-toolbar__label">TRANSPOSE</span>
          <div className="transpose-toolbar__controls">
            <button type="button" aria-label="Transpose turun satu semitone" onClick={() => setTransposeOffset((offset) => offset - 1)}>−</button>
            <output aria-label="Offset transpose">{transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}</output>
            <button type="button" aria-label="Transpose naik satu semitone" onClick={() => setTransposeOffset((offset) => offset + 1)}>+</button>
            <button className="transpose-toolbar__reset" type="button" onClick={() => setTransposeOffset(0)} disabled={transposeOffset === 0}>Reset</button>
          </div>
        </div>
      )}
      <div className="song-divider" />
      {editing && canAdmin ? <SongEditor blocks={workingBlocks} onChange={setWorkingBlocks} /> : <SongContent blocks={transposeBlocks(viewSong.blocks, transposeOffset)} />}
      {(!editing || !canAdmin) && <div className="song-end" aria-hidden="true">♪ &nbsp; SONGBOOK</div>}
    </main>
  )
}
