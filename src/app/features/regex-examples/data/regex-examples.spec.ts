import { validateRegex } from '../../../shared/utils/regex-flags';
import { REGEX_EXAMPLES, exampleTestText } from './regex-examples';

describe('REGEX_EXAMPLES', () => {
  it('disponibiliza pelo menos dez exemplos', () => {
    expect(REGEX_EXAMPLES.length).toBeGreaterThanOrEqual(10);
  });

  describe.each(REGEX_EXAMPLES.map((example) => [example.name, example] as const))('%s', (_, example) => {
    it('é uma expressão JavaScript válida', () => {
      expect(validateRegex(example.pattern, example.flags)).toEqual({ valid: true });
    });

    it('aceita os exemplos válidos e rejeita os inválidos', () => {
      const regex = new RegExp(example.pattern, example.flags.replace('g', ''));
      for (const sample of example.validExamples) expect(regex.test(sample), sample).toBe(true);
      for (const sample of example.invalidExamples) expect(regex.test(sample), sample).toBe(false);
    });

    it('destaca apenas as linhas válidas no texto de teste', () => {
      const matches = [...exampleTestText(example).matchAll(new RegExp(example.pattern, example.flags))];
      expect(matches.map((m) => m[0])).toEqual(example.validExamples);
    });
  });
});
