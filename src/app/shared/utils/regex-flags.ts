import {
  REGEX_FLAG_ORDER,
  RegexFlag,
  RegexFlagDefinition,
  RegexValidation,
} from '../../core/models/regex.models';

export const REGEX_FLAGS: readonly RegexFlagDefinition[] = [
  { flag: 'g', name: 'Global', description: 'Encontra todas as correspondências, não apenas a primeira.' },
  { flag: 'i', name: 'Ignorar maiúsculas', description: 'Ignora a diferença entre maiúsculas e minúsculas.' },
  { flag: 'm', name: 'Multilinha', description: '^ e $ passam a corresponder ao início e ao fim de cada linha.' },
  { flag: 's', name: 'DotAll', description: 'O ponto (.) também corresponde a quebras de linha.' },
  { flag: 'u', name: 'Unicode', description: 'Trata a expressão como sequência de code points Unicode.' },
  { flag: 'y', name: 'Sticky', description: 'Busca apenas a partir da posição exata de lastIndex.' },
  { flag: 'd', name: 'Índices', description: 'Gera os índices inicial e final de cada grupo capturado.' },
  { flag: 'v', name: 'Unicode Sets', description: 'Modo Unicode estendido, com operações de conjuntos em classes.' },
];

export function isRegexFlag(value: string): value is RegexFlag {
  return (REGEX_FLAG_ORDER as readonly string[]).includes(value);
}

/** Remove duplicatas e caracteres desconhecidos, ordenando as flags de forma canônica. */
export function normalizeFlags(flags: string): string {
  return REGEX_FLAG_ORDER.filter((flag) => flags.includes(flag)).join('');
}

/** Liga ou desliga uma flag, garantindo que `u` e `v` nunca fiquem ativas ao mesmo tempo. */
export function toggleFlag(flags: string, flag: RegexFlag): string {
  if (flags.includes(flag)) {
    return normalizeFlags(flags.replace(flag, ''));
  }
  const exclusive = flag === 'u' ? 'v' : flag === 'v' ? 'u' : null;
  const base = exclusive ? flags.replace(exclusive, '') : flags;
  return normalizeFlags(base + flag);
}

/** Verifica se o navegador atual reconhece a flag (ex.: `v` exige motores recentes). */
export function isFlagSupported(flag: RegexFlag): boolean {
  try {
    new RegExp('', flag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida sintaticamente a expressão. Apenas compila o RegExp — nenhuma busca é
 * executada, por isso é seguro chamar na thread principal.
 */
export function validateRegex(pattern: string, flags: string): RegexValidation {
  const unknown = [...flags].filter((flag) => !isRegexFlag(flag));
  if (unknown.length > 0) {
    return { valid: false, error: `Flag desconhecida: ${unknown.join(', ')}.` };
  }
  if (new Set(flags).size !== flags.length) {
    return { valid: false, error: 'Flags duplicadas não são permitidas.' };
  }
  if (flags.includes('u') && flags.includes('v')) {
    return { valid: false, error: 'As flags "u" e "v" não podem ser ativadas simultaneamente.' };
  }
  try {
    new RegExp(pattern, flags);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}
