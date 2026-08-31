/**
 * Utilitários para tratamento e validação de CNPJ brasileiro.
 */

/**
 * Remove qualquer caractere não numérico do CNPJ.
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata uma string de 14 dígitos no padrão XX.XXX.XXX/XXXX-XX.
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj);
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Valida o CNPJ segundo a regra oficial da Receita Federal (dígitos verificadores).
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;

  const cleaned = cleanCNPJ(cnpj);

  // Deve possuir exatamente 14 dígitos numéricos
  if (cleaned.length !== 14) return false;

  // Rejeita sequências de dígitos todos iguais (ex: 00000000000000, 11111111111111)
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Cálculo do 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cleaned[i], 10) * weights1[i];
  }
  const remainder1 = sum1 % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  if (parseInt(cleaned[12], 10) !== digit1) return false;

  // Cálculo do 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cleaned[i], 10) * weights2[i];
  }
  const remainder2 = sum2 % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  if (parseInt(cleaned[13], 10) !== digit2) return false;

  return true;
}
