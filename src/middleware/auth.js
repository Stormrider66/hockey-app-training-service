const jwt = require('jsonwebtoken');

/**
 * Middleware för att verifiera JWT-token och skydda routes
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
module.exports = function(req, res, next) {
  // Hämta token från headers
  let token = null;
  
  // Försök hämta token från Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // Om ingen token i Authorization header, försök med x-auth-token
  if (!token) {
    token = req.header('x-auth-token');
  }
  
  // Kontrollera om token saknas
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Ingen token tillhandahållen, åtkomst nekad'
    });
  }
  
  try {
    // Verifiera token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Kontrollera om användarkontot är aktivt
    if (decoded.user && !decoded.user.active) {
      return res.status(403).json({
        status: 'error',
        message: 'Användarkontot är inaktiverat'
      });
    }
    
    // Sätt användarinformation i request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    
    // Hantera olika JWT-fel
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token har gått ut'
      });
    }
    
    return res.status(401).json({
      status: 'error',
      message: 'Ogiltig token'
    });
  }
};