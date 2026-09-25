import { prisma } from '../../../database/prisma.js';

export class RecruitmentDashboardService {
  static async getOverview() {
    const [
      openOpeningsCount,
      inProgressOpeningsCount,
      pendingRequisitionsCount,
      totalCandidatesCount,
      stageCounts,
      upcomingInterviews,
      recentOpenings,
    ] = await Promise.all([
      prisma.jobOpening.count({ where: { status: 'ABERTA' } }),
      prisma.jobOpening.count({ where: { status: 'EM_ANDAMENTO' } }),
      prisma.jobRequisition.count({ where: { status: 'PENDENTE' } }),
      prisma.candidate.count(),
      prisma.application.groupBy({ by: ['stage'], _count: { stage: true } }),
      prisma.interviewSchedule.findMany({
        where: { scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          application: {
            include: {
              candidate: { select: { id: true, name: true } },
              jobOpening: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.jobOpening.findMany({
        where: { status: { in: ['ABERTA', 'EM_ANDAMENTO'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          applications: { select: { id: true } },
        },
      }),
    ]);

    const funnel: Record<string, number> = {
      TRIAGEM: 0,
      ENTREVISTA: 0,
      AVALIACAO: 0,
      PARECER: 0,
      APROVADO: 0,
      REPROVADO: 0,
    };

    for (const item of stageCounts) {
      funnel[item.stage] = item._count.stage;
    }

    return {
      openOpeningsCount,
      inProgressOpeningsCount,
      pendingRequisitionsCount,
      totalCandidatesCount,
      funnel,
      upcomingInterviews,
      recentOpenings: recentOpenings.map((opening) => ({
        ...opening,
        applicationsCount: opening.applications.length,
      })),
    };
  }
}
