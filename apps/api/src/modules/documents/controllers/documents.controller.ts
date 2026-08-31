import { Request, Response } from 'express';
import {
  createSingleDocumentSchema,
  uploadBatchSchema,
  publishInstitutionalDocumentSchema,
} from '../document.dto.js';
import { DocumentsService } from '../services/documents.service.js';

export class DocumentsController {
  /**
   * Colaborador: Lista documentos do colaborador e institucionais
   */
  static async getEmployeeDocuments(req: Request, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui um perfil de colaborador associado',
        });
      }

      const { typeCode, year, unreadOnly } = req.query;

      const documents = await DocumentsService.getEmployeeDocuments(employeeId, {
        typeCode: typeCode as string,
        year: year ? Number(year) : undefined,
        unreadOnly: unreadOnly === 'true',
      });

      return res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar documentos',
      });
    }
  }

  /**
   * Download autenticado e auditado de documento
   */
  static async downloadDocument(req: Request, res: Response) {
    try {
      const documentId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const document = await DocumentsService.downloadDocument(documentId, req.user);

      return res.json({
        success: true,
        message: 'Download autorizado e registrado no log de auditoria.',
        data: {
          id: document.id,
          title: document.title,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
        },
      });
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message || 'Acesso negado para o download deste documento',
      });
    }
  }

  /**
   * Confirma leitura / Aceite de política interna
   */
  static async acknowledgeDocument(req: Request, res: Response) {
    try {
      const documentId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const employeeId = req.user?.employeeId;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui perfil de colaborador para confirmação de leitura',
        });
      }

      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Web Portal Client';

      const receipt = await DocumentsService.acknowledgeDocument(
        documentId,
        employeeId,
        ipAddress,
        userAgent
      );

      return res.json({
        success: true,
        message: 'Confirmação de leitura e aceite registrada com sucesso.',
        data: receipt,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao registrar confirmação de leitura',
      });
    }
  }

  /**
   * RH: Upload individual de documento
   */
  static async uploadSingleDocument(req: Request, res: Response) {
    try {
      const uploaderUserId = req.user?.id;
      if (!uploaderUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = createSingleDocumentSchema.parse(req.body);
      const doc = await DocumentsService.uploadSingleDocument(parsedData, uploaderUserId);

      return res.status(201).json({
        success: true,
        message: 'Documento individual enviado com sucesso para o colaborador.',
        data: doc,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao enviar documento',
      });
    }
  }

  /**
   * RH: Upload em lote com vínculo por matrícula/CPF
   */
  static async uploadBatchDocuments(req: Request, res: Response) {
    try {
      const uploaderUserId = req.user?.id;
      if (!uploaderUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = uploadBatchSchema.parse(req.body);
      const result = await DocumentsService.uploadBatchDocuments(parsedData, uploaderUserId);

      return res.json({
        success: true,
        message: `Processamento em lote concluído. ${result.matched} arquivo(s) vinculados com sucesso.`,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro no upload em lote',
      });
    }
  }

  /**
   * RH: Publica documento institucional / política corporativa
   */
  static async publishInstitutionalDocument(req: Request, res: Response) {
    try {
      const uploaderUserId = req.user?.id;
      if (!uploaderUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const parsedData = publishInstitutionalDocumentSchema.parse(req.body);
      const doc = await DocumentsService.publishInstitutionalDocument(parsedData, uploaderUserId);

      return res.status(201).json({
        success: true,
        message: 'Documento institucional publicado com sucesso.',
        data: doc,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao publicar documento institucional',
      });
    }
  }

  /**
   * RH: Obtém relatório de engajamento de leitura/aceite por documento
   */
  static async getReceiptsReport(req: Request, res: Response) {
    try {
      const documentId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const report = await DocumentsService.getReceiptsReport(documentId);

      return res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar relatório de leitura',
      });
    }
  }

  /**
   * Tipos de documento cadastrados no sistema
   */
  static async getDocumentTypes(_req: Request, res: Response) {
    try {
      const types = await DocumentsService.getDocumentTypes();
      return res.json({
        success: true,
        data: types,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar tipos de documento',
      });
    }
  }
}
