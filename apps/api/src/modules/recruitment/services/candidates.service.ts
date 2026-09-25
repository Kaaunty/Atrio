import { prisma } from '../../../database/prisma.js';
import { CreateCandidateInput, UpdateCandidateInput } from '../recruitment.dto.js';

export class CandidatesService {
  static async create(data: CreateCandidateInput) {
    return prisma.candidate.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        resumeUrl: data.resumeUrl || null,
        education: data.education || null,
        experience: data.experience || null,
        source: data.source || null,
      },
    });
  }

  static async list(filters: { search?: string }) {
    const where: any = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        applications: {
          select: {
            id: true,
            stage: true,
            jobOpening: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { appliedAt: 'desc' },
          include: {
            jobOpening: { select: { id: true, title: true, status: true } },
            interviews: { orderBy: { scheduledAt: 'desc' } },
          },
        },
      },
    });

    if (!candidate) {
      const error: any = new Error('Candidato não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return candidate;
  }

  static async update(id: string, data: UpdateCandidateInput) {
    const existing = await prisma.candidate.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Candidato não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return prisma.candidate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.resumeUrl !== undefined ? { resumeUrl: data.resumeUrl } : {}),
        ...(data.education !== undefined ? { education: data.education } : {}),
        ...(data.experience !== undefined ? { experience: data.experience } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
      },
    });
  }

  static async remove(id: string) {
    const existing = await prisma.candidate.findUnique({
      where: { id },
      include: { applications: true },
    });
    if (!existing) {
      const error: any = new Error('Candidato não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (existing.applications.length > 0) {
      const error: any = new Error(
        'Não é possível excluir um candidato que já possui candidaturas vinculadas.'
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.candidate.delete({ where: { id } });
    return { id };
  }
}
