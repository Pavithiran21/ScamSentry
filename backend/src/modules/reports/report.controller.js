const { actorOf } = require('../../middleware/requireAuth');
const { pageQuerySchema } = require('../../utils/pagination');
const { idParamsSchema } = require('../../utils/validation');
const { createReportSchema } = require('./report.schemas');
const reportService = require('./report.service');

async function createReport(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  const input = createReportSchema.parse(req.body ?? {});
  res.status(201).json(await reportService.createReport(actorOf(req), id, input));
}

async function listMyReports(req, res) {
  const query = pageQuerySchema.parse(req.query);
  res.json(await reportService.listMyReports(actorOf(req), query));
}

async function getMyReport(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await reportService.getMyReport(actorOf(req), id));
}

async function markSeen(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  await reportService.markSeen(actorOf(req), id);
  res.status(204).end();
}

module.exports = { createReport, listMyReports, getMyReport, markSeen };
