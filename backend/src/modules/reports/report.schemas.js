const { z } = require('zod');
const { VERDICTS } = require('../checks/verdicts');

const verdictField = (message) => z.enum(VERDICTS, message);

// POST /checks/:id/reports. Messages match UI-UX.md.
const createReportSchema = z.object({
  suggestedVerdict: verdictField('Pick what the verdict should be.'),
  reason: z
    .string()
    .trim()
    .max(500, 'Use at most 500 characters.')
    .optional()
    .transform((value) => (value ? value : null)),
  // Must be exactly true: the report keeps a copy of the message, which needs consent.
  consent: z.literal(true, 'Tick the box to share this message with a moderator.'),
});

// POST /moderation/reports/:id/decision
const decisionSchema = z
  .object({
    action: z.enum(['confirm', 'overturn'], 'Choose Confirm original or Overturn.'),
    verdict: verdictField('Pick the corrected verdict.').optional(),
    note: z.string('Add a short note for the record.').trim().min(1, 'Add a short note for the record.').max(500, 'Use at most 500 characters.'),
  })
  .refine((body) => body.action !== 'overturn' || body.verdict, {
    message: 'Pick the corrected verdict.',
    path: ['verdict'],
  });

const queueQuerySchema = z.object({
  status: z.enum(['open', 'confirmed', 'overturned'], 'Pick open, confirmed or overturned.').default('open'),
});

module.exports = { createReportSchema, decisionSchema, queueQuerySchema };
