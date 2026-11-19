const { UserModel } = require('./user.model');

const userRepository = {
  /** data: { email, passwordHash, role?, isDemo? } */
  create(data) {
    return UserModel.create(data);
  },

  findById(id) {
    return UserModel.findById(id);
  },

  /** True while the account exists (an access token can outlive a deleted account by minutes). */
  async existsById(id) {
    return (await UserModel.exists({ _id: id })) !== null;
  },

  findByEmail(email) {
    return UserModel.findOne({ email });
  },

  async updatePasswordHash(id, passwordHash) {
    await UserModel.updateOne({ _id: id }, { $set: { passwordHash } });
  },

  async deleteById(id) {
    await UserModel.deleteOne({ _id: id });
  },
};

module.exports = { userRepository };
