const jwt = require('jsonwebtoken');

/**
 * Middleware för att verifiera JWT token och sätta req.user
 */
module.exports = (req, res, next) => {
  // Hämta token från Authorization-header eller fallback på x-auth-token
  const authHeader = req.header('Authorization');
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.header('x-auth-token');
  }
  
  // Kontrollera om token finns
  if (!token) {
    return res.status(401).json({ 
      error: true, 
      message: 'Ingen token tillhandahållen, åtkomst nekad' 
    });
  }

  try {
    // Verifiera token
    const jwtSecret = process.env.JWT_SECRET || 'defaultsecretkey';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Kontrollera om användarkontot är aktivt
    if (decoded.user && !decoded.user.active) {
      return res.status(403).json({ 
        error: true, 
        message: 'Användarkontot är inaktivt' 
      });
    }
    
    // Sätt användarinformation på req-objektet för användning i efterföljande routes
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ 
      error: true, 
      message: 'Token är ogiltig' 
    });
  }
};