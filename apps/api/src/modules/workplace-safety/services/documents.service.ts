import { prisma } from '../../../database/prisma.js';
import { CreateSafetyDocumentInput, UpdateSafetyDocumentInput } from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

export class DocumentsService {
  static async list(filters: { type?: string; activeOnly?: boolean }) {
    return prisma.safetyDocument.findMany({
      where: {
        type: filters.type as any,
        active: filters.activeOnly ? true : undefined,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  static async getById(id: string) {
    const document = await prisma.safetyDocument.findUnique({ where: { id } });
    if (!document) notFound('Documento de SST não encontrado');
    return document;
  }

  static async create(data: CreateSafetyDocumentInput) {
    return prisma.safetyDocument.create({
      data: {
        type: data.type,
        title: data.title,
        fileUrl: data.fileUrl,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        active: data.active,
      },
    });
  }

  static async update(id: string, data: UpdateSafetyDocumentInput) {
    const existing = await prisma.safetyDocument.findUnique({ where: { id } });
    if (!existing) notFound('Documento de SST não encontrado');

    return prisma.safetyDocument.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl } : {}),
        ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
        ...(data.expiryDate !== undefined
          ? { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  static async remove(id: string) {
    const existing = await prisma.safetyDocument.findUnique({ where: { id } });
    if (!existing) notFound('Documento de SST não encontrado');
    await prisma.safetyDocument.update({ where: { id }, data: { active: false } });
    return { id, active: false };
  }

  /**
   * Documentos vencidos ou com vencimento dentro da janela informada (dias)
   */
  static async getExpiringDocuments(withinDays: number) {
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);

    return prisma.safetyDocument.findMany({
      where: {
        active: true,
        expiryDate: { not: null, lte: limit },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
