import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { DevelopmentService } from '../services/development.service';
import {
  CreateTrainingSchema,
  AssignTrainingSchema,
  UploadCertificateSchema,
  CreateFeedbackSchema,
  CreateDevelopmentPlanSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
} from '../development.dto';

export class DevelopmentController {
  // --- Treinamentos ---
  static async getMyTrainings(req: AuthRequest, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({ error: 'Usuário não possui perfil de colaborador vinculado.' });
      }

      const list = await DevelopmentService.getMyTrainings(employeeId);
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter treinamentos.' });
    }
  }

  static async getAllTrainings(req: AuthRequest, res: Response) {
    try {
      const trainings = await DevelopmentService.getAllTrainings();
      return res.json({ success: true, data: trainings });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter catálogo de treinamentos.' });
    }
  }

  static async createTraining(req: AuthRequest, res: Response) {
    try {
      const dto = CreateTrainingSchema.parse(req.body);
      const training = await DevelopmentService.createTraining(dto);
      return res.status(201).json({ success: true, data: training });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao cadastrar treinamento.' });
    }
  }

  static async assignTraining(req: AuthRequest, res: Response) {
    try {
      const dto = AssignTrainingSchema.parse(req.body);
      const result = await DevelopmentService.assignTrainingToEmployees(dto);
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao atribuir treinamento aos colaboradores.' });
    }
  }

  static async uploadCertificate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto = UploadCertificateSchema.parse(req.body);
      const updated = await DevelopmentService.uploadCertificate(id, dto);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao realizar upload do certificado.' });
    }
  }

  static async getComplianceReport(req: AuthRequest, res: Response) {
    try {
      const report = await DevelopmentService.getComplianceReport();
      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao gerar relatório de conformidade.' });
    }
  }

  // --- Feedbacks & 1:1 ---
  static async getMyFeedbacks(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const employeeId = req.user?.employeeId;
      if (!userId || !employeeId) {
        return res.status(400).json({ error: 'Usuário não possui perfil de colaborador vinculado.' });
      }

      const list = await DevelopmentService.getMyFeedbacks(userId, employeeId);
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter histórico de feedbacks.' });
    }
  }

  static async getTeamFeedbacks(req: AuthRequest, res: Response) {
    try {
      const managerUserId = req.user?.id;
      if (!managerUserId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { employeeId } = req.params;
      const list = await DevelopmentService.getTeamFeedbacks(managerUserId, employeeId);
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter feedbacks da equipe.' });
    }
  }

  static async createFeedback(req: AuthRequest, res: Response) {
    try {
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const dto = CreateFeedbackSchema.parse(req.body);
      const feedback = await DevelopmentService.createFeedback(authorId, dto);
      return res.status(201).json({ success: true, data: feedback });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao registrar feedback.' });
    }
  }

  // --- PDI (Plano de Desenvolvimento Individual) ---
  static async getMyDevelopmentPlans(req: AuthRequest, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({ error: 'Usuário não possui perfil de colaborador vinculado.' });
      }

      const plans = await DevelopmentService.getMyDevelopmentPlans(employeeId);
      return res.json({ success: true, data: plans });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter Plano de Desenvolvimento Individual.' });
    }
  }

  static async createDevelopmentPlan(req: AuthRequest, res: Response) {
    try {
      const dto = CreateDevelopmentPlanSchema.parse(req.body);
      const plan = await DevelopmentService.createDevelopmentPlan(dto);
      return res.status(201).json({ success: true, data: plan });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao criar PDI.' });
    }
  }

  static async addGoalToPlan(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dto = CreateGoalSchema.parse(req.body);
      const goal = await DevelopmentService.addGoalToPlan(id, dto);
      return res.status(201).json({ success: true, data: goal });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao adicionar meta ao PDI.' });
    }
  }

  static async updateGoal(req: AuthRequest, res: Response) {
    try {
      const { goalId } = req.params;
      const dto = UpdateGoalSchema.parse(req.body);
      const updated = await DevelopmentService.updateGoal(goalId, dto);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao atualizar meta do PDI.' });
    }
  }
}
