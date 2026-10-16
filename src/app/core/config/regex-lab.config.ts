import { InjectionToken } from '@angular/core';

/** Limites de processamento aplicados às expressões fornecidas pelo usuário. */
export interface RegexLabLimits {
  /** Tamanho máximo do texto de teste, em caracteres. */
  readonly maxTextLength: number;
  /** Quantidade máxima de correspondências coletadas e renderizadas. */
  readonly maxMatches: number;
  /** Tempo máximo de execução no Web Worker antes do encerramento forçado. */
  readonly timeoutMs: number;
  /** Intervalo de espera após a digitação antes de processar. */
  readonly debounceMs: number;
}

export const DEFAULT_REGEX_LAB_LIMITS: RegexLabLimits = {
  maxTextLength: 50_000,
  maxMatches: 500,
  timeoutMs: 1_500,
  debounceMs: 200,
};

export const REGEX_LAB_LIMITS = new InjectionToken<RegexLabLimits>('REGEX_LAB_LIMITS', {
  providedIn: 'root',
  factory: () => DEFAULT_REGEX_LAB_LIMITS,
});
