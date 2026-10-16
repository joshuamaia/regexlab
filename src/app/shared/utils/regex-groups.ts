/**
 * Percorre a expressão e retorna, na ordem de abertura, o nome de cada grupo de
 * captura (`undefined` para grupos numerados). Escapes e classes de caracteres
 * são respeitados para não confundir `\(` ou `[(]` com grupos.
 *
 * O resultado é indexado a partir de 0: `names[0]` corresponde ao grupo 1.
 */
export function extractCaptureGroupNames(pattern: string, flags = ''): (string | undefined)[] {
  const names: (string | undefined)[] = [];
  const unicodeSets = flags.includes('v');
  let classDepth = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '\\') {
      i++;
      continue;
    }
    if (classDepth > 0) {
      if (char === ']') classDepth--;
      else if (char === '[' && unicodeSets) classDepth++;
      continue;
    }
    if (char === '[') {
      classDepth = 1;
      continue;
    }
    if (char !== '(') continue;

    if (pattern[i + 1] !== '?') {
      names.push(undefined);
      continue;
    }
    const named = /^\(\?<([^>=!][^>]*)>/.exec(pattern.slice(i));
    if (named) {
      names.push(named[1]);
    }
  }
  return names;
}
