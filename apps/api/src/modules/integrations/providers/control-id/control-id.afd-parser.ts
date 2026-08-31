import { TimeClockSource } from '@prisma/client';
import { RawPunchRecord } from '../../interfaces/integration-provider.interface.js';

export interface AfdHeader {
  nsr: string;
  type: string;
  identifierType: 'CNPJ' | 'CPF';
  identifier: string;
  cei?: string;
  companyName: string;
  repSerialNumber: string;
  startDate?: string;
  endDate?: string;
  generationDate?: string;
}

export interface AfdParseResult {
  header?: AfdHeader;
  records: RawPunchRecord[];
  totalLines: number;
  validPunches: number;
  ignoredLines: number;
}

export class ControlIdAfdParser {
  /**
   * Realiza o parse completo de um arquivo AFD texto (Portaria 1510 / Portaria 671)
   */
  static parse(content: string): AfdParseResult {
    if (!content || typeof content !== 'string') {
      return { records: [], totalLines: 0, validPunches: 0, ignoredLines: 0 };
    }

    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const records: RawPunchRecord[] = [];
    let header: AfdHeader | undefined;
    let ignoredLines = 0;

    for (const line of lines) {
      // Registro Tipo 1: Cabeçalho
      if (line.length >= 10 && line[9] === '1') {
        try {
          header = this.parseHeaderLine(line);
        } catch {
          // Mantém cabeçalho vazio se falhar parse estrito
        }
        continue;
      }

      // Registro Tipo 3: Marcação de Ponto
      // Padrão Portaria 1510: 9 dígitos NSR + '3' + 8 dígitos Data (DDMMAAAA) + 4 dígitos Hora (HHMM) + PIS/Matrícula
      if (line.length >= 23 && line[9] === '3') {
        const punch = this.parseType3Line(line);
        if (punch) {
          records.push(punch);
          continue;
        }
      }

      // Suporte a formato Portaria 671 REP-P / REP-A com timestamp estendido ou delimitado
      const relaxedPunch = this.tryRelaxedParse(line);
      if (relaxedPunch) {
        records.push(relaxedPunch);
      } else {
        ignoredLines++;
      }
    }

    return {
      header,
      records,
      totalLines: lines.length,
      validPunches: records.length,
      ignoredLines,
    };
  }

  /**
   * Parse do Cabeçalho (Tipo 1)
   */
  private static parseHeaderLine(line: string): AfdHeader {
    const nsr = line.substring(0, 9);
    const type = line.substring(9, 10);
    const idTypeDigit = line.substring(10, 11);
    const identifier = line.substring(11, 25).trim();
    const cei = line.length >= 37 ? line.substring(25, 37).trim() : undefined;
    
    let companyName = '';
    let repSerialNumber = '';

    if (line.length >= 204) {
      companyName = line.substring(37, 187).trim();
      repSerialNumber = line.substring(187, 204).trim();
    } else if (line.length >= 37) {
      companyName = line.substring(37).trim();
    }

    return {
      nsr,
      type,
      identifierType: idTypeDigit === '1' ? 'CNPJ' : 'CPF',
      identifier,
      cei: cei || undefined,
      companyName,
      repSerialNumber,
    };
  }

  /**
   * Parse do Registro Tipo 3 (Marcação de Ponto Padrão Portaria 1510/671)
   * Formato: [NSR 9][Tipo '3'][Data 8 DDMMAAAA][Hora 4 HHMM][PIS/Matrícula ...]
   */
  private static parseType3Line(line: string): RawPunchRecord | null {
    try {
      const nsrStr = line.substring(0, 9);
      const day = parseInt(line.substring(10, 12), 10);
      const month = parseInt(line.substring(12, 14), 10) - 1; // 0-indexed JS month
      const year = parseInt(line.substring(14, 18), 10);
      const hour = parseInt(line.substring(18, 20), 10);
      const minute = parseInt(line.substring(20, 22), 10);
      const second = line.length >= 24 && !isNaN(parseInt(line.substring(22, 24), 10)) && line.length >= 34
        ? parseInt(line.substring(22, 24), 10)
        : 0;

      const rawPisOrReg = line.length >= 34 ? line.substring(22, 34) : line.substring(22);
      const cleanReg = rawPisOrReg.replace(/^0+/, '') || rawPisOrReg;

      const timestamp = new Date(Date.UTC(year, month, day, hour, minute, second));

      if (isNaN(timestamp.getTime())) {
        return null;
      }

      return {
        nsr: nsrStr && !isNaN(Number(nsrStr)) ? BigInt(nsrStr) : null,
        registrationNumber: cleanReg.trim(),
        timestamp,
        source: TimeClockSource.CONTROL_ID_AFD,
        rawPayload: {
          rawLine: line,
          parsedNsr: nsrStr,
          rawPis: rawPisOrReg,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Tentativa de parse para formatos simplificados ou CSV (ex: Matrícula;Data;Hora ou Matrícula,ISO_DateTime)
   */
  private static tryRelaxedParse(line: string): RawPunchRecord | null {
    // Ex: "001;2024-06-01T08:00:00Z" ou "MAT-001;2024-06-01;08:00"
    if (line.includes(';') || line.includes(',')) {
      const parts = line.split(/[;,]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const regNumber = parts[0];
        const datePart = parts[1];
        const timePart = parts[2] || '';

        let dt: Date;
        if (timePart) {
          dt = new Date(`${datePart}T${timePart}:00`);
        } else {
          dt = new Date(datePart);
        }

        if (!isNaN(dt.getTime()) && regNumber) {
          return {
            registrationNumber: regNumber,
            timestamp: dt,
            source: TimeClockSource.CONTROL_ID_AFD,
            rawPayload: { rawLine: line },
          };
        }
      }
    }
    return null;
  }
}
