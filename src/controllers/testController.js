const testModel = require('../models/testModel');

/**
 * Hämta alla tester med möjlighet till filtrering
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getAllTests(req, res, next) {
  try {
    const { type } = req.query;
    const includeInactive = req.query.includeInactive === 'true';
    
    // Endast admins kan se inaktiva tester
    const activeOnly = !includeInactive || req.user.role !== 'admin';
    
    const tests = await testModel.getAllTests({ type, activeOnly });
    
    res.status(200).json({
      status: 'success',
      count: tests.length,
      data: tests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hämta ett specifikt test baserat på ID
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getTestById(req, res, next) {
  try {
    const { id } = req.params;
    const test = await testModel.getTestById(id);
    
    // Om testet är inaktivt, kontrollera behörighet
    if (!test.is_active && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att se detta test'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: test
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Skapa ett nytt test
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function createTest(req, res, next) {
  try {
    const testData = { ...req.body, created_by: req.user.id };
    const newTest = await testModel.createTest(testData);
    
    res.status(201).json({
      status: 'success',
      message: 'Testet har skapats',
      data: newTest
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Uppdatera ett existerande test
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function updateTest(req, res, next) {
  try {
    const { id } = req.params;
    const testData = { ...req.body, updated_by: req.user.id };
    
    // Lägg till updated_at
    testData.updated_at = new Date();
    
    const updatedTest = await testModel.updateTest(id, testData);
    
    res.status(200).json({
      status: 'success',
      message: 'Testet har uppdaterats',
      data: updatedTest
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ta bort ett test
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function deleteTest(req, res, next) {
  try {
    const { id } = req.params;
    await testModel.deleteTest(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Testet har tagits bort'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest
};