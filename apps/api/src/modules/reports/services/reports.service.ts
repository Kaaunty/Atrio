import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../../../database/prisma';
import { BaseReportFilterDto, MonthlyMirrorPdfDto } from '../report.dto';

export class ReportsService {
  /**
   * Helper para formatar CSV com UTF-8 BOM
   */
  private static generateCsvBuffer(headers: string[], rows: (string | number)[][]): Buffer {
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    return Buffer.concat([Buffer.from('\uFEFF', 'utf-8'), Buffer.from(csvContent, 'utf-8')]);
  }

  /**
   * Helper para gerar planilha Excel formatada (.xlsx) usando ExcelJS
   */
  private static async generateXlsxBuffer(
    sheetName: string,
    headers: string[],
    rows: (string | number)[][]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Cabeçalho estilizado
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }, // Navy Átrio
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Dados
    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    // Largura automática das colunas
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      column.width = Math.min(maxLen + 4, 40);
    });

    const uint8array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8array);
  }

  /**
   * Helper para gerar relatório simples em PDF usando PDFKit
   */
  private static generatePdfBuffer(
    title: string,
    headers: string[],
    rows: (string | number)[][]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Cabeçalho Institucional Átrio
      doc.fillColor('#0F172A').fontSize(16).text('ÁTRIO RH DIGITAL — RELATÓRIO CORPORATIVO', { align: 'center' });
      doc.fillColor('#0D9488').fontSize(12).text(title.toUpperCase(), { align: 'center' });
      doc.moveDown(1);

      doc.fillColor('#64748B').fontSize(9).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown(1);

      // Tabela de Dados Simples
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold');
      doc.text(headers.join('  |  '));
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8);

      rows.forEach((row) => {
        doc.text(row.join('  |  '));
      });

      doc.end();
    });
  }

  /**
   * 1. Relatório de Colaboradores
   */
  static async exportEmployees(filters: BaseReportFilterDto) {
    const where: any = { deletedAt: null };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.departmentId) where.departmentId = filters.departmentId;

    const employees = await prisma.employee.findMany({
      where,
      include: {
        company: { select: { tradeName: true } },
        department: { select: { name: true } },
        position: { select: { title: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Matrícula', 'Nome Completo', 'CPF', 'E-mail', 'Empresa', 'Departamento', 'Cargo', 'Contrato', 'Admissão', 'Status'];
    const rows = employees.map((e) => [
      e.registrationNumber,
      e.name,
      e.cpf,
      e.email,
      e.company?.tradeName || '—',
      e.department?.name || '—',
      e.position?.title || '—',
      e.contractType,
      e.admissionDate.toISOString().split('T')[0],
      e.status,
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'relatorio_colaboradores.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Relatório Cadastral de Colaboradores', headers, rows);
      return { buffer: pdf, filename: 'relatorio_colaboradores.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Colaboradores', headers, rows);
    return { buffer: xlsx, filename: 'relatorio_colaboradores.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 2. Relatório de Espelho de Ponto & Banco de Horas
   */
  static async exportTimeClockSummary(filters: BaseReportFilterDto) {
    const where: any = {};
    if (filters.departmentId) where.employee = { departmentId: filters.departmentId };
    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const summaries = await prisma.timeDailySummary.findMany({
      where,
      include: {
        employee: { select: { registrationNumber: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
    });

    const headers = ['Data', 'Matrícula', 'Colaborador', 'Departamento', 'Previsto (min)', 'Realizado (min)', 'Saldo (min)', 'H. Extras (min)', 'Atrasos (min)', 'Faltas (min)', 'Status'];
    const rows = summaries.map((s) => [
      s.date.toISOString().split('T')[0],
      s.employee.registrationNumber,
      s.employee.name,
      s.employee.department?.name || '—',
      s.expectedWorkMinutes,
      s.actualWorkMinutes,
      s.balanceMinutes,
      s.extraHoursMinutes,
      s.delayMinutes,
      s.absenceMinutes,
      s.status,
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'espelho_ponto_banco_horas.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Espelho de Ponto e Banco de Horas', headers, rows);
      return { buffer: pdf, filename: 'espelho_ponto_banco_horas.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Ponto e Banco de Horas', headers, rows);
    return { buffer: xlsx, filename: 'espelho_ponto_banco_horas.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 3. Relatório de Divergências de Ponto
   */
  static async exportDivergences(filters: BaseReportFilterDto) {
    const where: any = {
      status: 'FALTA',
    };
    if (filters.departmentId) where.employee = { departmentId: filters.departmentId };

    const divergences = await prisma.timeDailySummary.findMany({
      where,
      include: {
        employee: { select: { registrationNumber: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    const headers = ['Data', 'Matrícula', 'Colaborador', 'Departamento', 'Horas Faltantes (min)', 'Status'];
    const rows = divergences.map((d) => [
      d.date.toISOString().split('T')[0],
      d.employee.registrationNumber,
      d.employee.name,
      d.employee.department?.name || '—',
      d.absenceMinutes,
      d.status,
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'divergencias_ponto.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Relatório de Divergências de Ponto', headers, rows);
      return { buffer: pdf, filename: 'divergencias_ponto.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Divergências', headers, rows);
    return { buffer: xlsx, filename: 'divergencias_ponto.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 4. Relatório de Férias e Vencimentos
   */
  static async exportVacations(filters: BaseReportFilterDto) {
    const periods = await prisma.vacationPeriod.findMany({
      include: {
        employee: { select: { registrationNumber: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: { deadlineDate: 'asc' },
    });

    const headers = ['Matrícula', 'Colaborador', 'Departamento', 'Início Aquisitivo', 'Fim Aquisitivo', 'Limite Concessivo', 'Dias Adquiridos', 'Dias Usados', 'Dias Restantes', 'Status'];
    const rows = periods.map((p) => [
      p.employee.registrationNumber,
      p.employee.name,
      p.employee.department?.name || '—',
      p.vestingStartDate.toISOString().split('T')[0],
      p.vestingEndDate.toISOString().split('T')[0],
      p.deadlineDate.toISOString().split('T')[0],
      p.daysEntitled,
      p.daysTaken,
      p.daysRemaining,
      p.status,
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'relatorio_ferias.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Relatório de Férias e Vencimentos', headers, rows);
      return { buffer: pdf, filename: 'relatorio_ferias.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Férias', headers, rows);
    return { buffer: xlsx, filename: 'relatorio_ferias.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 5. Relatório de Absenteísmo e Atestados
   */
  static async exportAbsenteeism(filters: BaseReportFilterDto) {
    const certificates = await prisma.medicalCertificate.findMany({
      include: {
        employee: { select: { registrationNumber: true, name: true, department: { select: { name: true } } } },
      },
      orderBy: { startDate: 'desc' },
    });

    const headers = ['Matrícula', 'Colaborador', 'Departamento', 'Categoria', 'Início', 'Término', 'Dias Abono', 'Status'];
    const rows = certificates.map((c) => [
      c.employee.registrationNumber,
      c.employee.name,
      c.employee.department?.name || '—',
      c.reasonCategory,
      c.startDate.toISOString().split('T')[0],
      c.endDate.toISOString().split('T')[0],
      c.daysCount,
      c.status,
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'relatorio_absenteismo_atestados.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Relatório de Absenteísmo e Atestados', headers, rows);
      return { buffer: pdf, filename: 'relatorio_absenteismo_atestados.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Absenteísmo e Atestados', headers, rows);
    return { buffer: xlsx, filename: 'relatorio_absenteismo_atestados.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 6. Relatório de Solicitações e SLA
   */
  static async exportRequestsSLA(filters: BaseReportFilterDto) {
    const requests = await prisma.request.findMany({
      include: {
        requester: { select: { name: true, registrationNumber: true } },
        requestType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Número', 'Solicitante', 'Tipo de Solicitação', 'Prioridade', 'Status', 'Data de Abertura', 'Data de Encerramento'];
    const rows = requests.map((r) => [
      r.requestNumber,
      r.requester.name,
      r.requestType.name,
      r.priority,
      r.status,
      r.createdAt.toISOString().split('T')[0],
      r.closedAt ? r.closedAt.toISOString().split('T')[0] : 'Em Aberto',
    ]);

    if (filters.format === 'CSV') {
      return { buffer: this.generateCsvBuffer(headers, rows), filename: 'relatorio_solicitacoes_sla.csv', contentType: 'text/csv' };
    }
    if (filters.format === 'PDF') {
      const pdf = await this.generatePdfBuffer('Relatório de Solicitações e SLA', headers, rows);
      return { buffer: pdf, filename: 'relatorio_solicitacoes_sla.pdf', contentType: 'application/pdf' };
    }

    const xlsx = await this.generateXlsxBuffer('Solicitações e SLA', headers, rows);
    return { buffer: xlsx, filename: 'relatorio_solicitacoes_sla.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  /**
   * 7. Espelho Mensal em PDF Formatado para Assinatura
   */
  static async generateMonthlyMirrorPdf(dto: MonthlyMirrorPdfDto): Promise<{ buffer: Buffer; filename: string }> {
    const employee = await prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: {
        company: true,
        department: true,
        position: true,
      },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado.');
    }

    const [year, month] = dto.yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const summaries = await prisma.timeDailySummary.findMany({
      where: {
        employeeId: dto.employeeId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), filename: `espelho_ponto_${employee.registrationNumber}_${dto.yearMonth}.pdf` }));
      doc.on('error', (err) => reject(err));

      // Cabeçalho da Empresa
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text(employee.company?.legalName || 'ÁTRIO TECNOLOGIA E SERVIÇOS S.A.');
      doc.fontSize(9).font('Helvetica').text(`CNPJ: ${employee.company?.cnpj || '00.000.000/0001-00'}`);
      doc.moveDown(0.5);

      doc.fillColor('#0D9488').fontSize(12).font('Helvetica-Bold').text(`ESPELHO MENSAL DE PONTO — MÊS DE REFERÊNCIA: ${dto.yearMonth}`);
      doc.moveDown(0.5);

      // Dados do Colaborador
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica');
      doc.text(`Colaborador: ${employee.name}   |   Matrícula: ${employee.registrationNumber}   |   CPF: ${employee.cpf}`);
      doc.text(`Departamento: ${employee.department?.name || '—'}   |   Cargo: ${employee.position?.title || '—'}   |   Contrato: ${employee.contractType}`);
      doc.moveDown(1);

      // Tabela de Batidas Diárias
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('Data          | Previsto | Realizado | Saldo   | H. Extras | Atrasos | Status');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8);

      let totalBalance = 0;
      let totalExtra = 0;
      let totalDelay = 0;

      summaries.forEach((s) => {
        totalBalance += s.balanceMinutes;
        totalExtra += s.extraHoursMinutes;
        totalDelay += s.delayMinutes;

        const dateStr = s.date.toISOString().split('T')[0];
        doc.text(`${dateStr} | ${s.expectedWorkMinutes}m       | ${s.actualWorkMinutes}m        | ${s.balanceMinutes}m     | ${s.extraHoursMinutes}m       | ${s.delayMinutes}m     | ${s.status}`);
      });

      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`TOTALIZADORES: Saldo Acumulado: ${totalBalance}m  |  Total H. Extras: ${totalExtra}m  |  Total Atrasos: ${totalDelay}m`);
      doc.moveDown(3);

      // Termo de Declaração & Campo de Assinatura
      doc.font('Helvetica').fontSize(8).text('Reconheço a exatidão das marcações registradas neste espelho mensal de ponto.', { align: 'center' });
      doc.moveDown(2);

      const y = doc.y;
      doc.lineCap('butt').moveTo(50, y).lineTo(250, y).stroke();
      doc.moveTo(320, y).lineTo(520, y).stroke();

      doc.moveDown(0.5);
      doc.fontSize(8).text('Assinatura do Colaborador', 50, y + 5);
      doc.fontSize(8).text('Assinatura do Gestor / RH', 320, y + 5);

      doc.end();
    });
  }
}
