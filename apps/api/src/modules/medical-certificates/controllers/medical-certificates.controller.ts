import { Request, Response } from 'express';
import {
  createMedicalCertificateSchema,
  approveCertificateSchema,
  rejectCertificateSchema,
  requestCorrectionSchema,
} from '../medical-certificate.dto.js';
import { MedicalCertificatesService } from '../services/medical-certificates.service.js';
import { LeavesOfAbsenceService } from '../services/leaves-of-absence.service.js';

export class MedicalCertificatesController {
  /**
   * Colaborador: Envia um novo atestado
   */
  static async submitCertificate(req: Request, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui um perfil de colaborador associado',
        });
      }

      const parsedData = createMedicalCertificateSchema.parse(req.body);
      const certificate = await MedicalCertificatesService.submitCertificate(employeeId, parsedData);

      return res.status(201).json({
        success: true,
        message: 'Atestado médico enviado com sucesso para análise do RH',
        data: certificate,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao enviar atestado médico',
      });
    }
  }

  /**
   * Colaborador: Lista histórico de atestados próprios
   */
  static async getEmployeeCertificates(req: Request, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui um perfil de colaborador associado',
        });
      }

      const certificates = await MedicalCertificatesService.getEmployeeCertificates(employeeId);

      return res.json({
        success: true,
        data: certificates,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico de atestados',
      });
    }
  }

  /**
   * RH: Fila de atestados pendentes e histórico de homologação
   */
  static async getRhCertificates(req: Request, res: Response) {
    try {
      const { status, search } = req.query;

      const hasSensitivePermission =
        req.user?.roles.includes('ADMIN') ||
        Boolean(req.user?.permissions['rh.atestados.visualizar_sensivel']);

      const certificates = await MedicalCertificatesService.getRhCertificates(
        {
          status: status as any,
          search: search as string,
        },
        hasSensitivePermission
      );

      return res.json({
        success: true,
        data: certificates,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar atestados do RH',
      });
    }
  }

  /**
   * RH: Detalhe de um atestado médico
   */
  static async getCertificateDetailForRh(req: Request, res: Response) {
    try {
      const certId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

      const hasSensitivePermission =
        req.user?.roles.includes('ADMIN') ||
        Boolean(req.user?.permissions['rh.atestados.visualizar_sensivel']);

      const certificate = await MedicalCertificatesService.getCertificateDetailForRh(certId, hasSensitivePermission);

      return res.json({
        success: true,
        data: certificate,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Atestado médico não encontrado',
      });
    }
  }

  /**
   * RH: Aprova o atestado médico (cria afastamento e abona ponto)
   */
  static async approveCertificate(req: Request, res: Response) {
    try {
      const certId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = approveCertificateSchema.parse(req.body);
      const result = await MedicalCertificatesService.approveCertificate(certId, rhUserId, parsedData.rhReviewNotes || undefined);

      return res.json({
        success: true,
        message: result.inssReferral
          ? 'Atestado aprovado com SUCESSO! ATENÇÃO: O período acumulado ultrapassa 15 dias e requer encaminhamento ao INSS.'
          : 'Atestado aprovado e dias abonados no espelho de ponto com sucesso.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao aprovar atestado médico',
      });
    }
  }

  /**
   * RH: Rejeita atestado médico
   */
  static async rejectCertificate(req: Request, res: Response) {
    try {
      const certId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = rejectCertificateSchema.parse(req.body);
      const updatedCert = await MedicalCertificatesService.rejectCertificate(certId, rhUserId, parsedData.rhReviewNotes);

      return res.json({
        success: true,
        message: 'Atestado médico rejeitado com sucesso.',
        data: updatedCert,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao rejeitar atestado médico',
      });
    }
  }

  /**
   * RH: Solicita correção do documento
   */
  static async requestCorrection(req: Request, res: Response) {
    try {
      const certId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = requestCorrectionSchema.parse(req.body);
      const updatedCert = await MedicalCertificatesService.requestCorrection(certId, rhUserId, parsedData.rhReviewNotes);

      return res.json({
        success: true,
        message: 'Solicitação de correção registrada. O colaborador poderá reenviar o atestado.',
        data: updatedCert,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao solicitar correção do atestado',
      });
    }
  }

  /**
   * Lista Afastamentos Consolidados (Gestor / RH)
   */
  static async getLeavesOfAbsence(req: Request, res: Response) {
    try {
      const { departmentId, activeOnly, viewMode } = req.query;

      const isManager =
        viewMode === 'manager' ||
        (!req.user?.roles.includes('ADMIN') &&
          !req.user?.roles.includes('RH') &&
          req.user?.permissions['afastamentos.visualizar'] === 'TEAM');

      const leaves = await LeavesOfAbsenceService.getLeavesOfAbsence({
        departmentId: departmentId as string,
        activeOnly: activeOnly === 'true',
        isManagerView: isManager,
        managerEmployeeId: req.user?.employeeId || undefined,
      });

      return res.json({
        success: true,
        data: leaves,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar afastamentos',
      });
    }
  }
}
