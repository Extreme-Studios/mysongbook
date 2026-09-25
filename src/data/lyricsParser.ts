import type { SongBlock } from './types'

export type ParsedLyricsBlock =
  | { type: 'section'; label: string }
  | { type: 'lyric'; text: string }

const SECTION_PATTERN = /^(pre(?:-| )chorus|intro|verse|chorus|reff|refrain|bridge|interlude|instrumental|solo|outro|ending)(?:\s+([1-9]\d*x?))?(?:\s+(guitar|piano|bass|drums?|vocals?|sax|violin|keyboard|keys))?$/i

const SECTION_NAMES: Record<string, string> = {
  intro: 'Intro', verse: 'Verse', chorus: 'Chorus', reff: 'Reff', refrain: 'Refrain',
  'pre-chorus': 'Pre-Chorus', 'pre chorus': 'Pre Chorus', bridge: 'Bridge',
  interlude: 'Interlude', instrumental: 'Instrumental', solo: 'Solo',
  outro: 'Outro', ending: 'Ending',
}

function sectionLabel(line: string): string | null {
  const withoutColon = line.trim().replace(/:$/, '').trim()
  const heading = withoutColon.startsWith('[') && withoutColon.endsWith(']')
    ? withoutColon.slice(1, -1).trim()
    : withoutColon
  const match = SECTION_PATTERN.exec(heading)
  if (!match) return null
  const name = SECTION_NAMES[match[1].toLowerCase()]
  const number = match[2] ? ` ${match[2].toLowerCase()}` : ''
  const instrument = match[3] ? ` ${match[3][0].toUpperCase()}${match[3].slice(1).toLowerCase()}` : ''
  return `${name}${number}${instrument}`
}

export function parseLyricsText(text: string): ParsedLyricsBlock[] {
  const parsed: ParsedLyricsBlock[] = []
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) continue
    const label = sectionLabel(line)
    if (label) parsed.push({ type: 'section', label })
    else parsed.push({ type: 'lyric', text: line.trimEnd() })
  }
  return parsed
}

export function importLyricsBlocks(
  current: SongBlock[],
  parsed: ParsedLyricsBlock[],
  mode: 'append' | 'replace',
  createId: () => string = () => crypto.randomUUID(),
): SongBlock[] {
  const usedIds = new Set(current.map((block) => block.id))
  const imported = parsed.map((block): SongBlock => {
    let id = createId()
    while (usedIds.has(id)) id = createId()
    usedIds.add(id)
    return block.type === 'section'
      ? { id, type: 'section', label: block.label }
      : { id, type: 'lyric', text: block.text }
  })
  return mode === 'replace' ? imported : [...current, ...imported]
}
