const jwt = require('jsonwebtoken');
const { ERRORS } = require('../constants/constants');

const authenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: ERRORS.UNAUTHORIZED_NO_TOKEN });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_sync_pad_12345');
    req.user = decoded; // Contains id and username
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ message: ERRORS.UNAUTHORIZED_INVALID_TOKEN });
  }
};

module.exports = {
  authenticate
};
