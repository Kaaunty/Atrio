import { prisma } from '../../../database/prisma.js';
import {
  CreateCipaMemberInput,
  UpdateCipaMemberInput,
  CreateCipaMeetingInput,
  UpdateCipaMeetingInput,
} from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

export class CipaService {
  // ----- Membros -----

  static async listMembers(activeOnly?: boolean) {
    return prisma.cipaMember.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { termStart: 'desc' },
      include: {
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  static async getMemberById(id: string) {
    const member = await prisma.cipaMember.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
    if (!member) notFound('Membro da CIPA não encontrado');
    return member;
  }

  static async createMember(data: CreateCipaMemberInput) {
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) notFound('Colaborador não encontrado');

    return prisma.cipaMember.create({
      data: {
        employeeId: data.employeeId,
        role: data.role,
        termStart: new Date(data.termStart),
        termEnd: new Date(data.termEnd),
        active: data.active,
      },
      include: {
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  static async updateMember(id: string, data: UpdateCipaMemberInput) {
    const existing = await prisma.cipaMember.findUnique({ where: { id } });
    if (!existing) notFound('Membro da CIPA não encontrado');

    return prisma.cipaMember.update({
      where: { id },
      data: {
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.termStart !== undefined ? { termStart: new Date(data.termStart) } : {}),
        ...(data.termEnd !== undefined ? { termEnd: new Date(data.termEnd) } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  static async removeMember(id: string) {
    const existing = await prisma.cipaMember.findUnique({ where: { id } });
    if (!existing) notFound('Membro da CIPA não encontrado');
    await prisma.cipaMember.update({ where: { id }, data: { active: false } });
    return { id, active: false };
  }

  // ----- Reuniões -----

  static async listMeetings() {
    return prisma.cipaMeeting.findMany({ orderBy: { meetingDate: 'desc' } });
  }

  static async getMeetingById(id: string) {
    const meeting = await prisma.cipaMeeting.findUnique({ where: { id } });
    if (!meeting) notFound('Reunião da CIPA não encontrada');
    return meeting;
  }

  static async createMeeting(data: CreateCipaMeetingInput) {
    return prisma.cipaMeeting.create({
      data: {
        meetingDate: new Date(data.meetingDate),
        minutes: data.minutes,
        pendingActions: (data.pendingActions ?? undefined) as any,
      },
    });
  }

  static async updateMeeting(id: string, data: UpdateCipaMeetingInput) {
    const existing = await prisma.cipaMeeting.findUnique({ where: { id } });
    if (!existing) notFound('Reunião da CIPA não encontrada');

    return prisma.cipaMeeting.update({
      where: { id },
      data: {
        ...(data.meetingDate !== undefined ? { meetingDate: new Date(data.meetingDate) } : {}),
        ...(data.minutes !== undefined ? { minutes: data.minutes } : {}),
        ...(data.pendingActions !== undefined ? { pendingActions: data.pendingActions as any } : {}),
      },
    });
  }

  static async removeMeeting(id: string) {
    const existing = await prisma.cipaMeeting.findUnique({ where: { id } });
    if (!existing) notFound('Reunião da CIPA não encontrada');
    await prisma.cipaMeeting.delete({ where: { id } });
    return { id };
  }
}
