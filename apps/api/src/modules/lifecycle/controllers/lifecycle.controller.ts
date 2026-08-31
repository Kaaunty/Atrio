import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { LifecycleService } from '../services/lifecycle.service';
import {
  CreateChecklistTemplateSchema,
  CreateLifecycleProcessSchema,
  QueryLifecycleProcessesSchema,
  CompleteTaskSchema,
} from '../lifecycle.dto';

export class LifecycleController {
  static async getAllTemplates(req: AuthRequest, res: Response) {
    try {
      const templates = await LifecycleService.getAllTemplates();
      return res.json({ success: true, data: templates });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter templates de checklist.' });
    }
  }

  static async createTemplate(req: AuthRequest, res: Response) {
    try {
      const dto = CreateChecklistTemplateSchema.parse(req.body);
      const template = await LifecycleService.createTemplate(dto);
      return res.status(201).json({ success: true, data: template });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao criar template de checklist.' });
    }
  }

  static async getProcesses(req: AuthRequest, res: Response) {
    try {
      const query = QueryLifecycleProcessesSchema.parse(req.query);
      const result = await LifecycleService.getProcesses(query);
      return res.json({ success: true, data: result.data, meta: result.meta });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao listar processos de Onboarding/Offboarding.' });
    }
  }

  static async createProcess(req: AuthRequest, res: Response) {
    try {
      const initiatedById = req.user?.id;
      if (!initiatedById) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const dto = CreateLifecycleProcessSchema.parse(req.body);
      const process = await LifecycleService.createProcess(initiatedById, dto);
      return res.status(201).json({ success: true, data: process });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao iniciar processo de Onboarding/Offboarding.' });
    }
  }

  static async getProcessById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const process = await LifecycleService.getProcessById(id);
      return res.json({ success: true, data: process });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter detalhes do processo.' });
    }
  }

  static async completeTask(req: AuthRequest, res: Response) {
    try {
      const completedById = req.user?.id;
      if (!completedById) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { id } = req.params;
      const dto = CompleteTaskSchema.parse(req.body);
      const updated = await LifecycleService.completeTask(id, completedById, dto.notes);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao concluir tarefa do checklist.' });
    }
  }

  static async getMyPendingTasks(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const tasks = await LifecycleService.getMyPendingTasks(userId);
      return res.json({ success: true, data: tasks });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao listar minhas tarefas pendentes.' });
    }
  }
}
