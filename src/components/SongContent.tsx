import type { SongBlock as SongBlockType } from '../data/types'
import SongBlock from './SongBlock'

type Props = {
  blocks: SongBlockType[]
}

export default function SongContent({ blocks }: Props) {
  return (
    <article className="song-content" aria-label="Lirik dan chord">
      {blocks.map((block) => <SongBlock key={block.id} block={block} />)}
    </article>
  )
}
