const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; 
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};


// Session middleware must be set up before this in your app
exports.generateAnonymousSession = (req, res, next) => {
  // Initialize session if it doesn't exist
  if (!req.session) {
    req.session = {};
  }

  // Generate or retrieve anonymous ID
  if (!req.session.anonId) {
    req.session.anonId = 'anon_' + crypto.randomBytes(16).toString('hex');
    // Set cookie that lasts 7 days
    res.cookie('anonSession', req.session.anonId, { 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true
    });
  }
  next();
};

exports.anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each session to 50 requests per windowMs
  keyGenerator: (req) => req.session.anonId || req.ip,
  message: 'Too many requests from this session'
});
