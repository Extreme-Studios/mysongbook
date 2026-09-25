import type { Song } from '../data/types'
import SongListItem from './SongListItem'

type Props = {
  songs: Song[]
}

export default function SongList({ songs }: Props) {
  if (songs.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state__icon" aria-hidden="true">♪</span>
        <h2>Lagu tidak ditemukan</h2>
        <p>Coba judul atau nama artis yang lain.</p>
      </div>
    )
  }

  return (
    <ul className="song-list">
      {songs.map((song, index) => <SongListItem key={song.id} song={song} index={index} />)}
    </ul>
  )
}
