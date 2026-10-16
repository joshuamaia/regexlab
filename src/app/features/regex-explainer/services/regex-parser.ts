export type RegexTokenKind =
  | 'literal'
  | 'escape'
  | 'charClass'
  | 'anchor'
  | 'quantifier'
  | 'group'
  | 'alternation'
  | 'backreference'
  | 'dot'
  | 'unknown';

export interface RegexExplanationNode {
  /** Trecho original da expressão. */
  readonly token: string;
  readonly description: string;
  readonly kind: RegexTokenKind;
  readonly start: number;
  readonly end: number;
  readonly children: readonly RegexExplanationNode[];
}

export const UNKNOWN_DESCRIPTION = 'Explicação ainda não disponível para esta construção.';

const NUMBER_WORDS = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];

const SIMPLE_ESCAPES: Record<string, { description: string; kind: RegexTokenKind }> = {
  d: { description: 'Corresponde a um dígito (0–9)', kind: 'escape' },
  D: { description: 'Qualquer caractere que não seja dígito', kind: 'escape' },
  w: { description: 'Caractere de palavra (letra, dígito ou _)', kind: 'escape' },
  W: { description: 'Qualquer caractere que não seja de palavra', kind: 'escape' },
  s: { description: 'Espaço em branco (espaço, tabulação, quebra de linha…)', kind: 'escape' },
  S: { description: 'Qualquer caractere que não seja espaço em branco', kind: 'escape' },
  b: { description: 'Limite de palavra', kind: 'anchor' },
  B: { description: 'Posição que não é limite de palavra', kind: 'anchor' },
  n: { description: 'Quebra de linha (LF)', kind: 'escape' },
  r: { description: 'Retorno de carro (CR)', kind: 'escape' },
  t: { description: 'Tabulação', kind: 'escape' },
  f: { description: 'Avanço de página', kind: 'escape' },
  v: { description: 'Tabulação vertical', kind: 'escape' },
};

/** Descrições curtas usadas dentro de classes de caracteres. */
const CLASS_ESCAPES: Record<string, string> = {
  d: 'dígitos',
  D: 'não dígitos',
  w: 'caracteres de palavra',
  W: 'caracteres que não são de palavra',
  s: 'espaços em branco',
  S: 'caracteres que não são espaço em branco',
  n: 'quebra de linha',
  r: 'retorno de carro',
  t: 'tabulação',
  f: 'avanço de página',
  v: 'tabulação vertical',
  b: 'backspace',
};

const UNICODE_PROPERTIES: Record<string, string> = {
  L: 'letra',
  Letter: 'letra',
  Lu: 'letra maiúscula',
  Ll: 'letra minúscula',
  N: 'número',
  Nd: 'dígito decimal',
  P: 'pontuação',
  S: 'símbolo',
  Z: 'separador',
  Emoji: 'emoji',
  Alphabetic: 'caractere alfabético',
  White_Space: 'espaço em branco',
};

interface ClassItem {
  readonly description: string;
  /** Caractere único representado pelo item (usado para montar intervalos). */
  readonly char?: string;
}

/**
 * Analisador estrutural de expressões regulares do JavaScript voltado à
 * explicação. Não é um parser completo: construções não reconhecidas viram
 * nós do tipo `unknown`, com uma descrição neutra.
 */
export class RegexParser {
  private pos = 0;
  private groupCount = 0;
  private readonly unicode: boolean;
  private readonly unicodeSets: boolean;

  constructor(
    private readonly source: string,
    private readonly flags = '',
  ) {
    this.unicode = flags.includes('u') || flags.includes('v');
    this.unicodeSets = flags.includes('v');
  }

  parse(): RegexExplanationNode[] {
    this.pos = 0;
    this.groupCount = 0;
    return this.parseSequence(false);
  }

  private parseSequence(insideGroup: boolean): RegexExplanationNode[] {
    const nodes: RegexExplanationNode[] = [];

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === ')') {
        if (insideGroup) break;
        nodes.push(this.node(this.pos, this.pos + 1, 'unknown', 'Parêntese de fechamento sem grupo correspondente'));
        this.pos++;
        continue;
      }

