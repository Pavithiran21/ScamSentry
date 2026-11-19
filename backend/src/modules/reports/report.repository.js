const { ReportModel } = require('./report.model');

// The list views need only the start of the text, never the links or flags.
const LIST_FIELDS = 'checkId text verdict suggestedVerdict status decision.decidedAt reporterSeen createdAt textPurgedAt';

const reportRepository = {
  async create(data) {
    const report = await ReportModel.create(data);
    return report.toObject();
  },

  findById(id) {
    return ReportModel.findById(id).lean();
  },

  findOwned(id, reporterId) {
    return ReportModel.findOne({ _id: id, reporterId }).lean();
  },

  findPageOwned(reporterId, { skip, limit, sort }) {
    return ReportModel.find({ reporterId }).select(LIST_FIELDS).sort(sort).skip(skip).limit(limit).lean();
  },

  countOwned(reporterId) {
    return ReportModel.countDocuments({ reporterId });
  },

  countUnseen(reporterId) {
    return ReportModel.countDocuments({ reporterId, reporterSeen: false });
  },

  /** Returns true if the report was the reporter's. */
  async markSeen(id, reporterId) {
    const result = await ReportModel.updateOne({ _id: id, reporterId }, { $set: { reporterSeen: true } });
    return result.matchedCount === 1;
  },

  /** { checkId: newest report status } for History rows. */
  async latestStatusByCheckIds(checkIds) {
    const reports = await ReportModel.find({ checkId: { $in: checkIds } })
      .select('checkId status createdAt')
      .sort({ createdAt: 1 })
      .lean();
    const statuses = {};
    for (const report of reports) {
      statuses[String(report.checkId)] = report.status;
    }
    return statuses;
  },

  /** The newest report on one check, or null. */
  findLatestForCheck(checkId) {
    return ReportModel.findOne({ checkId }).sort({ createdAt: -1 }).lean();
  },

  findPageByStatus(status, { skip, limit, sort }) {
    return ReportModel.find({ status }).select(LIST_FIELDS).sort(sort).skip(skip).limit(limit).lean();
  },

  countByStatus(status) {
    return ReportModel.countDocuments({ status });
  },

  /** { open, confirmed, overturned } counts and the oldest open report's date. */
  async summary() {
    const counts = await ReportModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const oldestOpen = await ReportModel.findOne({ status: 'open' }).sort({ createdAt: 1 }).select('createdAt').lean();
    const byStatus = { open: 0, confirmed: 0, overturned: 0 };
    for (const row of counts) {
      byStatus[row._id] = row.count;
    }
    return { ...byStatus, oldestOpenAt: oldestOpen?.createdAt ?? null };
  },

  /**
   * Records a decision only if the report is still open, in one atomic step. If two
   * moderators decide the same report at once, only one of them gets the report back;
   * the other gets null (409 ALREADY_DECIDED).
   */
  decideIfOpen(id, changes, session) {
    return ReportModel.findOneAndUpdate(
      { _id: id, status: 'open' },
      { $set: changes },
      { returnDocument: 'after', session, lean: true },
    );
  },

  /** Removes the reporter's id from every report they made (account deletion). */
  async anonymiseReporter(reporterId) {
    await ReportModel.updateMany({ reporterId }, { $set: { reporterId: null } });
  },

  /**
   * Deletes the message copy of every report whose purge date has passed, in one update.
   * Idempotent: a report already purged no longer matches (textPurgedAt is set), so running
   * it twice, or two runs at once, purges each report once. Returns how many were purged.
   */
  async purgeTextDue(now) {
    const result = await ReportModel.updateMany(
      { purgeAt: { $lte: now }, textPurgedAt: null },
      { $unset: { text: '', links: '', reasons: '', 'flags.$[].evidence': '' }, $set: { textPurgedAt: now } },
    );
    return result.modifiedCount;
  },
};

module.exports = { reportRepository };
