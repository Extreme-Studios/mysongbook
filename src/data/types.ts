export type ChordPlacement = {
  /** Zero-based character column in the lyric line. */
  column: number
  symbol: string
}

export type SectionBlock = {
  id: string
  type: 'section'
  label: string
}

export type LyricBlock = {
  id: string
  type: 'lyric'
  text: string
  /** Legacy mock-data shape; converted to linked chord blocks before editing. */
  chords?: ChordPlacement[]
}

export type ChordBlock = {
  id: string
  type: 'chord'
  /** A linked lyric block ID, or null for a standalone chord line. */
  lyricRef?: string | null
  chords: ChordPlacement[]
}

export type SongBlock = SectionBlock | LyricBlock | ChordBlock

export type Song = {
  id: string
  title: string
  artist: string
  originalKey: string
  blocks: SongBlock[]
}
