import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_REGEX_LAB_LIMITS, REGEX_LAB_LIMITS } from './core/config/regex-lab.config';
import { REGEX_WORKER_FACTORY } from './features/regex-matcher/services/regex-runner.service';
import { FakeRegexWorker } from '../testing/fake-regex-worker';
import { App } from './app';

describe('App (atualização reativa da interface)', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;

  /** Aguarda o ciclo completo: efeito → debounce → worker → renderização. */
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await fixture.whenStable();
  };

  const typePattern = async (value: string) => {
    const input = element.querySelector<HTMLInputElement>('#pattern-input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };

  const text = (selector: string) => element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    localStorage.clear();
    window.scrollTo = () => undefined;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: REGEX_WORKER_FACTORY, useValue: () => new FakeRegexWorker() },
        { provide: REGEX_LAB_LIMITS, useValue: { ...DEFAULT_REGEX_LAB_LIMITS, debounceMs: 0, maxMatches: 5 } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement as HTMLElement;
    await settle();
  });

  it('exibe o nome RegexLab no cabeçalho', () => {
    expect(text('app-header .brand-name')).toBe('RegexLab');
  });

  it('processa a expressão inicial automaticamente e destaca as correspondências', () => {
    expect(text('[data-testid=match-count]')).toBe('3 correspondências');
    const marks = [...element.querySelectorAll('mark.match')].map((m) => m.textContent);
    expect(marks).toEqual(['15/08/1990', '22/11/1985', '03/02/2001']);
    expect(element.querySelectorAll('.group')).toHaveLength(9);
  });

  it('atualiza os resultados ao editar a expressão, sem clicar em botões', async () => {
    await typePattern(String.raw`\d{4}`);
    expect(text('[data-testid=match-count]')).toBe('3 correspondências');
    expect([...element.querySelectorAll('mark.match')].map((m) => m.textContent)).toEqual(['1990', '1985', '2001']);

    await typePattern('inexistente');
    expect(element.querySelector('[data-testid=no-matches]')).not.toBeNull();
  });

  it('mostra erro para expressões inválidas sem quebrar a interface', async () => {
    await typePattern('(abc');
    expect(element.querySelector('[data-testid=regex-error]')).not.toBeNull();
    expect(element.querySelector('#pattern-input')?.getAttribute('aria-invalid')).toBe('true');

    await typePattern('abc');
    expect(element.querySelector('[data-testid=regex-error]')).toBeNull();
  });

  it('exibe nomes de grupos nomeados', async () => {
    await typePattern(String.raw`(?<dia>\d{2})/(?<mes>\d{2})/(?<ano>\d{4})`);
    const names = [...element.querySelectorAll('.group-name')].slice(0, 3).map((n) => n.textContent?.trim());
    expect(names).toEqual(['dia #1', 'mes #2', 'ano #3']);
  });

  it('seleciona uma correspondência e exibe seus índices', async () => {
    element.querySelectorAll<HTMLElement>('mark.match')[1].click();
    await settle();
    expect(text('[data-testid=selected-range]')).toBe('#2 · início 43 · fim 53');
    expect(element.querySelector('mark.match.selected')?.textContent).toBe('22/11/1985');
  });

  it('avisa quando o limite de resultados é atingido', async () => {
    await typePattern(String.raw`\d`);
    expect(element.querySelector('[data-testid=limit-warning]')).not.toBeNull();
    expect(text('[data-testid=results-total]')).toBe('5+');
  });

  it('carrega um exemplo pronto no editor e no texto de teste', async () => {
    const tab = [...element.querySelectorAll<HTMLButtonElement>('.tabs button')].find((b) =>
      b.textContent?.includes('Exemplos'),
    )!;
    tab.click();
    await settle();

    element.querySelector<HTMLButtonElement>('[data-testid=example-card] button.use')!.click();
    await settle();

    expect(element.querySelector<HTMLInputElement>('#pattern-input')!.value).toContain('@');
    expect(text('[data-testid=match-count]')).toBe('3 correspondências');
  });

  it('atualiza o código gerado conforme a expressão', async () => {
    const tab = [...element.querySelectorAll<HTMLButtonElement>('.tabs button')].find((b) =>
      b.textContent?.includes('Gerador'),
    )!;
    tab.click();
    await typePattern('a/b');
    expect(text('[data-testid=generated-code]')).toContain(String.raw`/a\/b/g`);
  });
});
