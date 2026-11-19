const { Router } = require('express');
const { optionalAuth } = require('../../middleware/requireAuth');
const { callerOf } = require('./deviceCookie');
const quotaService = require('./quota.service');

async function getQuota(req, res) {
  res.json(await quotaService.getQuota(callerOf(req, res)));
}

// GET /api/quota: today's checks left and when they come back, for a guest or a user.
const quotaRouter = Router();

quotaRouter.get('/', optionalAuth, getQuota);

module.exports = { quotaRouter };
