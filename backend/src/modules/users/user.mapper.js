// The only user shape the API returns: never the password hash.
function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isDemo: user.isDemo,
    createdAt: user.createdAt,
  };
}

module.exports = { toUserResponse };
