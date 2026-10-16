import { RegexExecutionResult, RegexWorkerRequest } from '../app/core/models/regex.models';
import { executeRegex } from '../app/features/regex-matcher/engine/regex-engine';
import { RegexWorker } from '../app/features/regex-matcher/services/regex-runner.service';

/**
 * Worker falso para testes. No modo `run`, executa o motor real de forma
 * assíncrona; no modo `hang`, nunca responde (simula backtracking catastrófico).
 */
export class FakeRegexWorker implements RegexWorker {
  onmessage: ((event: MessageEvent<RegexExecutionResult>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  lastRequest?: RegexWorkerRequest;

  constructor(private readonly mode: 'run' | 'hang' = 'run') {}

  postMessage(request: RegexWorkerRequest): void {
    this.lastRequest = request;
    if (this.mode === 'hang') return;
    queueMicrotask(() => {
      if (!this.terminated) {
        this.onmessage?.({ data: executeRegex(request) } as MessageEvent<RegexExecutionResult>);
      }
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}
