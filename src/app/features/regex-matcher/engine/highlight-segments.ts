import { RegexMatch } from '../../../core/models/regex.models';

export type HighlightSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'match'; readonly text: string; readonly matchIndex: number }
  /** Correspondência de comprimento zero, exibida como um marcador de posição. */
  | { readonly kind: 'empty'; readonly matchIndex: number };

/**
 * Divide o texto original em segmentos de texto puro e de correspondência.
 * O texto não é alterado: os segmentos são renderizados via interpolação,
 * sem HTML dinâmico.
 */
export function buildHighlightSegments(text: string, matches: readonly RegexMatch[]): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor || match.start > text.length) continue;
    if (match.start > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, match.start) });
    }
    if (match.end === match.start) {
      segments.push({ kind: 'empty', matchIndex: match.index });
    } else {
      segments.push({ kind: 'match', text: text.slice(match.start, match.end), matchIndex: match.index });
    }
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segments;
}