      switch (char) {
        case '(':
          nodes.push(this.parseGroup());
          break;
        case '[':
          nodes.push(this.parseClass());
          break;
        case '\\':
          nodes.push(this.parseEscape());
          break;
        case '|':
          nodes.push(this.node(this.pos, ++this.pos, 'alternation', 'Alternância: corresponde ao que está à esquerda OU à direita'));
          break;
        case '.':
          nodes.push(
            this.node(
              this.pos,
              ++this.pos,
              'dot',
              this.flags.includes('s')
                ? 'Qualquer caractere, inclusive quebras de linha (flag s)'
                : 'Qualquer caractere, exceto quebras de linha',
            ),
          );
          break;
        case '^':
          nodes.push(this.node(this.pos, ++this.pos, 'anchor', this.flags.includes('m') ? 'Início de cada linha (flag m)' : 'Início da entrada'));
          break;
        case '$':
          nodes.push(this.node(this.pos, ++this.pos, 'anchor', this.flags.includes('m') ? 'Final de cada linha (flag m)' : 'Final da entrada'));
          break;
        case '*':
        case '+':
        case '?':
          nodes.push(this.parseQuantifier(nodes[nodes.length - 1]));
          break;
        case '{': {
          const quantifier = /^\{(\d+)(,(\d*))?\}/.exec(this.source.slice(this.pos));
          nodes.push(quantifier ? this.parseQuantifier(nodes[nodes.length - 1]) : this.literal());
          break;
        }
        default:
          nodes.push(this.literal());
      }
    }

    return mergeLiterals(nodes);
  }

  private literal(): RegexExplanationNode {
    const start = this.pos;
    const char = String.fromCodePoint(this.source.codePointAt(this.pos) ?? 0);
    this.pos += char.length;
    return this.node(start, this.pos, 'literal', describeLiteral(char));
  }

  private parseQuantifier(previous: RegexExplanationNode | undefined): RegexExplanationNode {
    const start = this.pos;
    const rest = this.source.slice(this.pos);
    let description: string;

    const braces = /^\{(\d+)(,(\d*))?\}/.exec(rest);
    if (braces) {
      const min = Number(braces[1]);
      const hasComma = braces[2] !== undefined;
      const max = braces[3] ? Number(braces[3]) : null;
      if (!hasComma) description = `Exatamente ${occurrences(min)}`;
      else if (max === null) description = `${capitalize(countWord(min))} ou mais ocorrências`;
      else description = `Entre ${countWord(min)} e ${occurrences(max)}`;
      this.pos += braces[0].length;
    } else {
      const char = this.source[this.pos++];
      description = char === '*' ? 'Zero ou mais ocorrências' : char === '+' ? 'Uma ou mais ocorrências' : 'Zero ou uma ocorrência (opcional)';
    }

    if (this.source[this.pos] === '?') {
      this.pos++;
      description += ' — modo preguiçoso (o mínimo possível)';
    }

    const quantifiable = previous && previous.kind !== 'alternation' && previous.kind !== 'quantifier' && previous.kind !== 'anchor';
    if (!quantifiable) {
      return this.node(start, this.pos, 'unknown', 'Quantificador sem elemento anterior válido');
    }
    return this.node(start, this.pos, 'quantifier', `${description} do elemento anterior`);
  }

  private parseGroup(): RegexExplanationNode {
    const start = this.pos;
    const rest = this.source.slice(this.pos);
    let kind: RegexTokenKind = 'group';
    let description: string;

    const named = /^\(\?<([^>=!][^>]*)>/.exec(rest);
    const modifiers = /^\(\?([ims]*)(?:-([ims]+))?:/.exec(rest);

    if (named) {
      this.groupCount++;
      description = `Grupo de captura nomeado "${named[1]}" (#${this.groupCount})`;
      this.pos += named[0].length;
    } else if (rest.startsWith('(?:')) {
      description = 'Grupo sem captura';
      this.pos += 3;
    } else if (rest.startsWith('(?=')) {
      description = 'Lookahead positivo: exige que o trecho seguinte corresponda, sem consumi-lo';
      this.pos += 3;
    } else if (rest.startsWith('(?!')) {
      description = 'Lookahead negativo: exige que o trecho seguinte NÃO corresponda';
      this.pos += 3;
    } else if (rest.startsWith('(?<=')) {
      description = 'Lookbehind positivo: exige que o trecho anterior corresponda';
      this.pos += 4;
    } else if (rest.startsWith('(?<!')) {
      description = 'Lookbehind negativo: exige que o trecho anterior NÃO corresponda';
      this.pos += 4;
    } else if (modifiers && (modifiers[1] || modifiers[2])) {
      const enabled = modifiers[1] ? `ativa ${[...modifiers[1]].join(', ')}` : '';
      const disabled = modifiers[2] ? `desativa ${[...modifiers[2]].join(', ')}` : '';
      description = `Grupo com modificadores de flags: ${[enabled, disabled].filter(Boolean).join(' e ')}`;
      this.pos += modifiers[0].length;
    } else if (rest.startsWith('(?')) {
      kind = 'unknown';
      description = UNKNOWN_DESCRIPTION;
      this.pos += 2;
    } else {
      this.groupCount++;
      description = `Grupo de captura #${this.groupCount}`;
      this.pos += 1;
    }

    const children = this.parseSequence(true);

    if (this.source[this.pos] === ')') {
      this.pos++;
    } else {
      kind = 'unknown';
      description = 'Grupo não finalizado: falta o ")" de fechamento';
    }

    return { ...this.node(start, this.pos, kind, description), children };
  }

  private parseEscape(): RegexExplanationNode {
    const start = this.pos;
    const next = this.source[this.pos + 1];

    if (next === undefined) {
      this.pos++;
      return this.node(start, this.pos, 'unknown', 'Barra invertida no final da expressão');
    }

    const simple = SIMPLE_ESCAPES[next];
    if (simple) {
      this.pos += 2;
      return this.node(start, this.pos, simple.kind, simple.description);
    }

    const rest = this.source.slice(this.pos);
    let match: RegExpExecArray | null;

    if ((match = /^\\([1-9]\d*)/.exec(rest))) {
      this.pos += match[0].length;
      return this.node(start, this.pos, 'backreference', `Referência ao grupo #${match[1]}: repete o texto capturado por ele`);
    }
    if ((match = /^\\k<([^>]+)>/.exec(rest))) {
      this.pos += match[0].length;
      return this.node(start, this.pos, 'backreference', `Referência ao grupo nomeado "${match[1]}"`);
    }

    const codeUnit = this.readCodeEscape(rest);
    if (codeUnit) {
      this.pos += codeUnit.length;
      return this.node(start, this.pos, 'escape', codeUnit.description);
    }

    if (this.unicode && (match = /^\\([pP])\{([^}]+)\}/.exec(rest))) {
      this.pos += match[0].length;
      const property = describeUnicodeProperty(match[2]);
      const description =
        match[1] === 'p' ? `Caractere com a propriedade Unicode ${property}` : `Caractere SEM a propriedade Unicode ${property}`;
      return this.node(start, this.pos, 'escape', description);
    }

    const char = String.fromCodePoint(this.source.codePointAt(this.pos + 1) ?? 0);
    this.pos += 1 + char.length;
    return this.node(start, this.pos, 'escape', `Caractere literal "${char}" (escapado)`);
  }

  /** Escapes que representam um único caractere: \0, \xHH, \uHHHH, \u{...}, \cX. */
  private readCodeEscape(rest: string): { length: number; description: string; char: string } | null {
    let match: RegExpExecArray | null;
    if (/^\\0(?!\d)/.test(rest)) {
      return { length: 2, description: 'Caractere nulo (NUL)', char: '\0' };
    }
    if ((match = /^\\x([0-9a-fA-F]{2})/.exec(rest))) {
      return codePointEscape(match[0].length, parseInt(match[1], 16));
    }
    if (this.unicode && (match = /^\\u\{([0-9a-fA-F]+)\}/.exec(rest))) {
      return codePointEscape(match[0].length, parseInt(match[1], 16));
    }
    if ((match = /^\\u([0-9a-fA-F]{4})/.exec(rest))) {
      return codePointEscape(match[0].length, parseInt(match[1], 16));
    }
    if ((match = /^\\c([a-zA-Z])/.exec(rest))) {
      const letter = match[1].toUpperCase();
      return { length: 3, description: `Caractere de controle Ctrl+${letter}`, char: String.fromCharCode(letter.charCodeAt(0) % 32) };
    }
    return null;
  }

  private parseClass(): RegexExplanationNode {
    const start = this.pos;
    const end = this.findClassEnd(start);

    if (end === -1) {
      this.pos = this.source.length;
      return this.node(start, this.pos, 'unknown', 'Classe de caracteres não finalizada: falta o "]"');
    }

    this.pos = end + 1;
    const body = this.source.slice(start + 1, end);
    const negated = body.startsWith('^');
    const content = negated ? body.slice(1) : body;

    if (this.unicodeSets && /\[|--|&&|\\q\{/.test(content)) {
      return this.node(start, this.pos, 'charClass', 'Classe de caracteres com operações de conjuntos (flag v)');
    }
    if (content === '') {
      return this.node(
        start,
        this.pos,
        'charClass',
        negated ? 'Qualquer caractere, inclusive quebras de linha' : 'Classe vazia: nunca corresponde',
      );
    }

    const items = this.parseClassItems(content);
    const list = items.map((item) => item.description);
    const description =
      negated
        ? `Qualquer caractere exceto: ${list.join(', ')}`
        : list.length === 1
          ? capitalize(list[0])
          : `Um caractere entre: ${list.join(', ')}`;
    return this.node(start, this.pos, 'charClass', description);
  }

  /** Localiza o "]" que fecha a classe iniciada em `start`, respeitando escapes. */
  private findClassEnd(start: number): number {
    let depth = 0;
    for (let i = start; i < this.source.length; i++) {
      const char = this.source[i];
      if (char === '\\') {
        i++;
      } else if (char === '[' && (i === start || this.unicodeSets)) {
        depth++;
      } else if (char === ']') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  private parseClassItems(content: string): ClassItem[] {
    const items: ClassItem[] = [];
    let i = 0;

    const readAtom = (): ClassItem => {
      if (content[i] !== '\\') {
        const char = String.fromCodePoint(content.codePointAt(i) ?? 0);
        i += char.length;
        return { description: `"${char}"`, char };
      }
      const rest = content.slice(i);
      const code = this.readCodeEscape(rest);
      if (code) {
        i += code.length;
        return { description: code.description.charAt(0).toLowerCase() + code.description.slice(1), char: code.char };
      }
      const property = this.unicode ? /^\\([pP])\{([^}]+)\}/.exec(rest) : null;
      if (property) {
        i += property[0].length;
        const name = describeUnicodeProperty(property[2]);
        return { description: property[1] === 'p' ? `caracteres com a propriedade ${name}` : `caracteres sem a propriedade ${name}` };
      }
      const escaped = content[i + 1] ?? '\\';
      i += 2;
      const known = CLASS_ESCAPES[escaped];
      if (known) {
        const single = { n: '\n', r: '\r', t: '\t', f: '\f', v: '\v', b: '\b' }[escaped];
        return { description: known, char: single };
      }
      return { description: `"${escaped}"`, char: escaped };
    };

    while (i < content.length) {
      const from = readAtom();
      if (content[i] === '-' && i + 1 < content.length && from.char !== undefined) {
        const save = i;
        i++;
        const to = readAtom();
        if (to.char !== undefined) {
          items.push({ description: describeRange(from.char, to.char) });
          continue;
        }
        i = save;
      }
      items.push(from);
    }
    return items;
  }

  private node(start: number, end: number, kind: RegexTokenKind, description: string): RegexExplanationNode {
    return { token: this.source.slice(start, end), description, kind, start, end, children: [] };
  }
}

/** Agrupa caracteres literais consecutivos, preservando o último quando há um quantificador logo após. */
function mergeLiterals(nodes: RegexExplanationNode[]): RegexExplanationNode[] {
  const result: RegexExplanationNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const previous = result[result.length - 1];
    const canMerge =
      node.kind === 'literal' && previous?.kind === 'literal' && nodes[i + 1]?.kind !== 'quantifier';

    if (canMerge) {
      const token = previous.token + node.token;
      result[result.length - 1] = { ...previous, token, end: node.end, description: `Texto literal "${token}"` };
    } else {
      result.push(node);
    }
  }
  return result;
}

function describeLiteral(char: string): string {
  if (char === ' ') return 'Caractere de espaço';
  return `Caractere literal "${char}"`;
}

function describeRange(from: string, to: string): string {
  if (/^[a-z]$/.test(from) && /^[a-z]$/.test(to)) return `letras minúsculas de ${from} até ${to}`;
  if (/^[A-Z]$/.test(from) && /^[A-Z]$/.test(to)) return `letras maiúsculas de ${from} até ${to}`;
  if (/^\d$/.test(from) && /^\d$/.test(to)) return `dígitos de ${from} a ${to}`;
  return `caracteres de "${printable(from)}" até "${printable(to)}"`;
}

function describeUnicodeProperty(property: string): string {
  const [name, value] = property.split('=');
  if (value !== undefined) {
    if (name === 'Script' || name === 'sc') return `do alfabeto/escrita "${value}"`;
    return `"${name}" = "${value}"`;
  }
  const known = UNICODE_PROPERTIES[name];
  return known ? `"${name}" (${known})` : `"${name}"`;
}

function codePointEscape(length: number, code: number): { length: number; description: string; char: string } {
  const char = String.fromCodePoint(code);
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  return { length, description: `Caractere Unicode U+${hex} ("${printable(char)}")`, char };
}

function printable(char: string): string {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : char;
}

function countWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

function occurrences(value: number): string {
  return `${countWord(value)} ${value === 1 ? 'ocorrência' : 'ocorrências'}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
