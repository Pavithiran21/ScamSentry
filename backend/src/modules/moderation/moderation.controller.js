const { actorOf } = require('../../middleware/requireAuth');
const { pageQuerySchema } = require('../../utils/pagination');
const { idParamsSchema } = require('../../utils/validation');
const { decisionSchema, queueQuerySchema } = require('../reports/report.schemas');
const moderationService = require('./moderation.service');

async function getSummary(req, res) {
  res.json(await moderationService.getSummary(actorOf(req)));
}

async function listQueue(req, res) {
  const query = { ...pageQuerySchema.parse(req.query), ...queueQuerySchema.parse(req.query) };
  res.json(await moderationService.listQueue(actorOf(req), query));
}

async function getReport(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await moderationService.getReport(actorOf(req), id));
}

async function decide(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  const input = decisionSchema.parse(req.body ?? {});
  res.json(await moderationService.decide(actorOf(req), id, input));
}

module.exports = { getSummary, listQueue, getReport, decide };
