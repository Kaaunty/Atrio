import { prisma } from '../../../database/prisma';
import { CreateAnnouncementDto, QueryAnnouncementsDto } from '../announcement.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

export class AnnouncementsService {
  /**
   * Retorna o feed de comunicados vigentes e segmentados para o colaborador logado
   */
  static async getFeedForEmployee(userId: string, options: QueryAnnouncementsDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    const now = new Date();
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // Filtro base: publicados até o momento atual e não expirados
    const where: any = {
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (options.category) {
      where.category = options.category;
    }

    if (options.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: options.search, mode: 'insensitive' } },
            { summary: { contains: options.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: {
        author: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
        views: {
          where: user?.employee?.id ? { employeeId: user.employee.id } : undefined,
        },
      },
      skip,
      take: pageSize,
    });

    const total = await prisma.announcement.count({ where });

    // Filtrar segmentação se necessário (ALL ou se o departamento do colaborador estiver nos targetIds)
    const employeeDeptId = user?.employee?.departmentId;
    const employeeUnitId = user?.employee?.unitId;
    const employeePositionId = user?.employee?.positionId;

    const filtered = announcements.filter((ann) => {
      if (ann.targetType === 'ALL') return true;
      const targetIds = (ann.targetIds as string[]) || [];

      if (ann.targetType === 'SPECIFIC_DEPARTMENTS' && employeeDeptId) {
        return targetIds.includes(employeeDeptId);
      }
      if (ann.targetType === 'SPECIFIC_UNITS' && employeeUnitId) {
        return targetIds.includes(employeeUnitId);
      }
      if (ann.targetType === 'SPECIFIC_ROLES' && employeePositionId) {
        return targetIds.includes(employeePositionId);
      }
      return true;
    });

    const mapped = filtered.map((ann) => {
      const userView = ann.views[0];
      return {
        id: ann.id,
        title: ann.title,
        summary: ann.summary,
        category: ann.category,
        coverImageUrl: ann.coverImageUrl,
        isPinned: ann.isPinned,
        requiresAcknowledgement: ann.requiresAcknowledgement,
        publishedAt: ann.publishedAt,
        authorName: ann.author.employee?.name || ann.author.email,
        isRead: Boolean(userView),
        isAcknowledged: Boolean(userView?.acknowledgedAt),
      };
    });

    return {
      data: mapped,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Retorna o conteúdo completo de um comunicado e registra a visualização automática
   */
  static async getAnnouncementDetail(announcementId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
        views: user?.employee?.id ? { where: { employeeId: user.employee.id } } : undefined,
      },
    });

    if (!announcement) {
      throw new Error('Comunicado não encontrado.');
    }

    // Registra visualização automática se o usuário tiver um perfil de colaborador
    if (user?.employee?.id) {
      await prisma.announcementView.upsert({
        where: {
          announcementId_employeeId: {
            announcementId,
            employeeId: user.employee.id,
          },
        },
        create: {
          announcementId,
          employeeId: user.employee.id,
          viewedAt: new Date(),
        },
        update: {
          viewedAt: new Date(),
        },
      });
    }

    const userView = announcement.views?.[0];

    return {
      ...announcement,
      isRead: true,
      isAcknowledged: Boolean(userView?.acknowledgedAt),
      acknowledgedAt: userView?.acknowledgedAt || null,
    };
  }

  /**
   * Confirma ciência/leitura de um comunicado
   */
  static async acknowledgeAnnouncement(announcementId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee?.id) {
      throw new Error('Usuário não possui perfil de colaborador vinculado.');
    }

    const employeeId = user.employee.id;

    const view = await prisma.announcementView.upsert({
      where: {
        announcementId_employeeId: {
          announcementId,
          employeeId,
        },
      },
      create: {
        announcementId,
        employeeId,
        viewedAt: new Date(),
        acknowledgedAt: new Date(),
      },
      update: {
        acknowledgedAt: new Date(),
      },
    });

    return view;
  }

  /**
   * Cria novo comunicado (RH) e notifica colaboradores elegíveis em background
   */
  static async createAnnouncement(authorId: string, dto: CreateAnnouncementDto) {
    const publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const announcement = await prisma.announcement.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        category: dto.category,
        coverImageUrl: dto.coverImageUrl,
        attachments: dto.attachments ? (dto.attachments as any) : null,
        isPinned: dto.isPinned,
        requiresAcknowledgement: dto.requiresAcknowledgement,
        targetType: dto.targetType,
        targetIds: dto.targetIds ? (dto.targetIds as any) : null,
        publishedAt,
        expiresAt,
        authorId,
      },
    });

    // Notificar usuários se `notifyUsers` for verdadeiro
    if (dto.notifyUsers) {
      setImmediate(async () => {
        try {
          const users = await prisma.user.findMany({
            where: { active: true },
            select: { id: true },
          });

          for (const u of users) {
            await NotificationsService.notifyUser({
              userId: u.id,
              title: `Novo Comunicado: ${dto.title}`,
              message: dto.summary,
              type: 'INFO',
              category: 'COMUNICADO',
              actionUrl: `/comunicados/${announcement.id}`,
              sendEmail: false,
            });
          }
        } catch (err) {
          console.error('Erro ao notificar usuários sobre novo comunicado:', err);
        }
      });
    }

    return announcement;
  }

  /**
   * Métricas de engajamento para o RH
   */
  static async getAnnouncementMetrics(announcementId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        views: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!announcement) {
      throw new Error('Comunicado não encontrado.');
    }

    const totalActiveEmployees = await prisma.employee.count({
      where: { status: 'ATIVO', deletedAt: null },
    });

    const totalViews = announcement.views.length;
    const totalAcknowledged = announcement.views.filter((v) => v.acknowledgedAt !== null).length;
    const viewPercentage = totalActiveEmployees > 0 ? (totalViews / totalActiveEmployees) * 100 : 0;

    return {
      announcementId,
      title: announcement.title,
      totalActiveEmployees,
      totalViews,
      totalAcknowledged,
      viewPercentage: Number(viewPercentage.toFixed(1)),
      views: announcement.views.map((v) => ({
        employeeId: v.employee.id,
        employeeName: v.employee.name,
        registrationNumber: v.employee.registrationNumber,
        departmentName: v.employee.department?.name || '—',
        viewedAt: v.viewedAt,
        acknowledgedAt: v.acknowledgedAt,
      })),
    };
  }
}
