import { normalizeFlags, toggleFlag, validateRegex } from './regex-flags';

describe('validateRegex', () => {
  it('aceita expressões válidas', () => {
    expect(validateRegex(String.raw`(\d{2})/(\d{2})/(\d{4})`, 'g')).toEqual({ valid: true });
    expect(validateRegex(String.raw`(?<dia>\d{2})`, 'gimsd')).toEqual({ valid: true });
    expect(validateRegex('', '')).toEqual({ valid: true });
  });

  it('rejeita expressões inválidas com mensagem de erro', () => {
    for (const pattern of ['(abc', '[a-', '*a', 'a{2,1}', '(?<nome>a)(?<nome>b)']) {
      const result = validateRegex(pattern, 'g');
      expect(result.valid).toBe(false);
      expect(!result.valid && result.error.length).toBeGreaterThan(0);
    }
  });

  it('rejeita a combinação das flags u e v', () => {
    const result = validateRegex('a', 'uv');
    expect(result).toEqual({ valid: false, error: expect.stringContaining('"u" e "v"') });
  });

  it('rejeita flags desconhecidas ou duplicadas', () => {
    expect(validateRegex('a', 'gx').valid).toBe(false);
    expect(validateRegex('a', 'gg').valid).toBe(false);
  });
});

describe('toggleFlag', () => {
  it('liga e desliga flags mantendo a ordem canônica', () => {
    expect(toggleFlag('g', 'i')).toBe('gi');
    expect(toggleFlag('gi', 'd')).toBe('dgi');
    expect(toggleFlag('dgi', 'g')).toBe('di');
  });

  it('desativa u ao ativar v (e vice-versa)', () => {
    expect(toggleFlag('gu', 'v')).toBe('gv');
    expect(toggleFlag('gv', 'u')).toBe('gu');
  });
});

describe('normalizeFlags', () => {
  it('remove duplicatas e caracteres inválidos', () => {
    expect(normalizeFlags('yigxg')).toBe('giy');
  });
});
