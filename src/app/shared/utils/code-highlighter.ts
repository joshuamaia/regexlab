export type CodeTokenType = 'keyword' | 'string' | 'number' | 'comment' | 'regex' | 'plain';

export interface CodeToken {
  readonly text: string;
  readonly type: CodeTokenType;
}

const KEYWORDS = new Set([
  // JavaScript / TypeScript
  'const', 'let', 'for', 'of', 'if', 'else', 'new', 'null', 'return', 'while', 'true', 'false',
  'string', 'number', 'boolean',
  // Java
  'import', 'public', 'class', 'static', 'void', 'int', 'String',
]);

/**
 * Realce de sintaxe mínimo para o código gerado. Produz tokens renderizados
 * por interpolação (sem innerHTML). Alternativas mutuamente exclusivas mantêm
 * a varredura linear.
 */
const TOKEN_PATTERN = new RegExp(
  [
    String.raw`(?<comment>\/\/[^\n]*)`,
    String.raw`(?<regex>(?<==\s)\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[dgimsuvy]*)`,
    String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60)`,
    String.raw`(?<number>\b\d+(?:\.\d+)?\b)`,
    String.raw`(?<word>\b[A-Za-z_$][\w$]*\b)`,
  ].join('|'),
  'g',
);

export function highlightCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let cursor = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const groups = match.groups ?? {};
    const type: CodeTokenType = groups['comment']
      ? 'comment'
      : groups['regex']
        ? 'regex'
        : groups['string']
          ? 'string'
          : groups['number']
            ? 'number'
            : KEYWORDS.has(match[0])
              ? 'keyword'
              : 'plain';

    if (match.index > cursor) tokens.push({ text: code.slice(cursor, match.index), type: 'plain' });
    tokens.push({ text: match[0], type });
    cursor = match.index + match[0].length;
  }

  if (cursor < code.length) tokens.push({ text: code.slice(cursor), type: 'plain' });
  return tokens;
}
