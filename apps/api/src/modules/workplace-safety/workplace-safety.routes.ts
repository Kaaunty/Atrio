import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware.js';
import { PpeController } from './controllers/ppe.controller.js';
import { AccidentsController } from './controllers/accidents.controller.js';
import { InspectionsController } from './controllers/inspections.controller.js';
import { CipaController } from './controllers/cipa.controller.js';
import { ActivitiesController } from './controllers/activities.controller.js';
import { DocumentsController } from './controllers/documents.controller.js';
import { CorrectiveActionsController } from './controllers/corrective-actions.controller.js';
import { uploadSafetyDocumentMiddleware } from '../../config/upload.js';

const router = Router();

const canView = requirePermission('seguranca-trabalho.visualizar');
const canManage = requirePermission('seguranca-trabalho.gerenciar');

router.use(authenticate);

// ----- EPIs -----
router.get('/workplace-safety/ppes', canView, PpeController.list);
router.get('/workplace-safety/ppes/deliveries', canView, PpeController.listDeliveries);
router.post('/workplace-safety/ppes/deliveries', canManage, PpeController.createDelivery);
router.get('/workplace-safety/ppes/:id', canView, PpeController.getById);
router.post('/workplace-safety/ppes', canManage, PpeController.create);
router.patch('/workplace-safety/ppes/:id', canManage, PpeController.update);
router.delete('/workplace-safety/ppes/:id', canManage, PpeController.remove);

// ----- Acidentes / Incidentes -----
router.get('/workplace-safety/accidents', canView, AccidentsController.list);
router.get('/workplace-safety/accidents/:id', canView, AccidentsController.getById);
router.post('/workplace-safety/accidents', canManage, AccidentsController.create);
router.patch('/workplace-safety/accidents/:id', canManage, AccidentsController.update);
router.delete('/workplace-safety/accidents/:id', canManage, AccidentsController.remove);

// ----- Inspeções -----
router.get('/workplace-safety/inspections', canView, InspectionsController.list);
router.get('/workplace-safety/inspections/:id', canView, InspectionsController.getById);
router.post('/workplace-safety/inspections', canManage, InspectionsController.create);
router.patch('/workplace-safety/inspections/:id', canManage, InspectionsController.update);
router.delete('/workplace-safety/inspections/:id', canManage, InspectionsController.remove);

// ----- CIPA: Membros -----
router.get('/workplace-safety/cipa/members', canView, CipaController.listMembers);
router.get('/workplace-safety/cipa/members/:id', canView, CipaController.getMemberById);
router.post('/workplace-safety/cipa/members', canManage, CipaController.createMember);
router.patch('/workplace-safety/cipa/members/:id', canManage, CipaController.updateMember);
router.delete('/workplace-safety/cipa/members/:id', canManage, CipaController.removeMember);

// ----- CIPA: Reuniões -----
router.get('/workplace-safety/cipa/meetings', canView, CipaController.listMeetings);
router.get('/workplace-safety/cipa/meetings/:id', canView, CipaController.getMeetingById);
router.post('/workplace-safety/cipa/meetings', canManage, CipaController.createMeeting);
router.patch('/workplace-safety/cipa/meetings/:id', canManage, CipaController.updateMeeting);
router.delete('/workplace-safety/cipa/meetings/:id', canManage, CipaController.removeMeeting);

// ----- Atividades (SIPATMA / DDS) -----
router.get('/workplace-safety/activities', canView, ActivitiesController.list);
router.get('/workplace-safety/activities/:id', canView, ActivitiesController.getById);
router.post('/workplace-safety/activities', canManage, ActivitiesController.create);
router.patch('/workplace-safety/activities/:id', canManage, ActivitiesController.update);
router.delete('/workplace-safety/activities/:id', canManage, ActivitiesController.remove);
router.post('/workplace-safety/activities/:id/participants', canManage, ActivitiesController.addParticipants);
router.patch(
  '/workplace-safety/activities/participants/:participantId',
  canManage,
  ActivitiesController.updateParticipant
);
router.delete(
  '/workplace-safety/activities/participants/:participantId',
  canManage,
  ActivitiesController.removeParticipant
);

// ----- Documentos de SST -----
router.post('/workplace-safety/documents/upload', canManage, uploadSafetyDocumentMiddleware.single('file'), DocumentsController.upload);
router.get('/workplace-safety/documents', canView, DocumentsController.list);
router.get('/workplace-safety/documents/expiring', canView, DocumentsController.expiring);
router.get('/workplace-safety/documents/:id', canView, DocumentsController.getById);
router.post('/workplace-safety/documents', canManage, DocumentsController.create);
router.patch('/workplace-safety/documents/:id', canManage, DocumentsController.update);
router.delete('/workplace-safety/documents/:id', canManage, DocumentsController.remove);

// ----- Ações corretivas -----
router.get('/workplace-safety/corrective-actions', canView, CorrectiveActionsController.list);
router.get('/workplace-safety/corrective-actions/:id', canView, CorrectiveActionsController.getById);
router.post('/workplace-safety/corrective-actions', canManage, CorrectiveActionsController.create);
router.patch('/workplace-safety/corrective-actions/:id', canManage, CorrectiveActionsController.update);
router.delete('/workplace-safety/corrective-actions/:id', canManage, CorrectiveActionsController.remove);

export { router as workplaceSafetyRoutes };
