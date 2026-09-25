import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChordBlock, LyricBlock, SongBlock } from '../data/types'
import { duplicateBlock } from '../data/duplicate'
import { importLyricsBlocks, parseLyricsText } from '../data/lyricsParser'
import { insertInlineBlock } from '../data/inlineBlocks'
import ChordEditor from './ChordEditor'
import SongBlockView from './SongBlock'

type Props = {
  blocks: SongBlock[]
  onChange: (blocks: SongBlock[]) => void
}

function newId() {
  return crypto.randomUUID()
}

export default function SongEditor({ blocks, onChange }: Props) {
  const editorRef = useRef<HTMLElement>(null)
  const pendingFocus = useRef<{ id: string; type: SongBlock['type'] } | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const lyrics = blocks.filter((block): block is LyricBlock => block.type === 'lyric')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const parsedLyrics = useMemo(() => parseLyricsText(pasteText), [pasteText])
  const totalBlocks = (pasteMode === 'append' ? blocks.length : 0) + parsedLyrics.length
  const importError = parsedLyrics.length === 0 ? 'Paste lirik terlebih dahulu.'
    : totalBlocks > 500 ? 'Maksimal 500 block per lagu.'
      : parsedLyrics.some((block) => block.type === 'section' ? block.label.length > 120 : block.text.length > 2000)
        ? 'Ada baris yang melebihi batas panjang block.' : ''

  useLayoutEffect(() => {
    const pending = pendingFocus.current
    if (!pending || !editorRef.current) return
    const container = Array.from(editorRef.current.querySelectorAll<HTMLElement>('.editor-block'))
      .find((element) => element.dataset.blockId === pending.id)
    const control = pending.type === 'lyric'
      ? container?.querySelector<HTMLInputElement>('.lyric-input')
      : pending.type === 'section'
        ? container?.querySelector<HTMLInputElement>('.section-input')
        : container?.querySelector<HTMLSelectElement>('.chord-editor__selector select')
    if (!control) return
    control.focus()
    pendingFocus.current = null
  }, [activeBlockId, blocks])

  function openBlock(block: SongBlock) {
    pendingFocus.current = { id: block.id, type: block.type }
    setActiveBlockId(block.id)
  }

  function updateBlock(id: string, next: SongBlock) {
    const updated = blocks.map((block) => block.id === id ? next : block)
    if (next.type === 'lyric') {
      onChange(updated.map((block) => block.type === 'chord' && block.lyricRef === id
        ? { ...block, chords: block.chords.map((chord) => ({ ...chord, column: Math.min(chord.column, next.text.length) })) }
        : block))
      return
    }
    if (next.type === 'chord' && blocks.find((block) => block.id === id)?.type === 'chord') {
      const previous = blocks.find((block) => block.id === id) as ChordBlock
      if (previous.lyricRef !== next.lyricRef && next.lyricRef) {
        const without = updated.filter((block) => block.id !== id)
        const lyricIndex = without.findIndex((block) => block.id === next.lyricRef)
        without.splice(lyricIndex, 0, next)
        onChange(without)
        return
      }
    }
    onChange(updated)
  }

  function addBlock(type: SongBlock['type']) {
    const id = newId()
    pendingFocus.current = { id, type }
    setActiveBlockId(id)
    if (type === 'section') onChange([...blocks, { id, type, label: 'Bagian Baru' }])
    if (type === 'lyric') onChange([...blocks, { id, type, text: '' }])
    if (type === 'chord') {
      const lastLyric = lyrics.at(-1)
      const next: ChordBlock = { id, type, lyricRef: lastLyric?.id ?? null, chords: [] }
      if (!lastLyric) onChange([...blocks, next])
      else {
        const insertAt = blocks.findIndex((block) => block.id === lastLyric.id)
        onChange([...blocks.slice(0, insertAt), next, ...blocks.slice(insertAt)])
      }
    }
  }

  function deleteBlock(id: string) {
    if (activeBlockId === id) setActiveBlockId(null)
    onChange(blocks.filter((block) => block.id !== id).map((block) =>
      block.type === 'chord' && block.lyricRef === id ? { ...block, lyricRef: null } : block))
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function copyBlock(id: string, mode: 'copy' | 'pair') {
    onChange(duplicateBlock(blocks, id, mode))
  }

  function addInline(sourceId: string, type: 'chord' | 'lyric') {
    const inserted = insertInlineBlock(blocks, sourceId, type)
    if (!inserted) return
    pendingFocus.current = { id: inserted.id, type }
    setActiveBlockId(inserted.id)
    onChange(inserted.blocks)
  }

  function closePaste() {
    setPasteOpen(false)
    setPasteText('')
    setPasteMode('append')
    setConfirmReplace(false)
  }

  function importPaste() {
    if (importError) return
    if (pasteMode === 'replace' && blocks.length > 0 && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setActiveBlockId(null)
    onChange(importLyricsBlocks(blocks, parsedLyrics, pasteMode))
    closePaste()
  }

  return (
    <section className="song-editor" aria-label="Editor lagu" ref={editorRef}>
      <div className="editor-intro">
        <div>
          <p className="eyebrow">EDIT MODE</p>
          <h2>Susun lagu</h2>
          <p>Setiap baris lirik, chord, dan bagian adalah block terpisah. Setelah paste lirik, klik Edit pada baris yang perlu chord, lalu + Chord. Editor selalu menampilkan chord asli.</p>
        </div>
        <span className="editor-intro__count">{blocks.length} BLOCK</span>
      </div>
      <div className="add-blocks" aria-label="Tambah block">
        <button type="button" onClick={() => addBlock('section')}>+ Bagian</button>
        <button type="button" onClick={() => addBlock('lyric')}>+ Lirik</button>
        <button type="button" onClick={() => addBlock('chord')}>+ Chord</button>
        <button type="button" onClick={() => setPasteOpen(true)} aria-expanded={pasteOpen}>Paste Lyrics</button>
      </div>
      {pasteOpen && <section className="paste-panel" aria-label="Bulk Paste Lyrics">
        <div className="paste-panel__heading">
          <div><p className="eyebrow">BULK PASTE</p><h3>Paste Lyrics</h3></div>
          <p>Satu baris menjadi satu block. Baris kosong dilewati; chord ditambahkan kemudian.</p>
        </div>
        <label className="editor-field" htmlFor="bulk-lyrics-text"><span>Teks lagu</span></label>
        <textarea
          id="bulk-lyrics-text"
          className="paste-panel__textarea"
          value={pasteText}
          onChange={(event) => { setPasteText(event.target.value); setConfirmReplace(false) }}
          placeholder={'Intro\n\nVerse 1\nAku berjalan sendiri\nMencari arti hidup ini\n\nChorus\nKau datang membawa cahaya'}
        />
        <fieldset className="paste-panel__mode">
          <legend>Mode insert</legend>
          <label><input type="radio" name="paste-mode" checked={pasteMode === 'append'} onChange={() => { setPasteMode('append'); setConfirmReplace(false) }} /> Append to End</label>
          <label><input type="radio" name="paste-mode" checked={pasteMode === 'replace'} onChange={() => { setPasteMode('replace'); setConfirmReplace(false) }} /> Replace Current Content</label>
        </fieldset>
        <div className="paste-panel__preview" aria-label="Preview hasil paste">
          <div className="paste-panel__preview-heading"><strong>Preview</strong><span>{parsedLyrics.length} block baru</span></div>
          {parsedLyrics.length ? <ol>{parsedLyrics.map((block, index) => <li key={index}><b>{block.type === 'section' ? 'SECTION' : 'LYRIC'}</b><span>— {block.type === 'section' ? block.label : block.text}</span></li>)}</ol>
            : <p>Hasil parser akan tampil di sini.</p>}
        </div>
        {pasteText && importError && <p className="paste-panel__error" role="alert">{importError}</p>}
        {confirmReplace && <div className="paste-panel__confirm" role="alertdialog" aria-label="Konfirmasi replace">
          <p>Replace akan mengganti semua {blocks.length} block saat ini. Lanjutkan?</p>
          <button className="toolbar-button toolbar-button--danger" type="button" onClick={importPaste}>Confirm Replace</button>
          <button className="toolbar-button toolbar-button--ghost" type="button" onClick={() => setConfirmReplace(false)}>Kembali ke preview</button>
        </div>}
        <div className="paste-panel__actions">
          <button className="toolbar-button toolbar-button--ghost" type="button" onClick={closePaste}>Cancel</button>
          {!confirmReplace && <button className="toolbar-button toolbar-button--primary" type="button" onClick={importPaste} disabled={Boolean(importError)}>Import</button>}
        </div>
      </section>}
      <div className="editor-blocks">
        {blocks.map((block, index) => {
          const active = activeBlockId === block.id
          return <div className={`editor-block${active ? ' editor-block--active' : ' editor-block--collapsed'}`} key={block.id} data-block-id={block.id}>
            {active ? <>
              <div className="editor-block__top">
                <span className="editor-block__type"><b>{String(index + 1).padStart(2, '0')}</b> {block.type === 'section' ? 'BAGIAN' : block.type === 'lyric' ? 'LIRIK' : 'CHORD'}</span>
                <div className="editor-block__actions">
                  <button type="button" aria-label={`Tambah Chord ${block.type === 'lyric' ? 'untuk lirik' : 'setelah'} block ${index + 1}`} title={block.type === 'lyric' ? 'Chord sebelum lirik ini' : 'Chord setelah block ini'} onClick={() => addInline(block.id, 'chord')} disabled={blocks.length >= 500}>+ Chord</button>
                  <button type="button" aria-label={`Tambah Lirik setelah block ${index + 1}`} title="Lirik setelah block ini" onClick={() => addInline(block.id, 'lyric')} disabled={blocks.length >= 500}>+ Lirik</button>
                  {block.type !== 'section' && <button type="button" aria-label={`Copy ${block.type === 'lyric' ? 'Lyric' : 'Chord'} block ${index + 1}`} onClick={() => copyBlock(block.id, 'copy')}>Copy</button>}
                  {block.type === 'chord' && lyrics.some((lyric) => lyric.id === block.lyricRef) && <button type="button" aria-label={`Duplicate Pair block ${index + 1}`} onClick={() => copyBlock(block.id, 'pair')}>Duplicate Pair</button>}
                  <button type="button" aria-label={`Pindah block ${index + 1} ke atas`} title="Pindah ke atas" onClick={() => moveBlock(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" aria-label={`Pindah block ${index + 1} ke bawah`} title="Pindah ke bawah" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>↓</button>
                  <button type="button" aria-label={`Hapus block ${index + 1}`} title="Hapus block" className="editor-block__delete" onClick={() => deleteBlock(block.id)}>Hapus</button>
                  <button className="editor-block__done" type="button" aria-label={`Selesai edit block ${index + 1}`} onClick={() => setActiveBlockId(null)}>Done</button>
                </div>
              </div>
              {block.type === 'section' && (
                <label className="editor-field">
                  <span>Nama bagian</span>
                  <input className="section-input" value={block.label} onChange={(event) => updateBlock(block.id, { ...block, label: event.target.value })} placeholder="Contoh: Verse, Chorus" />
                </label>
              )}
              {block.type === 'lyric' && (
                <label className="editor-field">
                  <span>Baris lirik <small>Spasi ikut dihitung sebagai posisi chord.</small></span>
                  <input className="lyric-input" value={block.text} onChange={(event) => updateBlock(block.id, { id: block.id, type: 'lyric', text: event.target.value })} placeholder="Tulis satu baris lirik..." />
                </label>
              )}
              {block.type === 'chord' && (
                <ChordEditor block={block} lyrics={lyrics} onChange={(next) => updateBlock(block.id, next)} />
              )}
            </> : <>
              <div className="editor-block__preview">
                {block.type === 'chord' && !block.chords.length ? <span className="editor-block__empty">Chord kosong</span>
                  : block.type === 'lyric' && !block.text ? <span className="editor-block__empty">Lirik kosong</span>
                    : <SongBlockView block={block} />}
              </div>
              <button className="editor-block__edit" type="button" aria-label={`Edit ${block.type === 'section' ? 'Bagian' : block.type === 'lyric' ? 'Lirik' : 'Chord'} block ${index + 1}`} onClick={() => openBlock(block)}>Edit</button>
            </>}
          </div>
        })}
      </div>
    </section>
  )
}
