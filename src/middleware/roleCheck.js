const axios = require('axios');
const { userServiceClient } = require('../utils/serviceClient');

/**
 * Middleware för att verifiera att användaren är admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Användare ej autentiserad' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: true, 
      message: 'Administratörsbehörighet krävs' 
    });
  }

  next();
};

/**
 * Middleware för att verifiera att användaren är admin eller team admin
 */
const isAdminOrTeamAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Användare ej autentiserad' 
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'team_admin') {
    return res.status(403).json({ 
      error: true, 
      message: 'Admin- eller lagledarbehörighet krävs' 
    });
  }

  next();
};

/**
 * Middleware för att verifiera att användaren är admin, team admin eller coach
 */
const isTeamStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Användare ej autentiserad' 
    });
  }

  const allowedRoles = ['admin', 'team_admin', 'coach'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: true, 
      message: 'Lagledare- eller coachbehörighet krävs' 
    });
  }

  next();
};

/**
 * Middleware för att verifiera att användaren har tillgång till ett specifikt lag
 * Kontrollerar att användaren är admin eller har direkt koppling till laget som 
 * lagledare, coach eller spelare
 */
const hasTeamAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Användare ej autentiserad' 
    });
  }

  // Hämta teamId från request params eller query
  const teamId = req.params.teamId || req.query.teamId || req.body.teamId;
  
  if (!teamId) {
    return res.status(400).json({ 
      error: true, 
      message: 'Lag-ID saknas' 
    });
  }

  // Admin har alltid tillgång till alla lag
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    // Extrahera token från Authorization-header
    const authHeader = req.header('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.header('x-auth-token');
    }
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Ingen token tillhandahållen, åtkomst nekad'
      });
    }
    
    // Kontrollera team-tillhörighet via user-service
    const hasAccess = await userServiceClient.checkTeamAccess(req.user.id, teamId, token);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: true, 
        message: 'Du har inte tillgång till detta lag' 
      });
    }
    
    next();
  } catch (err) {
    console.error('Fel vid kontroll av lagbehörighet:', err.message);
    return res.status(500).json({ 
      error: true, 
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