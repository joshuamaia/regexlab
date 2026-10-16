import { Injectable, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { REGEX_LAB_LIMITS } from '../config/regex-lab.config';
import { RegexExecutionResult, RegexFlag, RegexInput, RegexMatch } from '../models/regex.models';
import { RegexRunnerService } from '../../features/regex-matcher/services/regex-runner.service';
import { normalizeFlags, toggleFlag, validateRegex } from '../../shared/utils/regex-flags';

export const DEFAULT_PATTERN = String.raw`(\d{2})/(\d{2})/(\d{4})`;
export const DEFAULT_FLAGS = 'g';
export const DEFAULT_TEXT = [
  'João nasceu em 15/08/1990.',
  'Maria nasceu em 22/11/1985.',
  'Carlos nasceu em 03/02/2001.',
].join('\n');

/**
 * Estado central do laboratório. Componentes leem os sinais e chamam os métodos
 * de mutação; o processamento é disparado automaticamente (com debounce) sempre
 * que a expressão, as flags ou o texto mudam.
 */
@Injectable({ providedIn: 'root' })
export class RegexLabStore {
  private readonly runner = inject(RegexRunnerService);
  readonly limits = inject(REGEX_LAB_LIMITS);

  readonly pattern = signal(DEFAULT_PATTERN);
  readonly flags = signal(DEFAULT_FLAGS);
  readonly text = signal(DEFAULT_TEXT);

  readonly input = computed<RegexInput>(() => ({
    pattern: this.pattern(),
    flags: this.flags(),
    text: this.text(),
  }));

  readonly validation = computed(() => validateRegex(this.pattern(), this.flags()));
  readonly textTooLong = computed(() => this.text().length > this.limits.maxTextLength);

  readonly processing = signal(false);
  readonly result = signal<RegexExecutionResult | null>(null);
  /** Entrada que produziu o resultado atual (usada para detectar destaques desatualizados). */
  readonly resultInput = signal<RegexInput | null>(null);

  readonly matches = computed<readonly RegexMatch[]>(() => this.result()?.matches ?? []);
  readonly matchCount = computed(() => this.matches().length);

  /** Correspondência selecionada; volta a `null` sempre que os resultados mudam. */
  readonly selectedIndex = linkedSignal<readonly RegexMatch[], number | null>({
    source: this.matches,
    computation: () => null,
  });
  readonly selectedMatch = computed(() => {
    const index = this.selectedIndex();
    return index === null ? null : (this.matches()[index] ?? null);
  });

  /** Mensagem de erro exibida ao usuário, seja de sintaxe, limite ou execução. */
  readonly errorMessage = computed(() => {
    const validation = this.validation();
    if (!validation.valid) return validation.error;
    if (this.textTooLong()) {
      return `O texto excede o limite de ${this.limits.maxTextLength.toLocaleString('pt-BR')} caracteres.`;
    }
    const result = this.result();
    return result && (result.status === 'timeout' || result.status === 'error') ? (result.error ?? null) : null;
  });

  constructor() {
    effect((onCleanup) => {
      const input = this.input();

      if (!this.validation().valid || this.textTooLong()) {
        this.runner.cancel();
        this.processing.set(false);
        this.result.set(null);
        this.resultInput.set(null);
        return;
      }

      this.processing.set(true);
      const timer = setTimeout(() => this.execute(input), this.limits.debounceMs);
      onCleanup(() => clearTimeout(timer));
    });
  }

  setPattern(pattern: string): void {
    this.pattern.set(pattern);
  }

  setText(text: string): void {
    this.text.set(text);
  }

  toggleFlag(flag: RegexFlag): void {
    this.flags.update((flags) => toggleFlag(flags, flag));
  }

  clearPattern(): void {
    this.pattern.set('');
  }

  selectMatch(index: number | null): void {
    this.selectedIndex.set(index === this.selectedIndex() ? null : index);
  }

  /** Carrega uma expressão completa (exemplos e favoritos). */
  load(preset: { pattern: string; flags: string; text?: string }): void {
    this.pattern.set(preset.pattern);
    this.flags.set(normalizeFlags(preset.flags));
    if (preset.text !== undefined) {
      this.text.set(preset.text);
    }
  }

  private async execute(input: RegexInput): Promise<void> {
    const result = await this.runner.run(input);
    // Execuções substituídas por outra mais recente são ignoradas.
    if (result.status === 'cancelled') return;
    this.result.set(result);
    this.resultInput.set(input);
    this.processing.set(false);
  }
}
