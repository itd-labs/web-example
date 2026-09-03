import { SpanType } from 'itd-api'
import type { TextSpan } from '#shared/itd'

/** Кусок текста поста: либо обычный, либо размеченный одним span. */
export interface TextChunk {
  text: string
  /** Все виды разметки этого участка; crypto может пересекаться с визуальными spans. */
  types: string[]
  type?: SpanType
  /** Имя хэштега без решётки либо имя пользователя. */
  tag?: string
  /** Адрес ссылки. Только у `link`. */
  url?: string
  cipher?: string
}

/** Типы, которые превращаются в ссылку внутри приложения или наружу. */
const LINK_TYPES = new Set<string>([SpanType.Hashtag, SpanType.Mention, SpanType.Link])

/** Ведёт ли фрагмент куда-то по клику. */
export function isLinkChunk(chunk: TextChunk): boolean {
  return chunk.type !== undefined && LINK_TYPES.has(chunk.type)
}

/**
 * Адрес, на который ведёт размеченный фрагмент.
 *
 * Хэштеги и упоминания остаются внутри приложения, `link` уходит наружу как есть.
 */
export function chunkHref(chunk: TextChunk): string | undefined {
  switch (chunk.type) {
    case SpanType.Hashtag:
      return chunk.tag ? `/hashtag/${encodeURIComponent(chunk.tag)}` : undefined
    case SpanType.Mention:
      return chunk.tag ? `/@${chunk.tag}` : undefined
    case SpanType.Link:
      return chunk.url
    default:
      return undefined
  }
}

/**
 * Режет текст на фрагменты по разметке сервера.
 *
 * Смещения считаются в единицах JavaScript-строки: разметку расставляет тот же
 * фронтенд на JS, поэтому `slice` совпадает с тем, что имел в виду сервер.
 * Пересекающиеся и выходящие за границы span игнорируются — иначе текст бы поехал.
 */
export function splitSpans(text: string, spans: TextSpan[] = []): TextChunk[] {
  if (!text) return []

  const usable = spans
    .filter(span => span.length > 0 && span.offset >= 0 && span.offset + span.length <= text.length)
    .sort((a, b) => a.offset - b.offset)

  const boundaries = [...new Set([
    0,
    text.length,
    ...usable.flatMap(span => [span.offset, span.offset + span.length]),
  ])].sort((a, b) => a - b)

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]!
    const active = usable.filter(span => span.offset <= start && span.offset + span.length >= end)
    const primary = active.find(span => LINK_TYPES.has(span.type)) ?? active[0]
    const crypto = active.find(span => span.type === 'crypto')

    return {
      text: text.slice(start, end),
      types: active.map(span => span.type),
      ...(primary ? { type: primary.type } : {}),
      ...(primary && 'tag' in primary && primary.tag ? { tag: primary.tag } : {}),
      ...(primary && 'url' in primary && primary.url ? { url: primary.url } : {}),
      ...(typeof crypto?.cipher === 'string' ? { cipher: crypto.cipher } : {}),
    }
  })
}
