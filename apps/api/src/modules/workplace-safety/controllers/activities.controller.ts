import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { ActivitiesService } from '../services/activities.service.js';
import {
  createSafetyActivitySchema,
  updateSafetyActivitySchema,
  addActivityParticipantsSchema,
  updateActivityParticipantSchema,
} from '../workplace-safety.dto.js';

export class ActivitiesController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, departmentId } = req.query;
      const data = await ActivitiesService.list({
        type: type ? String(type) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ActivitiesService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createSafetyActivitySchema.parse(req.body);
      const data = await ActivitiesService.create(payload);
      res.status(201).json({ success: true, message: 'Atividade de segurança criada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateSafetyActivitySchema.parse(req.body);
      const data = await ActivitiesService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'Atividade atualizada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ActivitiesService.remove((req.params.id as string));
      res.json({ success: true, message: 'Atividade removida com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async addParticipants(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = addActivityParticipantsSchema.parse(req.body);
      const data = await ActivitiesService.addParticipants((req.params.id as string), payload);
      res.status(201).json({ success: true, message: 'Participantes adicionados com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateParticipant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateActivityParticipantSchema.parse(req.body);
      const data = await ActivitiesService.setParticipantAttendance(req.params.participantId as string, payload.attended);
      res.json({ success: true, message: 'Presença atualizada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async removeParticipant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ActivitiesService.removeParticipant(req.params.participantId as string);
      res.json({ success: true, message: 'Participante removido com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
