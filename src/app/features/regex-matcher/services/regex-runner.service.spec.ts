import { TestBed } from '@angular/core/testing';
import { DEFAULT_REGEX_LAB_LIMITS, REGEX_LAB_LIMITS } from '../../../core/config/regex-lab.config';
import { FakeRegexWorker } from '../../../../testing/fake-regex-worker';
import { REGEX_WORKER_FACTORY, RegexRunnerService } from './regex-runner.service';

describe('RegexRunnerService', () => {
  let workers: FakeRegexWorker[];
  let mode: 'run' | 'hang';

  function setup(factory: () => FakeRegexWorker | null = () => {
    const worker = new FakeRegexWorker(mode);
    workers.push(worker);
    return worker;
  }) {
    TestBed.configureTestingModule({
      providers: [
        { provide: REGEX_WORKER_FACTORY, useValue: factory },
        { provide: REGEX_LAB_LIMITS, useValue: { ...DEFAULT_REGEX_LAB_LIMITS, timeoutMs: 50, maxMatches: 2 } },
      ],
    });
    return TestBed.inject(RegexRunnerService);
  }

  beforeEach(() => {
    workers = [];
    mode = 'run';
  });

  it('executa em um worker descartável e o encerra ao concluir', async () => {
    const runner = setup();
    const result = await runner.run({ pattern: String.raw`\d`, flags: 'g', text: 'a1b2c3' });

    expect(result.status).toBe('success');
    expect(result.matches.map((m) => m.value)).toEqual(['1', '2']);
    expect(result.limitReached).toBe(true);
    expect(workers[0].lastRequest?.maxMatches).toBe(2);
    expect(workers[0].terminated).toBe(true);
  });

  it('encerra o worker e retorna timeout quando o processamento demora demais', async () => {
    mode = 'hang';
    const runner = setup();
    const result = await runner.run({ pattern: '(a+)+$', flags: 'g', text: 'a'.repeat(40) + '!' });

    expect(result.status).toBe('timeout');
    expect(result.error).toContain('50 ms');
    expect(workers[0].terminated).toBe(true);
  });

  it('cancela a execução anterior quando uma nova é iniciada', async () => {
    mode = 'hang';
    const runner = setup();
    const first = runner.run({ pattern: 'a', flags: 'g', text: 'a' });
    mode = 'run';
    const second = runner.run({ pattern: 'a', flags: 'g', text: 'aa' });

    expect((await first).status).toBe('cancelled');
    expect(workers[0].terminated).toBe(true);
    expect((await second).matches).toHaveLength(2);
  });

  it('permite cancelar manualmente a execução em andamento', async () => {
    mode = 'hang';
    const runner = setup();
    const pending = runner.run({ pattern: 'a', flags: 'g', text: 'a' });
    runner.cancel();

    expect((await pending).status).toBe('cancelled');
    expect(workers[0].terminated).toBe(true);
  });

  it('informa erro quando Web Workers não são suportados', async () => {
    const runner = setup(() => null);
    const result = await runner.run({ pattern: 'a', flags: 'g', text: 'a' });
    expect(result.status).toBe('error');
  });
});
