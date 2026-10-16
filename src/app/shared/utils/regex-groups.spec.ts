import { extractCaptureGroupNames } from './regex-groups';

describe('extractCaptureGroupNames', () => {
  it('lista grupos numerados e nomeados na ordem de abertura', () => {
    expect(extractCaptureGroupNames(String.raw`(?<dia>\d{2})/(\d{2})/(?<ano>(\d{2})\d{2})`)).toEqual([
      'dia',
      undefined,
      'ano',
      undefined,
    ]);
  });

  it('ignora grupos sem captura, lookarounds, escapes e classes', () => {
    expect(extractCaptureGroupNames(String.raw`(?:a)(?=b)(?!c)(?<=d)(?<!e)\(x\)[(]`)).toEqual([]);
  });

  it('respeita classes aninhadas no modo v', () => {
    expect(extractCaptureGroupNames(String.raw`[[(]--[a]](x)`, 'v')).toEqual([undefined]);
  });
});
