const { z } = require('zod');
const { actorOf } = require('../../middleware/requireAuth');
const { currentPasswordField, newPasswordField } = require('../auth/auth.schemas');
const { clearRefreshCookie, setRefreshCookie } = require('../auth/authCookies');
const profileService = require('./profile.service');
const { toUserResponse } = require('./user.mapper');

const changePasswordSchema = z.object({
  currentPassword: currentPasswordField,
  newPassword: newPasswordField,
});

const deleteAccountSchema = z.object({
  password: currentPasswordField,
});

async function getMe(req, res) {
  const { user, unseenReports } = await profileService.getMe(actorOf(req));
  res.json({ ...toUserResponse(user), unseenReports });
}

async function changePassword(req, res) {
  const input = changePasswordSchema.parse(req.body ?? {});
  const session = await profileService.changePassword(actorOf(req), input);
  setRefreshCookie(res, session.refreshToken);
  res.json({ accessToken: session.accessToken });
}

async function deleteAccount(req, res) {
  const { password } = deleteAccountSchema.parse(req.body ?? {});
  await profileService.deleteAccount(actorOf(req), password);
  clearRefreshCookie(res);
  res.status(204).end();
}

module.exports = { getMe, changePassword, deleteAccount };
