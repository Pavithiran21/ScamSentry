const { Router } = require('express');
const reportController = require('./report.controller');

// Mounted at /api/reports behind requireAuth: the signed-in user's own reports.
// (Creating one is POST /api/checks/:id/reports, in check.routes.js.)
const reportRouter = Router();

reportRouter.get('/', reportController.listMyReports);
reportRouter.get('/:id', reportController.getMyReport);
reportRouter.post('/:id/seen', reportController.markSeen);

module.exports = { reportRouter };
