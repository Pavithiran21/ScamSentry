const { Router } = require('express');
const moderationController = require('./moderation.controller');

// Mounted at /api/moderation behind requireAuth; every service function allows 'moderator' only.
const moderationRouter = Router();

moderationRouter.get('/summary', moderationController.getSummary);
moderationRouter.get('/reports', moderationController.listQueue);
moderationRouter.get('/reports/:id', moderationController.getReport);
moderationRouter.post('/reports/:id/decision', moderationController.decide);

module.exports = { moderationRouter };
