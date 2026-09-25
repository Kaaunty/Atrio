import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { CipaService } from '../services/cipa.service.js';
import {
  createCipaMemberSchema,
  updateCipaMemberSchema,
  createCipaMeetingSchema,
  updateCipaMeetingSchema,
} from '../workplace-safety.dto.js';

export class CipaController {
  static async listMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.active === 'true';
      const data = await CipaService.listMembers(activeOnly);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getMemberById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CipaService.getMemberById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createCipaMemberSchema.parse(req.body);
      const data = await CipaService.createMember(payload);
      res.status(201).json({ success: true, message: 'Membro da CIPA cadastrado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateCipaMemberSchema.parse(req.body);
      const data = await CipaService.updateMember((req.params.id as string), payload);
      res.json({ success: true, message: 'Membro da CIPA atualizado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CipaService.removeMember((req.params.id as string));
      res.json({ success: true, message: 'Membro da CIPA inativado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async listMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CipaService.listMeetings();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getMeetingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CipaService.getMeetingById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createCipaMeetingSchema.parse(req.body);
      const data = await CipaService.createMeeting(payload);
      res.status(201).json({ success: true, message: 'Reunião da CIPA registrada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateCipaMeetingSchema.parse(req.body);
      const data = await CipaService.updateMeeting((req.params.id as string), payload);
      res.json({ success: true, message: 'Reunião da CIPA atualizada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async removeMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CipaService.removeMeeting((req.params.id as string));
      res.json({ success: true, message: 'Reunião da CIPA removida com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
