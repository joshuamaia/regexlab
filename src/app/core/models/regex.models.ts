/** Flags suportadas pelo motor de expressões regulares do JavaScript. */
export type RegexFlag = 'd' | 'g' | 'i' | 'm' | 's' | 'u' | 'v' | 'y';

/** Ordem canônica das flags, idêntica à de `RegExp.prototype.flags`. */
export const REGEX_FLAG_ORDER: readonly RegexFlag[] = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];

export interface RegexFlagDefinition {
  readonly flag: RegexFlag;
  readonly name: string;
  readonly description: string;
}

/** Estado de entrada de uma execução: expressão, flags e texto. */
export interface RegexInput {
  readonly pattern: string;
  readonly flags: string;
  readonly text: string;
}

export type RegexValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly error: string };

export interface CaptureGroup {
  /** Número do grupo (1, 2, 3...). */
  readonly index: number;
  /** Nome do grupo, quando for um grupo nomeado. */
  readonly name?: string;
  /** Valor capturado; `undefined` quando o grupo não participou da correspondência. */
  readonly value?: string;
  readonly start?: number;
  readonly end?: number;
}

export interface RegexMatch {
  /** Posição da correspondência na lista (base 0). */
  readonly index: number;
  readonly value: string;
  readonly start: number;
  /** Posição final exclusiva. */
  readonly end: number;
  readonly groups: readonly CaptureGroup[];
}

export type RegexExecutionStatus = 'success' | 'invalid' | 'timeout' | 'cancelled' | 'error';

export interface RegexExecutionResult {
  readonly status: RegexExecutionStatus;
  readonly matches: readonly RegexMatch[];
  /** Indica que a busca foi interrompida ao atingir o limite de correspondências. */
  readonly limitReached: boolean;
  readonly durationMs: number;
  readonly error?: string;
}

/** Mensagem enviada ao Web Worker. */
export interface RegexWorkerRequest extends RegexInput {
  readonly maxMatches: number;
}
