/// <reference lib="webworker" />

import { RegexWorkerRequest } from '../../../core/models/regex.models';
import { executeRegex } from './regex-engine';

/**
 * Worker descartável: recebe uma única requisição, responde e é encerrado pelo
 * RegexRunnerService. Se a expressão travar (backtracking catastrófico), apenas
 * esta thread fica ocupada até ser terminada pelo timeout.
 */
addEventListener('message', ({ data }: MessageEvent<RegexWorkerRequest>) => {
  try {
    postMessage(executeRegex(data));
  } catch (error) {
    postMessage({
      status: 'error',
      matches: [],
      limitReached: false,
      durationMs: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
