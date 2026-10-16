import { Injectable } from '@angular/core';
import { extractCaptureGroupNames } from '../../../shared/utils/regex-groups';

export type CodeLanguage = 'javascript' | 'typescript' | 'java';

export interface CodeNotice {
  readonly severity: 'warning' | 'info';
  readonly message: string;
}

export interface GeneratedCode {
  readonly language: CodeLanguage;
  readonly code: string;
  readonly notices: readonly CodeNotice[];
}

export interface CodeGenerationInput {
  readonly pattern: string;
  readonly flags: string;
  readonly text: string;
}

/** Tamanho máximo do texto de exemplo incluído no código gerado. */
const SAMPLE_TEXT_LIMIT = 300;

/** Letras com significado próprio em escapes do JavaScript. */
const JS_ESCAPE_LETTERS = new Set([...'dDwWsSbBnrtfvcxukpP']);

interface PatternChar {
  readonly char: string;
  readonly index: number;
  readonly escaped: boolean;
  readonly inClass: boolean;
}

@Injectable({ providedIn: 'root' })
export class CodeGeneratorService {
  generate(language: CodeLanguage, input: CodeGenerationInput): GeneratedCode {
    switch (language) {
      case 'javascript':
        return this.generateJavaScript(input, false);
      case 'typescript':
        return this.generateJavaScript(input, true);
      case 'java':
        return this.generateJava(input);
    }
  }

  private generateJavaScript({ pattern, flags, text }: CodeGenerationInput, typed: boolean): GeneratedCode {
    const literal = `/${toJsRegexLiteralBody(pattern)}/${flags}`;
    const sample = JSON.stringify(sampleText(text));
    const groupNames = extractCaptureGroupNames(pattern, flags);
    const hasGroups = groupNames.length > 0;
    const hasNamed = groupNames.some((name) => name !== undefined);
    const type = (annotation: string) => (typed ? `: ${annotation}` : '');

    const report = (indent: string) =>
      [
        `${indent}const start${type('number')} = match.index;`,
        `${indent}const end${type('number')} = start + match[0].length;`,
        `${indent}console.log(\`Correspondência: "\${match[0]}" [\${start}–\${end}]\`);`,
        ...(hasGroups ? [`${indent}console.log('Grupos:', match.slice(1));`] : []),
        ...(hasNamed ? [`${indent}console.log('Grupos nomeados:', match.groups);`] : []),
      ].join('\n');

    const body = flags.includes('g')
      ? [`for (const match of text.matchAll(regex)) {`, report('  '), `}`]
      : [
          `const match${type('RegExpExecArray | null')} = regex.exec(text);`,
          '',
          'if (match) {',
          report('  '),
          '} else {',
          "  console.log('Nenhuma correspondência encontrada.');",
          '}',
        ];

    const code = [`const regex${type('RegExp')} = ${literal};`, `const text${type('string')} = ${sample};`, '', ...body].join('\n');

    const notices: CodeNotice[] = [];
    if (flags.includes('v')) {
      notices.push({ severity: 'info', message: 'A flag "v" requer ES2024 (Node.js 20+ ou navegadores recentes).' });
    }
    return { language: typed ? 'typescript' : 'javascript', code, notices };
  }

