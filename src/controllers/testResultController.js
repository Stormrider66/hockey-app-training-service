const testResultModel = require('../models/testResultModel');
const { userServiceClient } = require('../utils/serviceClient');

/**
 * Hämta testresultat med möjlighet till filtrering
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getTestResults(req, res, next) {
  try {
    const { userId, teamId, testId, testType, startDate, endDate } = req.query;
    
    // Kontrollera behörigheter
    if (userId && userId !== req.user.id.toString() && req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att se testresultat för denna användare'
      });
    }
    
    // Om en användare inte är admin eller team_admin eller coach och försöker hämta ett lags resultat
    if (teamId && req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      // Kontrollera om användaren har tillgång till laget
      const hasAccess = await userServiceClient.checkTeamAccess(
        req.user.id, 
        teamId, 
        req.headers.authorization?.split(' ')[1] || req.header('x-auth-token')
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Du har inte behörighet att se testresultat för detta lag'
        });
      }
    }
    
    const testResults = await testResultModel.getTestResults({
      userId, teamId, testId, testType, startDate, endDate
    });
    
    res.status(200).json({
      status: 'success',
      count: testResults.length,
      data: testResults
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hämta ett specifikt testresultat baserat på ID
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getTestResultById(req, res, next) {
  try {
    const { id } = req.params;
    const testResult = await testResultModel.getTestResultById(id);
    
    // Kontrollera behörigheter
    if (testResult.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      // Om användaren är coach, verifiera att de har tillgång till laget
      if (req.user.role === 'coach' && testResult.team_id) {
        const hasAccess = await userServiceClient.checkTeamAccess(
          req.user.id, 
          testResult.team_id, 
          req.headers.authorization?.split(' ')[1] || req.header('x-auth-token')
        );
        
        if (!hasAccess) {
          return res.status(403).json({
            status: 'error',
            message: 'Du har inte behörighet att se detta testresultat'
          });
        }
      } else {
        return res.status(403).json({
          status: 'error',
          message: 'Du har inte behörighet att se detta testresultat'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: testResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Skapa ett nytt testresultat
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function createTestResult(req, res, next) {
  try {
    // Lägg till vem som skapat resultatet
    const testResultData = { ...req.body, created_by: req.user.id };
    
    // Hämta token för synkronisering med user-service
    const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
    
    // Om en annan användare än den inloggade användaren, kontrollera behörigheter
    if (testResultData.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att registrera testresultat för andra användare'
      });
    }
    
    // Om en användare är coach, verifiera att de har tillgång till laget
    if (req.user.role === 'coach' && testResultData.team_id) {
      const hasAccess = await userServiceClient.checkTeamAccess(
        req.user.id, 
        testResultData.team_id, 
        token
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Du har inte behörighet för detta lag'
        });
      }
    }
    
    const newTestResult = await testResultModel.createTestResult(testResultData, token);
    
    res.status(201).json({
      status: 'success',
      message: 'Testresultatet har registrerats',
      data: newTestResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Uppdatera ett existerande testresultat
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function updateTestResult(req, res, next) {
  try {
    const { id } = req.params;
    
    // Hämta befintligt testresultat för behörighetskontroll
    const existingResult = await testResultModel.getTestResultById(id);
    
    // Kontrollera behörigheter
    if (existingResult.created_by !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'team_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att uppdatera detta testresultat'
      });
    }
    
    // Hämta token för synkronisering med user-service
    const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
    
    // Lägg till vem som uppdaterat resultatet
    const testResultData = { ...req.body, updated_by: req.user.id };
    
    const updatedTestResult = await testResultModel.updateTestResult(id, testResultData, token);
    
    res.status(200).json({
      status: 'success',
      message: 'Testresultatet har uppdaterats',
      data: updatedTestResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ta bort ett testresultat
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function deleteTestResult(req, res, next) {
  try {
    const { id } = req.params;
    
    // Hämta befintligt testresultat för behörighetskontroll
    const existingResult = await testResultModel.getTestResultById(id);
    
    // Kontrollera behörigheter - endast admin, team_admin eller den som skapat resultatet kan ta bort det
    if (existingResult.created_by !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'team_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att ta bort detta testresultat'
      });
    }
    
    await testResultModel.deleteTestResult(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Testresultatet har tagits bort'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hämta testhistorik för en användare
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getUserTestHistory(req, res, next) {
  try {
    const { userId, testId } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    // Kontrollera behörigheter
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att se testhistorik för denna användare'
      });
    }
    
    // Om användaren är coach, verifiera att användaren tillhör ett lag som coachen har tillgång till
    if (req.user.role === 'coach') {
      const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
      const userData = await userServiceClient.getUser(userId, token);
      
      let hasAccess = false;
      
      // Kontrollera om coachen har tillgång till något av spelarens lag
      if (userData && userData.teams && userData.teams.length > 0) {
        for (const team of userData.teams) {
          const teamAccess = await userServiceClient.checkTeamAccess(req.user.id, team.id, token);
          if (teamAccess) {
            hasAccess = true;
            break;
          }
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Du har inte behörighet att se testhistorik för denna användare'
        });
      }
    }
    
    const history = await testResultModel.getUserTestHistory(
      userId, 
      testId, 
      { startDate, endDate, limit: limit ? parseInt(limit) : 10 }
    );
    
    res.status(200).json({
      status: 'success',
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hämta teststatistik för ett lag
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getTeamTestStatistics(req, res, next) {
  try {
    const { teamId, testId } = req.params;
    const { date } = req.query;
    
    // Kontrollera behörigheter
    if (req.user.role !== 'admin' && req.user.role !== 'team_admin' && req.user.role !== 'coach') {
      // Verifiera att användaren har tillgång till laget
      const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
      const hasAccess = await userServiceClient.checkTeamAccess(req.user.id, teamId, token);
      
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Du har inte behörighet att se teststatistik för detta lag'
        });
      }
    }
    
    const statistics = await testResultModel.getTeamTestStatistics(teamId, testId, date);
    
    res.status(200).json({
      status: 'success',
      count: statistics.length,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTestResults,
  getTestResultById,
  createTestResult,
  updateTestResult,
  deleteTestResult,
  getUserTestHistory,
  getTeamTestStatistics
};