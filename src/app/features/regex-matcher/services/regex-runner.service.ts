import { Injectable, InjectionToken, inject } from '@angular/core';
import { REGEX_LAB_LIMITS } from '../../../core/config/regex-lab.config';
import {
  RegexExecutionResult,
  RegexInput,
  RegexWorkerRequest,
} from '../../../core/models/regex.models';

/** Subconjunto da API de `Worker` usado pelo executor (facilita testes). */
export interface RegexWorker {
  onmessage: ((event: MessageEvent<RegexExecutionResult>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: RegexWorkerRequest): void;
  terminate(): void;
}

/** Cria um novo Web Worker de execução ou `null` quando o ambiente não oferece suporte. */
export const REGEX_WORKER_FACTORY = new InjectionToken<() => RegexWorker | null>('REGEX_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () =>
    typeof Worker === 'undefined'
      ? null
      : new Worker(new URL('../engine/regex.worker', import.meta.url), { type: 'module' }),
});

const emptyResult = (status: RegexExecutionResult['status'], error?: string): RegexExecutionResult => ({
  status,
  matches: [],
  limitReached: false,
  durationMs: 0,
  error,
});

/**
 * Executa expressões em Web Workers descartáveis: cada execução usa um worker
 * novo, encerrado ao responder, ao exceder o tempo limite ou ao ser substituído
 * por uma execução mais recente. A thread principal nunca roda a busca.
 */
@Injectable({ providedIn: 'root' })
export class RegexRunnerService {
  private readonly createWorker = inject(REGEX_WORKER_FACTORY);
  private readonly limits = inject(REGEX_LAB_LIMITS);
  private cancelActive: (() => void) | null = null;

  run(input: RegexInput): Promise<RegexExecutionResult> {
    this.cancel();

    const worker = this.createWorker();
    if (!worker) {
      return Promise.resolve(emptyResult('error', 'Este navegador não oferece suporte a Web Workers.'));
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: RegexExecutionResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate();
        if (this.cancelActive === cancel) this.cancelActive = null;
        resolve(result);
      };
      const cancel = () => finish(emptyResult('cancelled'));

      const timer = setTimeout(
        () =>
          finish(
            emptyResult(
              'timeout',
              `O processamento excedeu ${this.limits.timeoutMs} ms e foi interrompido. ` +
                'A expressão pode causar backtracking excessivo.',
            ),
          ),
        this.limits.timeoutMs,
      );

      worker.onmessage = (event) => finish(event.data);
      worker.onerror = (event) => {
        event.preventDefault?.();
        finish(emptyResult('error', event.message || 'Falha inesperada no processamento.'));
      };

      this.cancelActive = cancel;
      worker.postMessage({ ...input, maxMatches: this.limits.maxMatches });
    });
  }

  /** Encerra a execução em andamento, se houver. */
  cancel(): void {
    this.cancelActive?.();
  }
}
