const { userServiceClient } = require('../utils/serviceClient');

/**
 * Middleware för att kontrollera om användaren är admin
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Administratörsbehörighet krävs'
  });
};

/**
 * Middleware för att kontrollera om användaren är admin eller team admin
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
const isAdminOrTeamAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'team_admin')) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Administratörs- eller lagledarbehörighet krävs'
  });
};

/**
 * Middleware för att kontrollera om användaren är admin, team admin eller coach
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
const isTeamStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'team_admin' || req.user.role === 'coach')) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Administratörs-, lagledare- eller tränarbehörighet krävs'
  });
};

/**
 * Middleware för att kontrollera om användaren har tillgång till ett specifikt lag
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
const hasTeamAccess = async (req, res, next) => {
  // Om användaren är admin, tillåt alltid
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  try {
    // Hämta teamId från request params eller query
    const teamId = req.params.teamId || req.query.teamId || req.body.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        status: 'error',
        message: 'Lag-ID saknas'
      });
    }
    
    // Hämta token från headers
    const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
    
    // Kontrollera om användaren har tillgång till laget
    const hasAccess = await userServiceClient.checkTeamAccess(req.user.id, teamId, token);
    
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte tillgång till detta lag'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking team access:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Kunde inte verifiera lagbehörighet'
    });
  }
};

module.exports = {
  isAdmin,
  isAdminOrTeamAdmin,
  isTeamStaff,
  hasTeamAccess
};