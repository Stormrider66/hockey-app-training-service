const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const { exerciseValidators, handleValidationErrors } = require('../utils/validators');
const { isAdmin, isAdminOrTeamAdmin, isTeamStaff } = require('../middleware/roleCheck');

/**
 * @route   GET /api/exercises
 * @desc    Hämta alla övningar med möjlighet till filtrering
 * @access  Private
 */
router.get(
  '/',
  exerciseValidators.list,
  handleValidationErrors,
  exerciseController.getAllExercises
);

/**
 * @route   GET /api/exercises/:id
 * @desc    Hämta en specifik övning med ID
 * @access  Private
 */
router.get(
  '/:id',
  exerciseValidators.getById,
  handleValidationErrors,
  exerciseController.getExerciseById
);

/**
 * @route   POST /api/exercises
 * @desc    Skapa en ny övning
 * @access  Admin/Team Admin
 */
router.post(
  '/',
  isAdminOrTeamAdmin,
  exerciseValidators.create,
  handleValidationErrors,
  exerciseController.createExercise
);

/**
 * @route   PUT /api/exercises/:id
 * @desc    Uppdatera en existerande övning
 * @access  Admin/Team Admin
 */
router.put(
  '/:id',
  isAdminOrTeamAdmin,
  exerciseValidators.update,
  handleValidationErrors,
  exerciseController.updateExercise
);

/**
 * @route   DELETE /api/exercises/:id
 * @desc    Ta bort (inaktivera) en övning
 * @access  Admin
 */
router.delete(
  '/:id',
  isAdmin,
  exerciseValidators.delete,
  handleValidationErrors,
  exerciseController.deleteExercise
);

module.exports = router;