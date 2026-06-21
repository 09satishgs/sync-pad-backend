const { ERRORS } = require('../constants/constants');

const isAdmin = (req, res, next) => {
  const roles = (req.user && req.user.roles) || [];
  const hasAdmin = roles.some(
    (r) =>
      (r.workspace_id === null || r.workspace_id === undefined || r.workspace_id === 0) &&
      r.access === 'admin'
  );

  if (!hasAdmin) {
    return res.status(403).json({ message: ERRORS.FORBIDDEN_ADMIN_REQUIRED });
  }
  next();
};

module.exports = {
  isAdmin
};
