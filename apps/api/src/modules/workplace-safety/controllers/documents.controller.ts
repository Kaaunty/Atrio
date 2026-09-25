import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { DocumentsService } from '../services/documents.service.js';
import { createSafetyDocumentSchema, updateSafetyDocumentSchema } from '../workplace-safety.dto.js';

export class DocumentsController {
  static async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Selecione um arquivo para enviar' });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Arquivo enviado com sucesso',
        data: {
          fileUrl: `/uploads/safety-documents/${req.file.filename}`,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, active } = req.query;
      const data = await DocumentsService.list({
        type: type ? String(type) : undefined,
        activeOnly: active === 'true',
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await DocumentsService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createSafetyDocumentSchema.parse(req.body);
      const data = await DocumentsService.create(payload);
      res.status(201).json({ success: true, message: 'Documento de SST cadastrado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateSafetyDocumentSchema.parse(req.body);
      const data = await DocumentsService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'Documento atualizado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await DocumentsService.remove((req.params.id as string));
      res.json({ success: true, message: 'Documento inativado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async expiring(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const withinDays = req.query.days ? Number(req.query.days) : 30;
      const data = await DocumentsService.getExpiringDocuments(withinDays);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
