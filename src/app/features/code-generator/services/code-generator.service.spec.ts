import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService, javaCompatibilityNotices, toJavaString, toJsRegexLiteralBody } from './code-generator.service';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;
  const input = { pattern: String.raw`(\d{2})/(\d{2})/(\d{4})`, flags: 'g', text: 'Em 15/08/1990.' };

  beforeEach(() => (service = TestBed.inject(CodeGeneratorService)));

  it('gera JavaScript com literal RegExp e escape da barra', () => {
    const { code, notices } = service.generate('javascript', input);
    expect(code).toContain(String.raw`const regex = /(\d{2})\/(\d{2})\/(\d{4})/g;`);
    expect(code).toContain('text.matchAll(regex)');
    expect(notices).toEqual([]);
  });

  it('gera código JavaScript que realmente funciona', () => {
    const { code } = service.generate('javascript', input);
    const logs: unknown[][] = [];
    new Function('console', code)({ log: (...args: unknown[]) => logs.push(args) });
    expect(logs[0][0]).toBe('Correspondência: "15/08/1990" [3–13]');
    expect(logs[1]).toEqual(['Grupos:', ['15', '08', '1990']]);
  });

  it('usa exec quando a flag g não está ativa', () => {
    const { code } = service.generate('javascript', { ...input, flags: 'i' });
    expect(code).toContain('regex.exec(text)');
    expect(code).not.toContain('matchAll');
  });

  it('gera TypeScript com anotações de tipo', () => {
    const { code } = service.generate('typescript', { ...input, flags: '' });
    expect(code).toContain('const regex: RegExp =');
    expect(code).toContain('const match: RegExpExecArray | null = regex.exec(text);');
  });

  it('gera Java com Pattern, Matcher, escapes dobrados e flags equivalentes', () => {
    const { code } = service.generate('java', { ...input, flags: 'gim' });
    expect(code).toContain(
      String.raw`Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);`,
    );
    expect(code).toContain('Matcher matcher = pattern.matcher(text);');
    expect(code).toContain('while (matcher.find())');
  });

  it('inclui grupos nomeados no código Java', () => {
    const { code } = service.generate('java', { ...input, pattern: String.raw`(?<ano>\d{4})` });
    expect(code).toContain('matcher.group("ano")');
  });

  it('avisa sobre recursos sem equivalente em Java sem traduzi-los', () => {
    const { code, notices } = service.generate('java', { pattern: String.raw`\u{1F600}`, flags: 'uy', text: '' });
    expect(code).toContain(String.raw`Pattern.compile("\\u{1F600}")`);
    const messages = notices.map((n) => n.message).join('\n');
    expect(messages).toContain('"y"');
    expect(messages).toContain('\\u{...}');
    expect(notices.every((n) => n.severity === 'warning')).toBe(true);
  });
});

describe('escapes por linguagem', () => {
  it('escapa barras fora de classes no literal JavaScript', () => {
    expect(toJsRegexLiteralBody('a/b[/]')).toBe(String.raw`a\/b[/]`);
    expect(toJsRegexLiteralBody(String.raw`a\/b`)).toBe(String.raw`a\/b`);
    expect(toJsRegexLiteralBody('')).toBe('(?:)');
  });

  it('produz literais equivalentes à expressão original', () => {
    for (const pattern of ['a/b', String.raw`[/]\d+`, String.raw`\\/`]) {
      const literal = new Function(`return /${toJsRegexLiteralBody(pattern)}/;`)() as RegExp;
      expect(literal.source).toBe(new RegExp(pattern).source);
    }
  });

  it('escapa barras invertidas, aspas e quebras de linha em strings Java', () => {
    expect(toJavaString(String.raw`"\d"` + '\n')).toBe(String.raw`"\"\\d\"\n"`);
    expect(toJavaString('\u0001')).toBe(String.raw`"\001"`);
  });

  it('detecta incompatibilidades comuns com Java', () => {
    const messages = (pattern: string, flags = '') => javaCompatibilityNotices(pattern, flags).map((n) => n.message);
    expect(messages('(?<=a+)b')).toEqual([expect.stringContaining('lookbehind')]);
    expect(messages('(?<meu_grupo>a)')).toEqual([expect.stringContaining('meu_grupo')]);
    expect(messages('[^]')).toEqual([expect.stringContaining('[^]')]);
    expect(messages(String.raw`(\d{2})/(\d{2})`)).toEqual([]);
  });
});
