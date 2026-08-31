/**
 * Utilitários para tratamento e validação de CPF brasileiro.
 */

/**
 * Remove qualquer caractere não numérico do CPF.
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata uma string de 11 dígitos no padrão XXX.XXX.XXX-XX.
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Valida o CPF segundo a regra matemática oficial da Receita Federal (dígitos verificadores).
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;

  const cleaned = cleanCPF(cpf);

  // Deve possuir exatamente 11 dígitos numéricos
  if (cleaned.length !== 11) return false;

  // Rejeita sequências de dígitos todos iguais (ex: 00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Cálculo do 1º dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(cleaned[i], 10) * (10 - i);
  }
  const remainder1 = sum1 % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  if (parseInt(cleaned[9], 10) !== digit1) return false;

  // Cálculo do 2º dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(cleaned[i], 10) * (11 - i);
  }
  const remainder2 = sum2 % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  if (parseInt(cleaned[10], 10) !== digit2) return false;

  return true;
}
