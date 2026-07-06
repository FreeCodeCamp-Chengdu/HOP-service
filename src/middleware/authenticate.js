const jwt = require('jsonwebtoken'); // Assuming JWT auth
const OAuthCredential = require('../models/OAuthCredential');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user with OAuth credentials
    const credentials = await OAuthCredential.find({ userId: decoded.userId });
    req.user = {
      id: decoded.userId,
      oauthCredentials: credentials
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };
