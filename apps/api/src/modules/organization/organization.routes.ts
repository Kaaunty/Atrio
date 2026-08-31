import { Router } from 'express';
import { CompanyController } from './controllers/company.controller.js';
import { UnitController } from './controllers/unit.controller.js';
import { DepartmentController } from './controllers/department.controller.js';
import { PositionController } from './controllers/position.controller.js';
import { ChartController } from './controllers/chart.controller.js';

const router = Router();

// -----------------------------------------------------------------------------
// EMPRESAS (COMPANIES)
// -----------------------------------------------------------------------------
router.get('/companies', CompanyController.list);
router.post('/companies', CompanyController.create);
router.get('/companies/:id', CompanyController.getById);
router.put('/companies/:id', CompanyController.update);
router.delete('/companies/:id', CompanyController.delete);
router.get('/companies/:id/units', UnitController.listByCompany);

// -----------------------------------------------------------------------------
// UNIDADES (UNITS)
// -----------------------------------------------------------------------------
router.get('/units', UnitController.list);
router.post('/units', UnitController.create);
router.get('/units/:id', UnitController.getById);
router.put('/units/:id', UnitController.update);
router.delete('/units/:id', UnitController.delete);

// -----------------------------------------------------------------------------
// SETORES / DEPARTAMENTOS (DEPARTMENTS)
// -----------------------------------------------------------------------------
router.get('/departments/tree', DepartmentController.getTree);
router.get('/departments', DepartmentController.list);
router.post('/departments', DepartmentController.create);
router.get('/departments/:id', DepartmentController.getById);
router.put('/departments/:id', DepartmentController.update);
router.delete('/departments/:id', DepartmentController.delete);

// -----------------------------------------------------------------------------
// CARGOS (POSITIONS)
// -----------------------------------------------------------------------------
router.get('/positions', PositionController.list);
router.post('/positions', PositionController.create);
router.get('/positions/:id', PositionController.getById);
router.put('/positions/:id', PositionController.update);
router.delete('/positions/:id', PositionController.delete);

// -----------------------------------------------------------------------------
// ORGANOGRAMA (ORGANIZATION CHART)
// -----------------------------------------------------------------------------
router.get('/organization/chart', ChartController.getChart);

export { router as organizationRoutes };
