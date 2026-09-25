import { prisma } from '../../../database/prisma.js';
import { CreatePpeInput, UpdatePpeInput, CreatePpeDeliveryInput } from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

export class PpeService {
  static async list(activeOnly?: boolean) {
    return prisma.ppe.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  static async getById(id: string) {
    const ppe = await prisma.ppe.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { deliveryDate: 'desc' },
          include: {
            employee: { select: { id: true, name: true, registrationNumber: true } },
          },
        },
      },
    });
    if (!ppe) notFound('EPI não encontrado');
    return ppe;
  }

  static async create(data: CreatePpeInput) {
    return prisma.ppe.create({ data });
  }

  static async update(id: string, data: UpdatePpeInput) {
    const existing = await prisma.ppe.findUnique({ where: { id } });
    if (!existing) notFound('EPI não encontrado');
    return prisma.ppe.update({ where: { id }, data });
  }

  static async remove(id: string) {
    const existing = await prisma.ppe.findUnique({ where: { id } });
    if (!existing) notFound('EPI não encontrado');
    await prisma.ppe.update({ where: { id }, data: { active: false } });
    return { id, active: false };
  }

  // ----- Movimentações (Entrega / Substituição / Devolução) -----

  static async listDeliveries(filters: { ppeId?: string; employeeId?: string }) {
    return prisma.ppeDelivery.findMany({
      where: {
        ppeId: filters.ppeId,
        employeeId: filters.employeeId,
      },
      orderBy: { deliveryDate: 'desc' },
      include: {
        ppe: { select: { id: true, name: true, ca: true, category: true } },
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  static async createDelivery(data: CreatePpeDeliveryInput) {
    const ppe = await prisma.ppe.findUnique({ where: { id: data.ppeId } });
    if (!ppe) notFound('EPI não encontrado');

    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) notFound('Colaborador não encontrado');

    return prisma.$transaction(async (tx) => {
      const delivery = await tx.ppeDelivery.create({
        data: {
          ppeId: data.ppeId,
          employeeId: data.employeeId,
          movementType: data.movementType,
          quantity: data.quantity,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          returnDate: data.returnDate ? new Date(data.returnDate) : null,
          reason: data.reason || null,
          signatureConfirmed: data.signatureConfirmed,
        },
        include: {
          ppe: { select: { id: true, name: true, ca: true, category: true } },
          employee: { select: { id: true, name: true, registrationNumber: true } },
        },
      });

      // Ajusta estoque: entrega/substituição consome estoque, devolução repõe.
      if (data.movementType === 'DEVOLUCAO') {
        await tx.ppe.update({
          where: { id: data.ppeId },
          data: { stockQuantity: ppe.stockQuantity + data.quantity },
        });
      } else {
        await tx.ppe.update({
          where: { id: data.ppeId },
          data: { stockQuantity: Math.max(0, ppe.stockQuantity - data.quantity) },
        });
      }

      return delivery;
    });
  }
}
