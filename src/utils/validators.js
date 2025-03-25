const { body, param, query, validationResult } = require('express-validator');

/**
 * Felhantering för valideringsfel
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {Function} next - Express next funktion
 * @returns {Object|undefined} - Felmeddelande eller går vidare
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Valideringsfel',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Validering för övningshantering
const exerciseValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Övningsnamn krävs')
      .isLength({ max: 100 }).withMessage('Övningsnamn får inte överskrida 100 tecken'),
    
    body('category')
      .notEmpty().withMessage('Kategori krävs')
      .isIn(['strength', 'cardio', 'mobility', 'skill', 'recovery', 'warmup', 'cooldown', 'specialized'])
      .withMessage('Ogiltig övningskategori'),
    
    body('equipment')
      .optional()
      .isArray().withMessage('Utrustning måste vara en lista'),
    
    body('muscle_groups')
      .optional()
      .isArray().withMessage('Muskelgrupper måste vara en lista'),
    
    body('video_url')
      .optional()
      .isURL().withMessage('Ogiltig video-URL'),
    
    body('image_url')
      .optional()
      .isURL().withMessage('Ogiltig bild-URL')
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt övnings-ID'),
    
    body('name')
      .optional()
      .isLength({ max: 100 }).withMessage('Övningsnamn får inte överskrida 100 tecken'),
    
    body('category')
      .optional()
      .isIn(['strength', 'cardio', 'mobility', 'skill', 'recovery', 'warmup', 'cooldown', 'specialized'])
      .withMessage('Ogiltig övningskategori'),
    
    body('equipment')
      .optional()
      .isArray().withMessage('Utrustning måste vara en lista'),
    
    body('muscle_groups')
      .optional()
      .isArray().withMessage('Muskelgrupper måste vara en lista'),
    
    body('video_url')
      .optional()
      .isURL().withMessage('Ogiltig video-URL'),
    
    body('image_url')
      .optional()
      .isURL().withMessage('Ogiltig bild-URL')
  ],
  
  getById: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt övnings-ID')
  ],
  
  delete: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt övnings-ID')
  ],
  
  list: [
    query('category')
      .optional()
      .isIn(['strength', 'cardio', 'mobility', 'skill', 'recovery', 'warmup', 'cooldown', 'specialized'])
      .withMessage('Ogiltig övningskategori'),
    
    query('search')
      .optional()
      .isLength({ min: 2 }).withMessage('Sökterm måste vara minst 2 tecken')
  ]
};

// Validering för testhantering
const testValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Testnamn krävs')
      .isLength({ max: 100 }).withMessage('Testnamn får inte överskrida 100 tecken'),
    
    body('test_type')
      .notEmpty().withMessage('Testtyp krävs')
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp'),
    
    body('unit')
      .notEmpty().withMessage('Måttenhet krävs')
      .isIn(['kg', 'reps', 'sec', 'min', 'cm', 'm', 'km/h', 'score', 'percent'])
      .withMessage('Ogiltig måttenhet'),
    
    body('equipment')
      .optional()
      .isArray().withMessage('Utrustning måste vara en lista')
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID'),
    
    body('name')
      .optional()
      .isLength({ max: 100 }).withMessage('Testnamn får inte överskrida 100 tecken'),
    
    body('test_type')
      .optional()
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp'),
    
    body('unit')
      .optional()
      .isIn(['kg', 'reps', 'sec', 'min', 'cm', 'm', 'km/h', 'score', 'percent'])
      .withMessage('Ogiltig måttenhet'),
    
    body('equipment')
      .optional()
      .isArray().withMessage('Utrustning måste vara en lista')
  ],
  
  getById: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID')
  ],
  
  delete: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID')
  ],
  
  list: [
    query('type')
      .optional()
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp')
  ]
};

// Validering för testresultat
const testResultValidators = {
  create: [
    body('test_id')
      .notEmpty().withMessage('Test-ID krävs')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID'),
    
    body('user_id')
      .notEmpty().withMessage('Användar-ID krävs')
      .isInt({ min: 1 }).withMessage('Ogiltigt användar-ID'),
    
    body('team_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Ogiltigt lag-ID'),
    
    body('test_date')
      .notEmpty().withMessage('Testdatum krävs')
      .isDate().withMessage('Ogiltigt datumformat'),
    
    body('result')
      .notEmpty().withMessage('Testresultat krävs')
      .isNumeric().withMessage('Resultatet måste vara ett nummer'),
    
    body('unit')
      .notEmpty().withMessage('Måttenhet krävs')
      .isIn(['kg', 'reps', 'sec', 'min', 'cm', 'm', 'km/h', 'score', 'percent'])
      .withMessage('Ogiltig måttenhet'),
    
    body('test_type')
      .notEmpty().withMessage('Testtyp krävs')
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp')
  ],
  
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt testresultat-ID'),
    
    body('test_date')
      .optional()
      .isDate().withMessage('Ogiltigt datumformat'),
    
    body('result')
      .optional()
      .isNumeric().withMessage('Resultatet måste vara ett nummer'),
    
    body('unit')
      .optional()
      .isIn(['kg', 'reps', 'sec', 'min', 'cm', 'm', 'km/h', 'score', 'percent'])
      .withMessage('Ogiltig måttenhet'),
    
    body('test_type')
      .optional()
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp')
  ],
  
  getById: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt testresultat-ID')
  ],
  
  delete: [
    param('id')
      .isInt({ min: 1 }).withMessage('Ogiltigt testresultat-ID')
  ],
  
  list: [
    query('userId')
      .optional()
      .isInt({ min: 1 }).withMessage('Ogiltigt användar-ID'),
    
    query('teamId')
      .optional()
      .isInt({ min: 1 }).withMessage('Ogiltigt lag-ID'),
    
    query('testId')
      .optional()
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID'),
    
    query('testType')
      .optional()
      .isIn(['strength', 'speed', 'endurance', 'agility', 'technique', 'power', 'reaction', 'coordination'])
      .withMessage('Ogiltig testtyp'),
    
    query('startDate')
      .optional()
      .isDate().withMessage('Ogiltigt startdatum'),
    
    query('endDate')
      .optional()
      .isDate().withMessage('Ogiltigt slutdatum')
  ],
  
  history: [
    param('userId')
      .isInt({ min: 1 }).withMessage('Ogiltigt användar-ID'),
    
    param('testId')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID'),
    
    query('startDate')
      .optional()
      .isDate().withMessage('Ogiltigt startdatum'),
    
    query('endDate')
      .optional()
      .isDate().withMessage('Ogiltigt slutdatum'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Gräns måste vara mellan 1 och 100')
  ],
  
  teamStats: [
    param('teamId')
      .isInt({ min: 1 }).withMessage('Ogiltigt lag-ID'),
    
    param('testId')
      .isInt({ min: 1 }).withMessage('Ogiltigt test-ID'),
    
    query('date')
      .optional()
      .isDate().withMessage('Ogiltigt datum')
  ]
};

module.exports = {
  handleValidationErrors,
  exerciseValidators,
  testValidators,
  testResultValidators
};