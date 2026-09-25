import { formatChordLine } from '../data/chords'
import type { SongBlock as SongBlockType } from '../data/types'

type Props = {
  block: SongBlockType
}

export default function SongBlock({ block }: Props) {
  if (block.type === 'section') {
    return <h2 className="song-section"><span>{block.label}</span></h2>
  }

  if (block.type === 'chord') {
    return (
      <div className="score-line score-line--chords" aria-label={`Chord: ${block.chords.map((item) => item.symbol).join(', ')}`}>
        <span className="score-line__chords" aria-hidden="true">{formatChordLine(block.chords)}</span>
      </div>
    )
  }

  const chords = block.chords ?? []
  return (
    <div className="score-line" aria-label={`${chords.length ? `Chord ${chords.map((item) => item.symbol).join(', ')}. ` : ''}${block.text}`}>
      {chords.length > 0 && <span className="score-line__chords" aria-hidden="true">{formatChordLine(chords)}</span>}
      <span className="score-line__lyric" aria-hidden="true">{block.text}</span>
    </div>
  )
}
