import { useState, type KeyboardEvent } from 'react'
import { formatChordLine } from '../data/chords'
import type { ChordBlock, ChordPlacement, LyricBlock } from '../data/types'

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

function splitSymbol(symbol: string) {
  return { root: symbol.endsWith('m') ? symbol.slice(0, -1) : symbol, minor: symbol.endsWith('m') }
}

function makeSymbol(root: string, minor: boolean) {
  return `${root}${minor ? 'm' : ''}`
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value))
}

type Props = {
  block: ChordBlock
  lyrics: LyricBlock[]
  onChange: (block: ChordBlock) => void
}

export default function ChordEditor({ block, lyrics, onChange }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(block.chords.length ? 0 : null)
  const [pendingColumn, setPendingColumn] = useState(0)
  const [newRoot, setNewRoot] = useState('C')
  const [newMinor, setNewMinor] = useState(false)
  const selected = selectedIndex === null ? undefined : block.chords[selectedIndex]
  const selectedSymbol = selected ? splitSymbol(selected.symbol) : { root: newRoot, minor: newMinor }
  const lyric = lyrics.find((item) => item.id === block.lyricRef)
  const maxColumn = lyric ? lyric.text.length : 120
  const currentColumn = selected ? selected.column : pendingColumn

  function updateChord(index: number, patch: Partial<ChordPlacement>) {
    onChange({
      ...block,
      chords: block.chords.map((item, i) => i === index ? { ...item, ...patch } : item),
    })
  }

  function changeRoot(root: string) {
    if (selectedIndex !== null && selected) updateChord(selectedIndex, { symbol: makeSymbol(root, selectedSymbol.minor) })
    else setNewRoot(root)
  }

  function changeType(minor: boolean) {
    if (selectedIndex !== null && selected) updateChord(selectedIndex, { symbol: makeSymbol(selectedSymbol.root, minor) })
    else setNewMinor(minor)
  }

  function setColumn(column: number) {
    const next = clamp(column, maxColumn)
    if (selectedIndex !== null && selected) updateChord(selectedIndex, { column: next })
    else setPendingColumn(next)
  }

  function moveColumn(direction: -1 | 1) {
    setColumn(currentColumn + direction * 2)
  }

  function handleSpace(event: KeyboardEvent<HTMLElement>) {
    if (event.code !== 'Space' && event.key !== ' ') return
    const target = event.target as HTMLElement
    if (!target.classList.contains('chord-chip') && !target.classList.contains('position-focus')) return
    event.preventDefault()
    moveColumn(event.shiftKey ? -1 : 1)
  }

  function addChord() {
    const symbol = makeSymbol(selectedSymbol.root, selectedSymbol.minor)
    const column = block.chords.length === 0
      ? clamp(pendingColumn, maxColumn)
      : clamp(Math.max(pendingColumn, ...block.chords.map((item) => item.column + item.symbol.length + 2)), maxColumn)
    onChange({ ...block, chords: [...block.chords, { column, symbol }] })
    setSelectedIndex(block.chords.length)
    setPendingColumn(clamp(column + symbol.length + 2, maxColumn))
  }

  function removeChord() {
    if (selectedIndex === null || !selected) return
    onChange({ ...block, chords: block.chords.filter((_, index) => index !== selectedIndex) })
    setSelectedIndex(block.chords.length > 1 ? Math.max(0, selectedIndex - 1) : null)
  }

  function selectChord(index: number) {
    setSelectedIndex(index)
    setPendingColumn(block.chords[index].column)
  }

  return (
    <div className="chord-editor" onKeyDown={handleSpace}>
      <label className="editor-field">
        <span>Referensi lirik</span>
        <select value={block.lyricRef ?? ''} onChange={(event) => onChange({ ...block, lyricRef: event.target.value || null })}>
          <option value="">Tanpa referensi lirik</option>
          {lyrics.map((item) => <option key={item.id} value={item.id}>{item.text.trim() || '(Lirik kosong)'}</option>)}
        </select>
      </label>

      {lyric && (
        <div className="position-ruler">
          <div className="position-ruler__heading"><span>Klik karakter untuk posisi chord</span><span>Spasi = ·</span></div>
          <div className="position-ruler__scroll">
            {Array.from({ length: lyric.text.length + 1 }, (_, index) => (
              <button
                key={index}
                type="button"
                className={`position-cell${index === currentColumn ? ' position-cell--active' : ''}`}
                onClick={() => setColumn(index)}
                aria-label={`Posisi ${index}${lyric.text[index] === ' ' ? ', spasi' : ''}`}
                title={`Indeks ${index}`}
              >
                {lyric.text[index] === ' ' ? '·' : lyric.text[index] ?? '∣'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chord-editor__selector">
        <label className="editor-field">
          <span>Root</span>
          <select value={selectedSymbol.root} onChange={(event) => changeRoot(event.target.value)}>
            {ROOTS.map((root) => <option key={root} value={root}>{root}</option>)}
          </select>
        </label>
        <label className="editor-field">
          <span>Type</span>
          <select value={selectedSymbol.minor ? 'minor' : 'major'} onChange={(event) => changeType(event.target.value === 'minor')}>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <button className="editor-button editor-button--accent" type="button" onClick={addChord}>+ Tambah chord</button>
      </div>

      <div className="chord-chips" aria-label="Chord dalam baris">
        {block.chords.length === 0 && <span className="editor-muted">Belum ada chord di baris ini.</span>}
        {block.chords.map((item, index) => (
          <button
            className={`chord-chip${selectedIndex === index ? ' chord-chip--active' : ''}`}
            key={index}
            type="button"
            onClick={() => selectChord(index)}
            aria-pressed={selectedIndex === index}
            aria-label={`${item.symbol}, posisi ${item.column}`}
          >
            <strong>{item.symbol}</strong><span>@{item.column}</span>
          </button>
        ))}
      </div>

      <div className="editor-score-preview" aria-label="Preview alignment chord dan lirik">
        <span className="editor-score-preview__label">PREVIEW ALIGNMENT</span>
        <div className="editor-score-preview__scroll">
          <span className="score-line__chords">{formatChordLine(block.chords) || ' '}</span>
          {lyric && <span className="score-line__lyric">{lyric.text || ' '}</span>}
        </div>
      </div>

      <div className="position-controls">
        <span className="position-controls__label">Posisi karakter <strong>{currentColumn}</strong></span>
        <button type="button" aria-label="Mundur 2 karakter" onClick={() => moveColumn(-1)} disabled={currentColumn === 0}>←</button>
        <button type="button" aria-label="Maju 2 karakter" onClick={() => moveColumn(1)} disabled={currentColumn === maxColumn}>→</button>
        <span className="position-focus" tabIndex={0}>Space +2 · Shift + Space −2</span>
        <button className="editor-button editor-button--danger" type="button" onClick={removeChord} disabled={!selected}>Hapus chord</button>
      </div>
    </div>
  )
}
