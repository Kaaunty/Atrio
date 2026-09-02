import React from 'react';
import { DailyRowItem } from './TimeClockDailyTable';

export interface PrintableTimeSheetProps {
  employee: {
    name: string;
    registrationNumber?: string;
    department?: string;
    position?: string;
  };
  period: string; // e.g. "09/2026"
  summary: {
    totalExpectedFormatted: string;
    totalActualFormatted: string;
    totalBalanceFormatted: string;
    accumulatedClosingFormatted?: string;
    divergencesCount: number;
  };
  days: DailyRowItem[] | any[];
  companyName?: string;
}

export const PrintableTimeSheet: React.FC<PrintableTimeSheetProps> = ({
  employee,
  period,
  summary,
  days,
  companyName = 'ÁTRIO RH & SERVIÇOS',
}) => {
  return (
    <div className="hidden print:block font-sans text-black p-2 max-w-full mx-auto bg-white">
      {/* Cabeçalho Oficial */}
      <div className="border-b-2 border-black pb-1.5 mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold uppercase tracking-wider text-black">{companyName}</h1>
          <h2 className="text-[10px] font-semibold text-gray-700">ESPELHO DE PONTO / FOLHA DE APURAÇÃO INDIVIDUAL</h2>
        </div>
        <div className="text-right text-[10px]">
          <p className="font-bold">PERÍODO DE APURAÇÃO: {period}</p>
          <p className="text-gray-600">
            Emissão: {new Date().toLocaleDateString('pt-BR')} às{' '}
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Dados do Colaborador */}
      <div className="border border-black p-1.5 mb-2 text-[10px] grid grid-cols-2 gap-1 bg-gray-50/50">
        <div>
          <p>
            <span className="font-bold">COLABORADOR:</span> {employee.name.toUpperCase()}
          </p>
          <p>
            <span className="font-bold">MATRÍCULA:</span> #{employee.registrationNumber || 'N/A'}
          </p>
        </div>
        <div>
          <p>
            <span className="font-bold">DEPARTAMENTO:</span> {employee.department || 'N/A'}
          </p>
          <p>
            <span className="font-bold">CARGO:</span> {employee.position || 'N/A'}
          </p>
        </div>
      </div>

      {/* Resumo Mensal */}
      <div className="grid grid-cols-4 gap-1 border border-black p-1.5 mb-2 text-center text-[10px]">
        <div className="border-r border-gray-300 pr-1">
          <span className="block text-[8px] text-gray-600 font-bold uppercase">Carga Prevista</span>
          <span className="font-bold text-xs">{summary.totalExpectedFormatted}</span>
        </div>
        <div className="border-r border-gray-300 pr-1">
          <span className="block text-[8px] text-gray-600 font-bold uppercase">Horas Realizadas</span>
          <span className="font-bold text-xs">{summary.totalActualFormatted}</span>
        </div>
        <div className="border-r border-gray-300 pr-1">
          <span className="block text-[8px] text-gray-600 font-bold uppercase">Saldo do Mês</span>
          <span className="font-bold text-xs">{summary.totalBalanceFormatted}</span>
        </div>
        <div>
          <span className="block text-[8px] text-gray-600 font-bold uppercase">Banco Acumulado</span>
          <span className="font-bold text-xs">{summary.accumulatedClosingFormatted || '00h 00m'}</span>
        </div>
      </div>

      {/* Tabela de Batidas */}
      <table className="w-full border-collapse border border-black text-[9px] mb-3">
        <thead>
          <tr className="bg-gray-200 border-b border-black text-black">
            <th className="border border-black px-1 py-0.5 text-center">DATA</th>
            <th className="border border-black px-1 py-0.5 text-left">DIA</th>
            <th className="border border-black px-1 py-0.5 text-center">ENTRA 1</th>
            <th className="border border-black px-1 py-0.5 text-center">SAÍDA 1</th>
            <th className="border border-black px-1 py-0.5 text-center">ENTRA 2</th>
            <th className="border border-black px-1 py-0.5 text-center">SAÍDA 2</th>
            <th className="border border-black px-1 py-0.5 text-center">EXTRAS</th>
            <th className="border border-black px-1 py-0.5 text-center">PREV.</th>
            <th className="border border-black px-1 py-0.5 text-center">REAL.</th>
            <th className="border border-black px-1 py-0.5 text-center">SALDO</th>
            <th className="border border-black px-1 py-0.5 text-center">OBS</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className="border-b border-gray-300">
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono font-bold">
                {d.date.split('-').reverse().slice(0, 2).join('/')}
              </td>
              <td className="border border-gray-400 px-1 py-[1px] text-left">{d.dayOfWeekName}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">{d.e1}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">{d.s1}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">{d.e2}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">{d.s2}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">
                {d.extraEntries && d.extraEntries.length > 0 ? d.extraEntries.join(', ') : '---'}
              </td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono">{d.expectedWorkFormatted || d.expectedFormatted || '---'}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono font-bold">{d.actualWorkFormatted || d.actualFormatted || '---'}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center font-mono font-bold">{d.balanceFormatted}</td>
              <td className="border border-gray-400 px-1 py-[1px] text-center text-[8px] text-gray-500">
                {d.status === 'FALTA' ? 'FALTA' : d.status === 'DIVERGENCIA' ? 'ALERTA' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Assinaturas */}
      <div className="pt-3 pb-1 grid grid-cols-2 gap-8 text-center text-[10px] print:break-inside-avoid">
        <div>
          <div className="border-t border-black pt-1 font-bold">
            {employee.name.toUpperCase()}
          </div>
          <p className="text-[9px] text-gray-600">Assinatura do Colaborador</p>
          <p className="text-[9px] text-gray-500 mt-0.5">Data: ____ / ____ / ________</p>
        </div>
        <div>
          <div className="border-t border-black pt-1 font-bold">
            GESTÃO / RECURSOS HUMANOS
          </div>
          <p className="text-[9px] text-gray-600">Assinatura do Responsável</p>
          <p className="text-[9px] text-gray-500 mt-0.5">Data: ____ / ____ / ________</p>
        </div>
      </div>

      {/* Nota de Rodapé */}
      <div className="border-t border-gray-300 pt-1 text-[8px] text-gray-500 text-center">
        Documento gerado eletronicamente em conformidade com as diretrizes do Ministério do Trabalho e Emprego.
      </div>
    </div>
  );
};
