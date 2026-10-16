import { buildHighlightSegments } from './highlight-segments';
import { executeRegex } from './regex-engine';

describe('buildHighlightSegments', () => {
  const segmentsFor = (pattern: string, text: string) =>
    buildHighlightSegments(text, executeRegex({ pattern, flags: 'g', text, maxMatches: 100 }).matches);

  it('divide o texto sem alterá-lo', () => {
    const text = 'a 12 b 34';
    const segments = segmentsFor(String.raw`\d+`, text);
    expect(segments).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'match', text: '12', matchIndex: 0 },
      { kind: 'text', text: ' b ' },
      { kind: 'match', text: '34', matchIndex: 1 },
    ]);
    expect(segments.map((s) => ('text' in s ? s.text : '')).join('')).toBe(text);
  });

  it('representa correspondências vazias como marcadores', () => {
    expect(segmentsFor('^', 'ab')).toEqual([
      { kind: 'empty', matchIndex: 0 },
      { kind: 'text', text: 'ab' },
    ]);
  });

  it('mantém o texto como texto puro, inclusive marcações HTML', () => {
    const segments = segmentsFor('<b>', '<b>x</b>');
    expect(segments[0]).toEqual({ kind: 'match', text: '<b>', matchIndex: 0 });
  });
});
