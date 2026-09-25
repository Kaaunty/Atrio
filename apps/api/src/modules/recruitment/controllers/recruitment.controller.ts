import { Request, Response, NextFunction } from 'express';
import {
  createJobRequisitionSchema,
  queryJobRequisitionSchema,
  createJobOpeningSchema,
  updateJobOpeningSchema,
  queryJobOpeningSchema,
  createCandidateSchema,
  updateCandidateSchema,
  queryCandidateSchema,
  createApplicationSchema,
  moveApplicationStageSchema,
  queryApplicationSchema,
  createInterviewSchema,
  updateInterviewSchema,
  queryInterviewSchema,
} from '../recruitment.dto.js';
import { JobRequisitionsService } from '../services/job-requisitions.service.js';
import { JobOpeningsService } from '../services/job-openings.service.js';
import { CandidatesService } from '../services/candidates.service.js';
import { ApplicationsService } from '../services/applications.service.js';
import { InterviewsService } from '../services/interviews.service.js';
import { RecruitmentDashboardService } from '../services/dashboard.service.js';

export class JobRequisitionController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const data = createJobRequisitionSchema.parse(req.body);
      const created = await JobRequisitionsService.create(actorUserId, data);

      return res.status(201).json({
        success: true,
        message: 'Solicitação de abertura de vaga enviada para análise do RH',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryJobRequisitionSchema.parse(req.query);
      const items = await JobRequisitionsService.list(query);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.json({ success: true, data: [] });
      }

      const items = await JobRequisitionsService.listMine(actorUserId);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await JobRequisitionsService.listPending();
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = await JobRequisitionsService.getById(id);
      return res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const updated = await JobRequisitionsService.approve(id, rhUserId);
      return res.json({
        success: true,
        message: 'Solicitação de vaga aprovada com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const updated = await JobRequisitionsService.reject(id, rhUserId);
      return res.json({
        success: true,
        message: 'Solicitação de vaga rejeitada',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export class JobOpeningController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const data = createJobOpeningSchema.parse(req.body);
      const created = await JobOpeningsService.create(actorUserId, data);

      return res.status(201).json({
        success: true,
        message: 'Vaga criada com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryJobOpeningSchema.parse(req.query);
      const items = await JobOpeningsService.list(query);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = await JobOpeningsService.getById(id);
      return res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const data = updateJobOpeningSchema.parse(req.body);
      const updated = await JobOpeningsService.update(id, actorUserId, data);

      return res.json({ success: true, message: 'Vaga atualizada com sucesso', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const result = await JobOpeningsService.remove(id, actorUserId);
      return res.json({ success: true, message: 'Vaga excluída com sucesso', data: result });
    } catch (err) {
      next(err);
    }
  }
}

export class CandidateController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCandidateSchema.parse(req.body);
      const created = await CandidatesService.create(data);
      return res.status(201).json({
        success: true,
        message: 'Candidato cadastrado com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryCandidateSchema.parse(req.query);
      const items = await CandidatesService.list(query);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = await CandidatesService.getById(id);
      return res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = updateCandidateSchema.parse(req.body);
      const updated = await CandidatesService.update(id, data);
      return res.json({ success: true, message: 'Candidato atualizado com sucesso', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await CandidatesService.remove(id);
      return res.json({ success: true, message: 'Candidato excluído com sucesso', data: result });
    } catch (err) {
      next(err);
    }
  }
}

export class ApplicationController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createApplicationSchema.parse(req.body);
      const created = await ApplicationsService.create(data);
      return res.status(201).json({
        success: true,
        message: 'Candidato vinculado à vaga com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryApplicationSchema.parse(req.query);
      const items = await ApplicationsService.list(query);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = await ApplicationsService.getById(id);
      return res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  static async moveStage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = moveApplicationStageSchema.parse(req.body);
      const updated = await ApplicationsService.moveStage(id, data.stage, data.notes);
      return res.json({
        success: true,
        message: `Candidatura movida para o estágio ${data.stage}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await ApplicationsService.remove(id);
      return res.json({ success: true, message: 'Candidatura removida com sucesso', data: result });
    } catch (err) {
      next(err);
    }
  }
}

export class InterviewController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createInterviewSchema.parse(req.body);
      const created = await InterviewsService.create(data);
      return res.status(201).json({
        success: true,
        message: 'Entrevista agendada com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryInterviewSchema.parse(req.query);
      const items = await InterviewsService.list(query);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = await InterviewsService.getById(id);
      return res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = updateInterviewSchema.parse(req.body);
      const updated = await InterviewsService.update(id, data);
      return res.json({ success: true, message: 'Entrevista atualizada com sucesso', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await InterviewsService.remove(id);
      return res.json({ success: true, message: 'Entrevista excluída com sucesso', data: result });
    } catch (err) {
      next(err);
    }
  }
}

export class RecruitmentDashboardController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RecruitmentDashboardService.getOverview();
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
