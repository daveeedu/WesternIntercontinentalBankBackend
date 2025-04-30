// middleware/socketAuth.js
const jwt = require('jsonwebtoken');

const validateSocketAuth = (socket, next) => {
  try {
    // For authenticated users
    if (socket.handshake.auth.token) {
      const decoded = jwt.verify(
        socket.handshake.auth.token, 
        process.env.JWT_SECRET
      );
      socket.user = decoded;
    }
    // For anonymous users, just proceed
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
};

module.exports = {
  validateSocketAuth
};