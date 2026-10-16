export interface RegexExample {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly pattern: string;
  readonly flags: string;
  readonly validExamples: readonly string[];
  readonly invalidExamples: readonly string[];
  /** Aviso sobre validações que vão além do formato. */
  readonly note?: string;
}

/** Texto de teste do exemplo: casos válidos seguidos dos inválidos, um por linha. */
export function exampleTestText(example: RegexExample): string {
  return [...example.validExamples, ...example.invalidExamples].join('\n');
}

/**
 * Todas as expressões usam `^` e `$` com a flag `m`, validando cada linha do
 * texto de teste de forma independente.
 */
export const REGEX_EXAMPLES: readonly RegexExample[] = [
  {
    id: 'email',
    name: 'E-mail',
    description: 'Endereços de e-mail no formato usuario@dominio.tld.',
    pattern: String.raw`^[\w.%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$`,
    flags: 'gm',
    validExamples: ['joao.silva@empresa.com.br', 'maria+news@gmail.com', 'dev_123@sub.dominio.io'],
    invalidExamples: ['joao@', '@dominio.com', 'ana@dominio', 'carlos silva@email.com'],
  },
  {
    id: 'cpf',
    name: 'CPF — formato',
    description: 'CPF com ou sem pontuação: 000.000.000-00 ou 00000000000.',
    pattern: String.raw`^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$`,
    flags: 'gm',
    validExamples: ['123.456.789-09', '12345678909'],
    invalidExamples: ['123.456.789-0', '123.456.78-09', 'abc.def.ghi-jk'],
    note: 'Valida apenas o formato. Os dígitos verificadores exigem cálculo adicional fora da Regex.',
  },
  {
    id: 'cnpj',
    name: 'CNPJ — formato',
    description: 'CNPJ numérico ou alfanumérico, com ou sem pontuação: 00.000.000/0000-00.',
    pattern: String.raw`^[A-Z0-9]{2}\.?[A-Z0-9]{3}\.?[A-Z0-9]{3}/?[A-Z0-9]{4}-?\d{2}$`,
    flags: 'gm',
    validExamples: ['12.345.678/0001-95', '12345678000195', '12.ABC.345/01DE-35'],
    invalidExamples: ['12.345.678/0001-9', '12.345.678/0001-AB', '12-345-678/0001-95'],
    note: 'Valida apenas o formato (inclusive o CNPJ alfanumérico). Os dígitos verificadores exigem cálculo adicional.',
  },
  {
    id: 'telefone',
    name: 'Telefone brasileiro',
    description: 'Fixo ou celular com DDD, com ou sem +55, parênteses e hífen.',
    pattern: String.raw`^(?:\+55\s?)?\(?[1-9]{2}\)?\s?(?:9\d{4}|[2-5]\d{3})-?\d{4}$`,
    flags: 'gm',
    validExamples: ['(11) 98765-4321', '+55 21 3456-7890', '11987654321'],
    invalidExamples: ['(11) 8765-432', '(00) 98765-4321', '98765-4321'],
  },
  {
    id: 'cep',
    name: 'CEP',
    description: 'Código postal brasileiro: 00000-000 ou 00000000.',
    pattern: String.raw`^\d{5}-?\d{3}$`,
    flags: 'gm',
    validExamples: ['01310-100', '20040020'],
    invalidExamples: ['1310-100', '01310-10', '01310_100'],
  },
  {
    id: 'data',
    name: 'Data DD/MM/AAAA',
    description: 'Datas com dia de 01 a 31 e mês de 01 a 12, com grupos nomeados.',
    pattern: String.raw`^(?<dia>0[1-9]|[12]\d|3[01])/(?<mes>0[1-9]|1[0-2])/(?<ano>\d{4})$`,
    flags: 'gm',
    validExamples: ['15/08/1990', '31/12/2024', '29/02/2024'],
    invalidExamples: ['32/01/2020', '15/13/2020', '15-08-1990', '1/1/2020'],
    note: 'Valida apenas o formato: datas inexistentes, como 31/02/2023, também são aceitas. Use validação adicional.',
  },
  {
    id: 'horario',
    name: 'Horário HH:mm',
    description: 'Horários de 00:00 a 23:59 no formato 24 horas.',
    pattern: String.raw`^(?:[01]\d|2[0-3]):[0-5]\d$`,
    flags: 'gm',
    validExamples: ['09:30', '23:59', '00:00'],
    invalidExamples: ['24:00', '9:30', '12:60'],
  },
  {
    id: 'numeros',
    name: 'Apenas números',
    description: 'Linhas compostas somente por dígitos.',
    pattern: String.raw`^\d+$`,
    flags: 'gm',
    validExamples: ['12345', '0', '2026'],
    invalidExamples: ['12a45', '3.14', '-10'],
  },
  {
    id: 'letras',
    name: 'Apenas letras',
    description: 'Linhas compostas somente por letras, incluindo acentuadas (propriedade Unicode \\p{L}).',
    pattern: String.raw`^\p{L}+$`,
    flags: 'gmu',
    validExamples: ['RegexLab', 'Conceição', 'ÁRVORE'],
    invalidExamples: ['Joao123', 'Ana Maria', 'olá!'],
  },
  {
    id: 'url',
    name: 'URL HTTP/HTTPS',
    description: 'Endereços web iniciados por http:// ou https://, com porta e caminho opcionais.',
    pattern: String.raw`^https?://(?:[\w-]+\.)+[a-z]{2,}(?::\d{2,5})?(?:/\S*)?$`,
    flags: 'gim',
    validExamples: ['https://angular.dev', 'https://www.exemplo.com.br/busca?q=regex', 'http://api.site.io:8080/v1'],
    invalidExamples: ['ftp://site.com', 'https://', 'www.site.com'],
  },
];
