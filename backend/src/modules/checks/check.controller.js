const { z } = require('zod');
const { actorOf } = require('../../middleware/requireAuth');
const { pageQuerySchema } = require('../../utils/pagination');
const { idParamsSchema } = require('../../utils/validation');
const { callerOf } = require('../quota/deviceCookie');
const checkService = require('./check.service');

// Only the shape is checked here; the text rules (empty, too long) live in sanitize.js,
// because they apply to the cleaned text.
const checkBodySchema = z.object({ text: z.string('Paste a message or link to check.') });

async function checkMessage(req, res) {
  const { text } = checkBodySchema.parse(req.body ?? {});
  const result = await checkService.checkMessage(callerOf(req, res), text);
  res.status(req.user ? 201 : 200).json(result);
}

async function listHistory(req, res) {
  const query = pageQuerySchema.parse(req.query);
  res.json(await checkService.listHistory(actorOf(req), query));
}

async function getCheck(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await checkService.getCheck(actorOf(req), id));
}

async function deleteCheck(req, res) {
  const { id } = idParamsSchema.parse(req.params);
  await checkService.deleteCheck(actorOf(req), id);
  res.status(204).end();
}

async function deleteHistory(req, res) {
  res.json(await checkService.deleteHistory(actorOf(req)));
}

module.exports = { checkMessage, listHistory, getCheck, deleteCheck, deleteHistory };
