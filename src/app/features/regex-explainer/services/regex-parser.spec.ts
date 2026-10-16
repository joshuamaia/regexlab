import { RegexExplanationNode, RegexParser, UNKNOWN_DESCRIPTION } from './regex-parser';

const explain = (pattern: string, flags = '') => new RegexParser(pattern, flags).parse();
const summary = (nodes: readonly RegexExplanationNode[]) => nodes.map((n) => [n.token, n.kind]);

describe('RegexParser', () => {
  it.each([
    [String.raw`\d`, 'Corresponde a um dígito (0–9)'],
    [String.raw`\w`, 'Caractere de palavra (letra, dígito ou _)'],
    [String.raw`\s`, 'Espaço em branco (espaço, tabulação, quebra de linha…)'],
    [String.raw`\b`, 'Limite de palavra'],
    ['^', 'Início da entrada'],
    ['$', 'Final da entrada'],
    ['[a-z]', 'Letras minúsculas de a até z'],
    ['.', 'Qualquer caractere, exceto quebras de linha'],
  ])('explica %s', (token, description) => {
    const [node] = explain(token);
    expect(node.token).toBe(token);
    expect(node.description).toBe(description);
  });

  it.each([
    ['a+', 'Uma ou mais ocorrências do elemento anterior'],
    ['a*', 'Zero ou mais ocorrências do elemento anterior'],
    ['a?', 'Zero ou uma ocorrência (opcional) do elemento anterior'],
    ['a{2,5}', 'Entre duas e cinco ocorrências do elemento anterior'],
    ['a{3}', 'Exatamente três ocorrências do elemento anterior'],
    ['a{2,}', 'Duas ou mais ocorrências do elemento anterior'],
    ['a+?', 'Uma ou mais ocorrências — modo preguiçoso (o mínimo possível) do elemento anterior'],
  ])('explica o quantificador em %s', (pattern, description) => {
    const nodes = explain(pattern);
    expect(nodes[1]).toMatchObject({ kind: 'quantifier', description });
  });

  it('explica os tipos de grupo com seus filhos', () => {
    const nodes = explain(String.raw`(\d)(?:a)(?<ano>b)(?=c)(?!d)(?<=e)(?<!f)`);
    expect(nodes.map((n) => n.description)).toEqual([
      'Grupo de captura #1',
      'Grupo sem captura',
      'Grupo de captura nomeado "ano" (#2)',
      'Lookahead positivo: exige que o trecho seguinte corresponda, sem consumi-lo',
      'Lookahead negativo: exige que o trecho seguinte NÃO corresponda',
      'Lookbehind positivo: exige que o trecho anterior corresponda',
      'Lookbehind negativo: exige que o trecho anterior NÃO corresponda',
    ]);
    expect(summary(nodes[0].children)).toEqual([[String.raw`\d`, 'escape']]);
  });

  it('respeita escapes em vez de interpretá-los como metacaracteres', () => {
    expect(summary(explain(String.raw`\(\d\)\.`))).toEqual([
      [String.raw`\(`, 'escape'],
      [String.raw`\d`, 'escape'],
      [String.raw`\)`, 'escape'],
      [String.raw`\.`, 'escape'],
    ]);
  });

  it('não interpreta metacaracteres dentro de classes', () => {
    const nodes = explain('[(+*)]x');
    expect(summary(nodes)).toEqual([
      ['[(+*)]', 'charClass'],
      ['x', 'literal'],
    ]);
    expect(nodes[0].description).toBe('Um caractere entre: "(", "+", "*", ")"');
  });

  it('descreve classes negadas e com vários itens', () => {
    expect(explain(String.raw`[^0-9A-Z_\s]`)[0].description).toBe(
      'Qualquer caractere exceto: dígitos de 0 a 9, letras maiúsculas de A até Z, "_", espaços em branco',
    );
  });

  it('agrupa literais sem incluir o caractere quantificado', () => {
    expect(summary(explain('abc+'))).toEqual([
      ['ab', 'literal'],
      ['c', 'literal'],
      ['+', 'quantifier'],
    ]);
  });

  it('considera as flags m e s nas descrições', () => {
    expect(explain('^', 'm')[0].description).toContain('cada linha');
    expect(explain('.', 's')[0].description).toContain('inclusive quebras de linha');
  });

  it('explica alternância e referências', () => {
    expect(summary(explain(String.raw`(a)|\1\k<x>`))).toEqual([
      ['(a)', 'group'],
      ['|', 'alternation'],
      [String.raw`\1`, 'backreference'],
      [String.raw`\k<x>`, 'backreference'],
    ]);
  });

  it('indica de forma neutra construções não reconhecidas', () => {
    const [node] = explain('(?#comentário)');
    expect(node.kind).toBe('unknown');
    expect(node.description).toBe(UNKNOWN_DESCRIPTION);
  });

  it('sinaliza grupos e classes não finalizados sem lançar exceções', () => {
    expect(explain('(abc')[0].kind).toBe('unknown');
    expect(explain('[abc')[0].kind).toBe('unknown');
  });
});
