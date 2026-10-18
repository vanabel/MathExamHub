const cors = require('cors');
const { isOriginAllowed } = require('../config/corsOrigins');

/**
 * @param {import('../config/corsOrigins').CorsOriginList} allowedOrigins
 */
function createCorsPolicyMiddleware(allowedOrigins) {
  const rejectUnknownOrigin = (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin, allowedOrigins)) {
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }
    return next();
  };

  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Bank-Id'],
  });

  return [rejectUnknownOrigin, corsMiddleware];
}

module.exports = { createCorsPolicyMiddleware };