  private generateJava({ pattern, flags, text }: CodeGenerationInput): GeneratedCode {
    const notices = javaCompatibilityNotices(pattern, flags);
    const javaFlags = [
      flags.includes('i') && 'Pattern.CASE_INSENSITIVE',
      flags.includes('i') && (flags.includes('u') || flags.includes('v')) && 'Pattern.UNICODE_CASE',
      flags.includes('m') && 'Pattern.MULTILINE',
      flags.includes('s') && 'Pattern.DOTALL',
    ].filter((flag): flag is string => typeof flag === 'string');

    const compileArgs = [toJavaString(pattern), ...(javaFlags.length ? [javaFlags.join(' | ')] : [])].join(', ');
    const groupNames = extractCaptureGroupNames(pattern, flags);
    const javaNamedGroups = groupNames.filter((name): name is string => name !== undefined && isValidJavaGroupName(name));
    const loop = flags.includes('g') ? 'while' : 'if';

    const lines = [
      'import java.util.regex.Matcher;',
      'import java.util.regex.Pattern;',
      '',
      'public class RegexExample {',
      '    public static void main(String[] args) {',
      `        Pattern pattern = Pattern.compile(${compileArgs});`,
      `        String text = ${toJavaString(sampleText(text))};`,
      '        Matcher matcher = pattern.matcher(text);',
      '',
      `        ${loop} (matcher.find()) {`,
      '            System.out.printf("Correspondência: \\"%s\\" [%d-%d]%n", matcher.group(), matcher.start(), matcher.end());',
      ...(groupNames.length > 0
        ? [
            '            for (int i = 1; i <= matcher.groupCount(); i++) {',
            '                System.out.printf("  Grupo %d: %s%n", i, matcher.group(i));',
            '            }',
          ]
        : []),
      ...javaNamedGroups.map(
        (name) => `            System.out.printf("  ${name}: %s%n", matcher.group(${toJavaString(name)}));`,
      ),
      '        }',
      '    }',
      '}',
    ];

    return { language: 'java', code: lines.join('\n'), notices };
  }
}

/** Escapa a expressão para uso como literal `/.../` do JavaScript. */
export function toJsRegexLiteralBody(pattern: string): string {
  if (pattern === '') return '(?:)';
  let body = '';
  for (const { char, escaped, inClass } of scanPattern(pattern)) {
    if (escaped) body += '\\' + escapeLineTerminator(char, true);
    else if (char === '/' && !inClass) body += '\\/';
    else body += escapeLineTerminator(char, false);
  }
  return body;
}

/** Converte um texto em literal de string Java, escapando barras, aspas e caracteres de controle. */
export function toJavaString(value: string): string {
  let result = '"';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === '\\') result += '\\\\';
    else if (char === '"') result += '\\"';
    else if (char === '\n') result += '\\n';
    else if (char === '\r') result += '\\r';
    else if (char === '\t') result += '\\t';
    // Escapes octais evitam o pré-processamento de \\uXXXX do compilador Java.
    else if (code < 0x20 || code === 0x7f) result += '\\' + code.toString(8).padStart(3, '0');
    else result += char;
  }
  return result + '"';
}

function sampleText(text: string): string {
  const chars = Array.from(text);
  return chars.length > SAMPLE_TEXT_LIMIT ? chars.slice(0, SAMPLE_TEXT_LIMIT).join('') : text;
}

function escapeLineTerminator(char: string, afterBackslash: boolean): string {
  const map: Record<string, string> = { '\n': 'n', '\r': 'r', ' ': 'u2028', ' ': 'u2029' };
  const replacement = map[char];
  if (!replacement) return char;
  return afterBackslash ? replacement : '\\' + replacement;
}

/** Percorre a expressão identificando escapes e trechos dentro de classes de caracteres. */
function scanPattern(pattern: string, unicodeSets = false): PatternChar[] {
  const chars: PatternChar[] = [];
  let classDepth = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\' && i + 1 < pattern.length) {
      chars.push({ char: pattern[i + 1], index: i, escaped: true, inClass: classDepth > 0 });
      i++;
      continue;
    }
    const inClass = classDepth > 0;
    if (char === '[' && (!inClass || unicodeSets)) classDepth++;
    else if (char === ']' && inClass) classDepth--;
    chars.push({ char, index: i, escaped: false, inClass });
  }
  return chars;
}

function isValidJavaGroupName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]*$/.test(name);
}

/**
 * Identifica recursos sem equivalente direto em Java ou com semântica diferente.
 * A expressão nunca é convertida automaticamente: apenas os avisos são exibidos.
 */
