import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { BenefitsService } from '../services/benefits.service';
import { CreateBenefitSchema, AssignEmployeeBenefitSchema, UpdateEmployeeBenefitSchema } from '../benefit.dto';

export class BenefitsController {
  static async getMyBenefits(req: AuthRequest, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({ error: 'Usuário não possui perfil de colaborador vinculado.' });
      }

      const benefits = await BenefitsService.getMyBenefits(employeeId);
      return res.json({ success: true, data: benefits });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao buscar meus benefícios.' });
    }
  }

  static async getAllBenefits(req: AuthRequest, res: Response) {
    try {
      const benefits = await BenefitsService.getAllBenefits();
      return res.json({ success: true, data: benefits });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao listar catálogo de benefícios.' });
    }
  }

  static async createBenefit(req: AuthRequest, res: Response) {
    try {
      const dto = CreateBenefitSchema.parse(req.body);
      const benefit = await BenefitsService.createBenefit(dto);
      return res.status(201).json({ success: true, data: benefit });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao cadastrar benefício.' });
    }
  }

  static async assignEmployeeBenefit(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const dto = AssignEmployeeBenefitSchema.parse(req.body);
      const employeeBenefit = await BenefitsService.assignBenefitToEmployee(employeeId, dto);
      return res.status(201).json({ success: true, data: employeeBenefit });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao associar benefício ao colaborador.' });
    }
  }

  static async updateEmployeeBenefit(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto = UpdateEmployeeBenefitSchema.parse(req.body);
      const updated = await BenefitsService.updateEmployeeBenefit(id, dto);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao atualizar vínculo de benefício.' });
    }
  }
}
