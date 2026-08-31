import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { AnnouncementsService } from '../services/announcements.service';

describe('Mural de Comunicados Internos Integration Flow', () => {
  let userId: string;
  let employeeId: string;
  let announcementId: string;

  before(async () => {
    // 1. Usuário e Colaborador
    const user = await prisma.user.create({
      data: {
        email: `ann_author_${Date.now()}@atrio.com.br`,
        passwordHash: 'hashed_pw',
      },
    });
    userId = user.id;

    const company = await prisma.company.create({
      data: {
        legalName: 'Átrio Comunicados S.A.',
        tradeName: 'Átrio Comunicados',
        cnpj: `77.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        name: 'Leitor de Comunicados',
        registrationNumber: `ANN-${Date.now()}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        email: user.email,
        admissionDate: new Date('2024-01-01'),
        contractType: 'CLT',
        status: 'ATIVO',
      },
    });
    employeeId = employee.id;

    await prisma.user.update({
      where: { id: userId },
      data: { employeeId },
    });
  });

  after(async () => {
    if (userId) {
      await prisma.announcementView.deleteMany({ where: { employeeId } });
      await prisma.announcement.deleteMany({ where: { authorId: userId } });
      await prisma.employee.deleteMany({ where: { id: employeeId } });
      await prisma.company.deleteMany({ where: { tradeName: 'Átrio Comunicados' } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('deve criar e agendar um comunicado institucional (RH)', async () => {
    const ann = await AnnouncementsService.createAnnouncement(userId, {
      title: 'Convenção Anual Átrio 2026',
      summary: 'Participe da convenção anual com toda a equipe da Átrio RH',
      content: '# Convenção Anual\n\nNosso evento acontecerá no dia 15 de Outubro no auditório principal.',
      category: 'INSTITUCIONAL',
      isPinned: true,
      requiresAcknowledgement: true,
      targetType: 'ALL',
      notifyUsers: false,
    });

    assert.ok(ann.id);
    assert.equal(ann.title, 'Convenção Anual Átrio 2026');
    assert.equal(ann.isPinned, true);
    assert.equal(ann.requiresAcknowledgement, true);
    announcementId = ann.id;
  });

  it('deve listar o comunicado no feed do colaborador', async () => {
    const feed = await AnnouncementsService.getFeedForEmployee(userId, { page: 1, pageSize: 10 });
    assert.ok(feed.data.length >= 1);

    const target = feed.data.find((a) => a.id === announcementId);
    assert.ok(target);
    assert.equal(target?.title, 'Convenção Anual Átrio 2026');
    assert.equal(target?.isRead, false);
  });

  it('deve registrar visualização automática ao abrir o comunicado', async () => {
    const detail = await AnnouncementsService.getAnnouncementDetail(announcementId, userId);
    assert.equal(detail.id, announcementId);
    assert.equal(detail.isRead, true);
    assert.equal(detail.isAcknowledged, false);
  });

  it('deve confirmar ciência/leitura do comunicado', async () => {
    const view = await AnnouncementsService.acknowledgeAnnouncement(announcementId, userId);
    assert.ok(view.acknowledgedAt);

    const detailAfter = await AnnouncementsService.getAnnouncementDetail(announcementId, userId);
    assert.equal(detailAfter.isAcknowledged, true);
  });

  it('deve calcular métricas de engajamento do comunicado para o RH', async () => {
    const metrics = await AnnouncementsService.getAnnouncementMetrics(announcementId);
    assert.equal(metrics.announcementId, announcementId);
    assert.ok(metrics.totalViews >= 1);
    assert.ok(metrics.totalAcknowledged >= 1);
  });
});