export function javaCompatibilityNotices(pattern: string, flags: string): CodeNotice[] {
  const warnings = new Set<string>();
  const infos: string[] = [];
  const unicode = flags.includes('u') || flags.includes('v');
  const chars = scanPattern(pattern, flags.includes('v'));

  if (flags.includes('y')) warnings.add('A flag "y" (sticky) não tem equivalente direto em Java e não foi traduzida.');
  if (flags.includes('v')) {
    warnings.add('A flag "v" (Unicode Sets) não existe em Java; operações de conjunto em classes têm sintaxe e semântica diferentes.');
  }
  if (flags.includes('d')) infos.push('Em Java, matcher.start(n) e matcher.end(n) já fornecem os índices dos grupos (flag "d").');

  chars.forEach((current, position) => {
    const { char, escaped, inClass, index } = current;
    if (escaped) {
      if (char === 'u' && pattern[index + 2] === '{' && unicode) {
        warnings.add('A sintaxe \\u{...} não existe em Java (equivalente: \\x{...}); a expressão não foi convertida.');
      } else if (char === '0' && !/\d/.test(pattern[index + 2] ?? '')) {
        warnings.add('"\\0" representa o caractere NUL em JavaScript, mas em Java exige dígitos octais (ex.: \\00).');
      } else if (char === 'v') {
        warnings.add('"\\v" é a tabulação vertical em JavaScript, mas em Java representa qualquer espaço vertical.');
      } else if (char === 's' || char === 'S') {
        warnings.add('"\\s" inclui espaços Unicode em JavaScript; em Java cobre apenas espaços ASCII por padrão.');
      } else if ((char === 'p' || char === 'P') && !unicode) {
        warnings.add(`"\\${char}" é um caractere literal em JavaScript sem a flag "u", mas em Java indica uma propriedade Unicode.`);
      } else if ((char === 'p' || char === 'P') && unicode) {
        const property = /^\{([^}]*)\}/.exec(pattern.slice(index + 2))?.[1] ?? '';
        if (property.includes('=') || property.length > 2) {
          warnings.add(`Nomes de propriedades Unicode podem diferir em Java (ex.: \\p{${property}}).`);
        }
      } else if (/[a-zA-Z]/.test(char) && !JS_ESCAPE_LETTERS.has(char)) {
        warnings.add(`"\\${char}" tem significado diferente (ou é inválido) em Java.`);
      }
      return;
    }

    if (inClass) {
      const previous = chars[position - 1];
      if (char === '[' && !flags.includes('v')) {
        warnings.add('"[" dentro de uma classe é literal em JavaScript, mas em Java inicia uma união de classes.');
      }
      if (char === '&' && previous?.char === '&' && !previous.escaped) {
        warnings.add('"&&" dentro de uma classe é literal em JavaScript, mas em Java indica interseção.');
      }
      return;
    }

    if (char === '[' && (pattern[index + 1] === ']' || pattern.startsWith('^]', index + 1))) {
      warnings.add('As classes "[]" e "[^]" são específicas do JavaScript e não são aceitas em Java.');
    }
    if (char === '$' && !flags.includes('m')) {
      warnings.add('Em Java, "$" também corresponde antes de uma quebra de linha final; em JavaScript, apenas no fim da entrada.');
    }
  });

  for (const name of extractCaptureGroupNames(pattern, flags)) {
    if (name !== undefined && !isValidJavaGroupName(name)) {
      warnings.add(`O nome de grupo "${name}" não é válido em Java (apenas letras ASCII e dígitos, iniciando por letra).`);
    }
  }

  if (hasUnboundedLookbehind(pattern)) {
    warnings.add('Java não aceita lookbehind de comprimento ilimitado (com *, + ou {n,}).');
  }

  return [
    ...[...warnings].map((message) => ({ severity: 'warning' as const, message })),
    ...infos.map((message) => ({ severity: 'info' as const, message })),
  ];
}

function hasUnboundedLookbehind(pattern: string): boolean {
  const chars = scanPattern(pattern);
  const lookbehindDepths: number[] = [];
  let depth = 0;
  for (const { char, escaped, inClass, index } of chars) {
    if (escaped || inClass) continue;
    if (char === '(') {
      depth++;
      if (pattern.startsWith('(?<=', index) || pattern.startsWith('(?<!', index)) lookbehindDepths.push(depth);
    } else if (char === ')') {
      if (lookbehindDepths[lookbehindDepths.length - 1] === depth) lookbehindDepths.pop();
      depth--;
    } else if (lookbehindDepths.length > 0) {
      if (char === '*' || char === '+') return true;
      if (char === '{' && /^\{\d+,\}/.test(pattern.slice(index))) return true;
    }
  }
  return false;
}
