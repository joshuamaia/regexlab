import {
  CaptureGroup,
  RegexExecutionResult,
  RegexMatch,
  RegexWorkerRequest,
} from '../../../core/models/regex.models';
import { extractCaptureGroupNames } from '../../../shared/utils/regex-groups';
import { validateRegex } from '../../../shared/utils/regex-flags';

/**
 * Executa a expressão sobre o texto usando o motor nativo do JavaScript.
 *
 * Função pura, sem dependências do Angular, executada dentro do Web Worker.
 * Respeita a semântica de `g` e `y`, evita laços infinitos em correspondências
 * vazias e interrompe a coleta ao atingir `maxMatches`.
 */
export function executeRegex(request: RegexWorkerRequest): RegexExecutionResult {
  const startedAt = performance.now();
  const { pattern, flags, text, maxMatches } = request;

  const validation = validateRegex(pattern, flags);
  if (!validation.valid) {
    return { status: 'invalid', matches: [], limitReached: false, durationMs: 0, error: validation.error };
  }

  // A flag `d` é adicionada internamente apenas para obter a posição dos grupos;
  // ela não altera quais trechos são encontrados.
  const regex = new RegExp(pattern, flags.includes('d') ? flags : flags + 'd');
  const groupNames = extractCaptureGroupNames(pattern, flags);
  const unicode = regex.unicode || flags.includes('v');
  const matches: RegexMatch[] = [];
  let limitReached = false;

  if (!regex.global) {
    // Sem `g`, o JavaScript retorna somente a primeira correspondência
    // (com `y`, apenas se ela começar exatamente na posição 0).
    const match = regex.exec(text);
    if (match && maxMatches > 0) {
      matches.push(toRegexMatch(match, 0, groupNames));
    }
  } else {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (matches.length >= maxMatches) {
        limitReached = true;
        break;
      }
      matches.push(toRegexMatch(match, matches.length, groupNames));

      if (match[0] === '') {
        // Correspondência vazia: avança manualmente para não repetir a mesma posição.
        regex.lastIndex = advanceIndex(text, regex.lastIndex, unicode);
      }
    }
  }

  return {
    status: 'success',
    matches,
    limitReached,
    durationMs: performance.now() - startedAt,
  };
}

function toRegexMatch(
  match: RegExpExecArray,
  position: number,
  groupNames: readonly (string | undefined)[],
): RegexMatch {
  const groups: CaptureGroup[] = [];
  for (let i = 1; i < match.length; i++) {
    const range = match.indices?.[i];
    groups.push({
      index: i,
      name: groupNames[i - 1],
      value: match[i],
      start: range?.[0],
      end: range?.[1],
    });
  }
  return {
    index: position,
    value: match[0],
    start: match.index,
    end: match.index + match[0].length,
    groups,
  };
}

/** Avança uma posição, respeitando pares substitutos quando o modo Unicode está ativo. */
function advanceIndex(text: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= text.length) {
    return index + 1;
  }
  const code = text.charCodeAt(index);
  const next = text.charCodeAt(index + 1);
  const isSurrogatePair = code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
  return index + (isSurrogatePair ? 2 : 1);
}
