import { prisma } from '../../../database/prisma.js';
import { CreateWorkScheduleInput, ScheduleRuleDay, UpdateWorkScheduleInput } from '../time-clock.dto.js';

export const DEFAULT_STANDARD_44H_RULES: ScheduleRuleDay[] = [
  { dayOfWeek: 0, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] }, // Domingo
  {
    dayOfWeek: 1,
    isWorkDay: true,
    expectedWorkMinutes: 528, // 8h48m
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:48' },
    ],
  },
  {
    dayOfWeek: 2,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:48' },
    ],
  },
  {
    dayOfWeek: 3,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:48' },
    ],
  },
  {
    dayOfWeek: 4,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:48' },
    ],
  },
  {
    dayOfWeek: 5,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:48' },
    ],
  },
  { dayOfWeek: 6, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] }, // Sábado
];

export class WorkScheduleService {
  /**
   * Listagem de todas as escalas cadastradas
   */
  static async list() {
    const schedules = await prisma.workSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employees: { where: { deletedAt: null } } },
        },
      },
    });

    return schedules;
  }

  /**
   * Busca detalhes de uma escala específica
   */
  static async getById(id: string) {
    const schedule = await prisma.workSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        employees: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
      },
    });

    if (!schedule) {
      const error: any = new Error('Escala de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return schedule;
  }

  /**
   * Criação de nova escala de trabalho
   */
  static async create(data: CreateWorkScheduleInput) {
    const schedule = await prisma.workSchedule.create({
      data: {
        name: data.name,
        description: data.description,
        weeklyHours: data.weeklyHours,
        toleranceMinutes: data.toleranceMinutes,
        lunchIntervalMinutes: data.lunchIntervalMinutes,
        flexibleInterval: data.flexibleInterval,
        scheduleRules: data.scheduleRules as any,
        active: data.active ?? true,
      },
    });

    return schedule;
  }

  /**
   * Atualização de escala
   */
  static async update(id: string, data: UpdateWorkScheduleInput) {
    const current = await prisma.workSchedule.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      const error: any = new Error('Escala de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.workSchedule.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.weeklyHours !== undefined ? { weeklyHours: data.weeklyHours } : {}),
        ...(data.toleranceMinutes !== undefined ? { toleranceMinutes: data.toleranceMinutes } : {}),
        ...(data.lunchIntervalMinutes !== undefined ? { lunchIntervalMinutes: data.lunchIntervalMinutes } : {}),
        ...(data.flexibleInterval !== undefined ? { flexibleInterval: data.flexibleInterval } : {}),
        ...(data.scheduleRules !== undefined ? { scheduleRules: data.scheduleRules as any } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return updated;
  }

  /**
   * Exclusão lógica da escala
   */
  static async delete(id: string) {
    const current = await prisma.workSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { employees: { where: { deletedAt: null } } },
        },
      },
    });

    if (!current) {
      const error: any = new Error('Escala de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (current._count.employees > 0) {
      const error: any = new Error(
        `Não é possível excluir esta escala pois existem ${current._count.employees} colaborador(es) vinculados a ela`
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.workSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    return { success: true, message: 'Escala de trabalho excluída com sucesso' };
  }

  /**
   * Obtém a escala de trabalho associada ao colaborador (ou default se não configurada)
   */
  static async getScheduleForEmployee(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { workSchedule: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (employee.workSchedule && employee.workSchedule.active && !employee.workSchedule.deletedAt) {
      return employee.workSchedule;
    }

    // Retorna escala padrão 44h caso o colaborador não possua escala customizada vinculada
    return {
      id: 'default-44h',
      name: 'Padrão Administrativo 44h (Seg-Sex)',
      description: 'Escala padrão institucional de 44 horas semanais',
      weeklyHours: 44,
      toleranceMinutes: 10,
      lunchIntervalMinutes: 60,
      flexibleInterval: true,
      scheduleRules: DEFAULT_STANDARD_44H_RULES as any,
      active: true,
    };
  }
}
