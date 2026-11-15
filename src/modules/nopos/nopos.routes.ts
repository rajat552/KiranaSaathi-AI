import { Router } from 'express';
import { noPosController } from './nopos.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';

export const noPosRouter = Router({ mergeParams: true });

noPosRouter.use(authMiddleware);
noPosRouter.use(tenantMiddleware());

// Shelf count snapshots
noPosRouter.get('/snapshots', noPosController.getSnapshots);
noPosRouter.post('/snapshots', tenantMiddleware(['owner', 'manager']), noPosController.recordSnapshot);

// Daily depletion observations
noPosRouter.get('/depletions', noPosController.getDepletions);
noPosRouter.post('/depletions', tenantMiddleware(['owner', 'manager', 'staff']), noPosController.recordDepletion);

// Invoices review queue & commit
noPosRouter.get('/invoices', noPosController.getInvoices);
noPosRouter.post('/invoices', tenantMiddleware(['owner', 'manager']), noPosController.ingestInvoice);
noPosRouter.patch('/invoices/:invoiceId/lines/:lineId', tenantMiddleware(['owner', 'manager']), noPosController.verifyInvoiceLine);
noPosRouter.post('/invoices/:invoiceId/commit', tenantMiddleware(['owner', 'manager']), noPosController.commitInvoice);
