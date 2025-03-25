const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { testValidators, handleValidationErrors } = require('../utils/validators');
const { isAdmin, isAdminOrTeamAdmin, isTeamStaff } = require('../middleware/roleCheck');

/**
 * @route   GET /api/tests
 * @desc    Hämta alla tester med möjlighet till filtrering
 * @access  Private
 */
router.get(
  '/',
  testValidators.list,
  handleValidationErrors,
  testController.getAllTests
);

/**
 * @route   GET /api/tests/:id
 * @desc    Hämta ett specifikt test med ID
 * @access  Private
 */
router.get(
  '/:id',
  testValidators.getById,
  handleValidationErrors,
  testController.getTestById
);

/**
 * @route   POST /api/tests
 * @desc    Skapa ett nytt test
 * @access  Admin/Team Admin
 */
router.post(
  '/',
  isAdminOrTeamAdmin,
  testValidators.create,
  handleValidationErrors,
  testController.createTest
);

/**
 * @route   PUT /api/tests/:id
 * @desc    Uppdatera ett existerande test
 * @access  Admin/Team Admin
 */
router.put(
  '/:id',
  isAdminOrTeamAdmin,
  testValidators.update,
  handleValidationErrors,
  testController.updateTest
);

/**
 * @route   DELETE /api/tests/:id
 * @desc    Ta bort ett test
 * @access  Admin
 */
router.delete(
  '/:id',
  isAdmin,
  testValidators.delete,
  handleValidationErrors,
  testController.deleteTest
);

module.exports = router;