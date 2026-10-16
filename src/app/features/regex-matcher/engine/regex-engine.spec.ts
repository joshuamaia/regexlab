import { executeRegex } from './regex-engine';

const run = (pattern: string, flags: string, text: string, maxMatches = 100) =>
  executeRegex({ pattern, flags, text, maxMatches });

describe('executeRegex', () => {
  const text = 'João nasceu em 15/08/1990.\nMaria nasceu em 22/11/1985.';

  it('encontra todas as correspondências com a flag g', () => {
    const result = run(String.raw`\d{2}/\d{2}/\d{4}`, 'g', text);
    expect(result.status).toBe('success');
    expect(result.matches.map((m) => m.value)).toEqual(['15/08/1990', '22/11/1985']);
    expect(result.matches[0]).toMatchObject({ index: 0, start: 15, end: 25 });
  });

  it('retorna apenas a primeira correspondência sem a flag g', () => {
    const result = run(String.raw`\d{4}`, '', text);
    expect(result.matches.map((m) => m.value)).toEqual(['1990']);
  });

  it('respeita a semântica da flag y (sticky)', () => {
    expect(run('a', 'y', 'baa').matches).toHaveLength(0);
    expect(run('a', 'y', 'aab').matches).toHaveLength(1);
    // Com g + y, a busca para na primeira posição que não corresponde.
    expect(run('a', 'gy', 'aaba').matches.map((m) => m.start)).toEqual([0, 1]);
  });

  it('não entra em laço infinito com correspondências de comprimento zero', () => {
    const result = run('', 'g', 'abc');
    expect(result.matches.map((m) => m.start)).toEqual([0, 1, 2, 3]);
    expect(run('a*', 'g', 'baac').matches.map((m) => m.value)).toEqual(['', 'aa', '', '']);
  });

  it('avança por code point em correspondências vazias no modo unicode', () => {
    const result = run('', 'gu', '😀a');
    expect(result.matches.map((m) => m.start)).toEqual([0, 2, 3]);
  });

  it('captura grupos numerados com valores e posições', () => {
    const [match] = run(String.raw`(\d{2})/(\d{2})/(\d{4})`, 'g', text).matches;
    expect(match.groups).toEqual([
      { index: 1, name: undefined, value: '15', start: 15, end: 17 },
      { index: 2, name: undefined, value: '08', start: 18, end: 20 },
      { index: 3, name: undefined, value: '1990', start: 21, end: 25 },
    ]);
  });

  it('captura grupos nomeados', () => {
    const [match] = run(String.raw`(?<dia>\d{2})/(?<mes>\d{2})/(?<ano>\d{4})`, 'g', text).matches;
    expect(match.groups.map((g) => [g.name, g.value])).toEqual([
      ['dia', '15'],
      ['mes', '08'],
      ['ano', '1990'],
    ]);
  });

  it('indica grupos que não participaram da correspondência', () => {
    const [match] = run('(a)|(b)', 'g', 'b').matches;
    expect(match.groups[0].value).toBeUndefined();
    expect(match.groups[1].value).toBe('b');
  });

  it('retorna lista vazia quando não há correspondências', () => {
    const result = run('xyz', 'g', text);
    expect(result.status).toBe('success');
    expect(result.matches).toEqual([]);
    expect(result.limitReached).toBe(false);
  });

  it('interrompe a coleta ao atingir o limite de correspondências', () => {
    const result = run(String.raw`\d`, 'g', '1234567890', 3);
    expect(result.matches).toHaveLength(3);
    expect(result.limitReached).toBe(true);
    expect(run(String.raw`\d`, 'g', '123', 3).limitReached).toBe(false);
  });

  it('retorna status invalid para expressões inválidas', () => {
    const result = run('(abc', 'g', text);
    expect(result.status).toBe('invalid');
    expect(result.error).toBeTruthy();
  });
});
