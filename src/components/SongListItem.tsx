import type { Song } from '../data/types'

type Props = {
  song: Song
  index: number
}

export default function SongListItem({ song, index }: Props) {
  return (
    <li>
      <a className="song-item" href={`/song/${song.id}`}>
        <span className="song-item__number">{String(index + 1).padStart(2, '0')}</span>
        <span className="song-item__main">
          <span className="song-item__title">{song.title}</span>
          <span className="song-item__artist">{song.artist}</span>
        </span>
        <span className="song-item__key" aria-label={`Original key ${song.originalKey}`}>KEY <strong>{song.originalKey}</strong></span>
        <svg className="song-item__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </li>
  )
}
