const { CheckModel } = require('./check.model');

const checkRepository = {
  async create(data) {
    const check = await CheckModel.create(data);
    return check.toObject();
  },

  /** A user's own check, or null (also when it belongs to someone else). */
  findOwned(id, userId) {
    return CheckModel.findOne({ _id: id, userId }).lean();
  },

  /** One page of a user's checks. The list needs only the start of the text and the links. */
  findPageOwned(userId, { skip, limit, sort }) {
    return CheckModel.find({ userId })
      .select('verdict riskLevel flags.code linkCount links.domain links.status text checkedAt source')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  countOwned(userId) {
    return CheckModel.countDocuments({ userId });
  },

  async deleteOwned(id, userId) {
    const result = await CheckModel.deleteOne({ _id: id, userId });
    return result.deletedCount;
  },

  async deleteAllOwned(userId) {
    const result = await CheckModel.deleteMany({ userId });
    return result.deletedCount;
  },
};

module.exports = { checkRepository };
