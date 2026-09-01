const { verifyAccessToken } = require('../utils/jwt');
const { AuthenticationError } = require('../utils/errorHandler');
const { tokenBlacklist } = require('../controllers/authController');

const verifyToken = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }
    const token = authorization.substring(7);
    if (tokenBlacklist.has(token)) {
      throw new AuthenticationError('Token expired');
    }
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

const verifyTokenOptional = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.substring(7);
      if (!tokenBlacklist.has(token)) {
        req.user = verifyAccessToken(token);
      }
    }
    next();
  } catch {
    next();
  }
};

module.exports = { verifyToken, verifyTokenOptional };
