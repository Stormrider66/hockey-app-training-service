const exerciseModel = require('../models/exerciseModel');

/**
 * Hämta alla övningar med möjlighet till filtrering och sökning
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getAllExercises(req, res, next) {
  try {
    const { category, search } = req.query;
    const includeInactive = req.query.includeInactive === 'true';
    
    // Endast admins kan se inaktiva övningar
    const activeOnly = !includeInactive || req.user.role !== 'admin';
    
    const exercises = await exerciseModel.getAllExercises({ category, search, activeOnly });
    
    res.status(200).json({
      status: 'success',
      count: exercises.length,
      data: exercises
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hämta en specifik övning baserat på ID
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function getExerciseById(req, res, next) {
  try {
    const { id } = req.params;
    const exercise = await exerciseModel.getExerciseById(id);
    
    // Om övningen är inaktiv, kontrollera behörighet
    if (!exercise.is_active && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Du har inte behörighet att se denna övning'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: exercise
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Skapa en ny övning
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function createExercise(req, res, next) {
  try {
    const exerciseData = { ...req.body, created_by: req.user.id };
    const newExercise = await exerciseModel.createExercise(exerciseData);
    
    res.status(201).json({
      status: 'success',
      message: 'Övningen har skapats',
      data: newExercise
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Uppdatera en existerande övning
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function updateExercise(req, res, next) {
  try {
    const { id } = req.params;
    const exerciseData = { ...req.body, updated_by: req.user.id };
    
    // Lägg till updated_at
    exerciseData.updated_at = new Date();
    
    const updatedExercise = await exerciseModel.updateExercise(id, exerciseData);
    
    res.status(200).json({
      status: 'success',
      message: 'Övningen har uppdaterats',
      data: updatedExercise
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ta bort (inaktivera) en övning
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 */
async function deleteExercise(req, res, next) {
  try {
    const { id } = req.params;
    await exerciseModel.deleteExercise(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Övningen har tagits bort'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
};