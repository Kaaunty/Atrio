import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { MedicalCertificatesController } from './controllers/medical-certificates.controller.js';

const router = Router();

// ─── Rotas do Colaborador ─────────────────────────────────────────────────────
router.post('/medical-certificates', authenticate, MedicalCertificatesController.submitCertificate);
router.get('/medical-certificates/me', authenticate, MedicalCertificatesController.getEmployeeCertificates);

// ─── Rotas do RH (Validação e Homologação) ────────────────────────────────────
router.get('/medical-certificates/rh', authenticate, requireRole('ADMIN', 'RH'), MedicalCertificatesController.getRhCertificates);
router.get('/medical-certificates/rh/:id', authenticate, requireRole('ADMIN', 'RH'), MedicalCertificatesController.getCertificateDetailForRh);
router.post('/medical-certificates/rh/:id/approve', authenticate, requireRole('ADMIN', 'RH'), MedicalCertificatesController.approveCertificate);
router.post('/medical-certificates/rh/:id/reject', authenticate, requireRole('ADMIN', 'RH'), MedicalCertificatesController.rejectCertificate);
router.post('/medical-certificates/rh/:id/request-correction', authenticate, requireRole('ADMIN', 'RH'), MedicalCertificatesController.requestCorrection);

// ─── Rotas de Afastamentos (Gestor & RH) ──────────────────────────────────────
router.get('/leaves-of-absence', authenticate, MedicalCertificatesController.getLeavesOfAbsence);

export { router as medicalCertificatesRoutes };
