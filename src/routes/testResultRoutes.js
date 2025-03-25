const express = require('express');
const router = express.Router();
const testResultController = require('../controllers/testResultController');
const { testResultValidators, handleValidationErrors } = require('../utils/validators');
const { isAdmin, isAdminOrTeamAdmin, isTeamStaff, hasTeamAccess } = require('../middleware/roleCheck');

/**
 * @route   GET /api/test-results
 * @desc    Hämta testresultat med möjlighet till filtrering
 * @access  Private (behörighetskontroll sker i controller)
 */
router.get(
  '/',
  testResultValidators.list,
  handleValidationErrors,
  testResultController.getTestResults
);

/**
 * @route   GET /api/test-results/:id
 * @desc    Hämta ett specifikt testresultat med ID
 * @access  Private (behörighetskontroll sker i controller)
 */
router.get(
  '/:id',
  testResultValidators.getById,
  handleValidationErrors,
  testResultController.getTestResultById
);

/**
 * @route   POST /api/test-results
 * @desc    Skapa ett nytt testresultat
 * @access  Team Staff eller användaren själv
 */
router.post(
  '/',
  testResultValidators.create,
  handleValidationErrors,
  testResultController.createTestResult
);

/**
 * @route   PUT /api/test-results/:id
 * @desc    Uppdatera ett existerande testresultat
 * @access  Team Staff eller den som skapat resultatet
 */
router.put(
  '/:id',
  testResultValidators.update,
  handleValidationErrors,
  testResultController.updateTestResult
);

/**
 * @route   DELETE /api/test-results/:id
 * @desc    Ta bort ett testresultat
 * @access  Admin, Team Admin eller den som skapat resultatet
 */
router.delete(
  '/:id',
  testResultValidators.delete,
  handleValidationErrors,
  testResultController.deleteTestResult
);

/**
 * @route   GET /api/test-results/user/:userId/test/:testId
 * @desc    Hämta testhistorik för en användare och ett specifikt test
 * @access  Private (behörighetskontroll sker i controller)
 */
router.get(
  '/user/:userId/test/:testId',
  testResultValidators.history,
  handleValidationErrors,
  testResultController.getUserTestHistory
);

/**
 * @route   GET /api/test-results/team/:teamId/test/:testId
 * @desc    Hämta teststatistik för ett lag
 * @access  Team Staff och lagmedlemmar
 */
router.get(
  '/team/:teamId/test/:testId',
  testResultValidators.teamStats,
  handleValidationErrors,
  hasTeamAccess,
  testResultController.getTeamTestStatistics
);

module.exports = router;