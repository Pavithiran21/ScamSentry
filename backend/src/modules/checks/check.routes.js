const { Router } = require('express');
const { reportLimiter } = require('../../middleware/rateLimiters');
const { optionalAuth, requireAuth } = require('../../middleware/requireAuth');
const reportController = require('../reports/report.controller');
const checkController = require('./check.controller');

// Mounted at /api/checks. POST / is open to guests (optionalAuth); the rest need a login,
// and the services allow only the 'user' role.
const checkRouter = Router();

checkRouter.post('/', optionalAuth, checkController.checkMessage);
checkRouter.get('/', requireAuth, checkController.listHistory);
checkRouter.delete('/', requireAuth, checkController.deleteHistory);
checkRouter.get('/:id', requireAuth, checkController.getCheck);
checkRouter.delete('/:id', requireAuth, checkController.deleteCheck);
checkRouter.post('/:id/reports', requireAuth, reportLimiter, reportController.createReport);

module.exports = { checkRouter };
