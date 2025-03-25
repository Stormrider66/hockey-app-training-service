const { body, param, query, validationResult } = require('express-validator');

/**
 * Validera ett datum (YYYY-MM-DD)
 * @param {string} field - Fältnamnet att validera
 * @param {boolean} required - Om fältet är obligatoriskt
 * @param {Object} options - Ytterligare alternativ som min- och maxdatum
 * @returns {Array} - Valideringsregler
 */
const dateValidator = (field, required = true, options = {}) => {
  const validators = [];
  
  // Byggna upp valideringskedjan
  let validator = body(field);
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} är obligatoriskt`);
  } else {
    validator = validator.optional();
  }
  
  // Datum i formatet YYYY-MM-DD
  validators.push(
    validator
      .isDate().withMessage(`${field} måste vara ett giltigt datum (YYYY-MM-DD)`)
  );
  
  // Om minDatum angavs
  if (options.minDate) {
    validators.push(
      body(field)
        .custom(value => {
          if (!value) return true;
          return new Date(value) >= new Date(options.minDate);
        })
        .withMessage(`${field} får inte vara före ${options.minDate}`)
    );
  }
  
  // Om maxDatum angavs
  if (options.maxDate) {
    validators.push(
      body(field)
        .custom(value => {
          if (!value) return true;
          return new Date(value) <= new Date(options.maxDate);
        })
        .withMessage(`${field} får inte vara efter ${options.maxDate}`)
    );
  }
  
  return validators;
};

/**
 * Validera en tid (HH:MM)
 * @param {string} field - Fältnamnet att validera
 * @param {boolean} required - Om fältet är obligatoriskt
 * @returns {Array} - Valideringsregler
 */
const timeValidator = (field, required = true) => {
  const validators = [];
  
  // Byggna upp valideringskedjan
  let validator = body(field);
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} är obligatoriskt`);
  } else {
    validator = validator.optional();
  }
  
  // Tid i formatet HH:MM
  validators.push(
    validator
      .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(`${field} måste vara en giltig tid (HH:MM)`)
  );
  
  return validators;
};

/**
 * Validera att sluttid är efter starttid om de är på samma dag
 * @returns {Array} - Valideringsregler
 */
const eventTimeValidator = () => {
  return [
    body(['start_time', 'end_time', 'session_date'])
      .custom((value, { req }) => {
        // Om vi inte har alla värden, skippa valideringen
        if (!req.body.start_time || !req.body.end_time || !req.body.session_date) {
          return true;
        }
        
        const startTime = req.body.start_time;
        const endTime = req.body.end_time;
        
        // Kontrollera att sluttid är efter starttid
        return startTime < endTime;
      })
      .withMessage('Sluttid måste vara efter starttid')
  ];
};

/**
 * Validera ett ID (positivt heltal)
 * @param {string} paramName - Parameternamnet att validera
 * @param {string} location - Var parametern finns (params, query, body)
 * @param {boolean} required - Om parametern är obligatorisk
 * @returns {Array} - Valideringsregler
 */
const idValidator = (paramName, location = 'params', required = true) => {
  const validators = [];
  
  // Välj rätt validator beroende på plats
  let validator;
  if (location === 'params') {
    validator = param(paramName);
  } else if (location === 'query') {
    validator = query(paramName);
  } else {
    validator = body(paramName);
  }
  
  if (required) {
    validators.push(
      validator
        .notEmpty()
        .withMessage(`${paramName} är obligatoriskt`)
    );
  } else {
    validator = validator.optional();
  }
  
  validators.push(
    validator
      .isInt({ min: 1 })
      .withMessage(`${paramName} måste vara ett positivt heltal`)
  );
  
  return validators;
};

/**
 * Validera sessionstyp
 * @param {string} field - Fältnamnet att validera
 * @param {boolean} required - Om fältet är obligatoriskt
 * @returns {Array} - Valideringsregler
 */
const sessionTypeValidator = (field = 'session_type', required = true) => {
  const validators = [];
  
  // Byggna upp valideringskedjan
  let validator = body(field);
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} är obligatoriskt`);
  } else {
    validator = validator.optional();
  }
  
  // Validera mot tillåtna värden
  validators.push(
    validator
      .isIn(['technique', 'tactical', 'game', 'conditioning', 'mixed'])
      .withMessage(`${field} måste vara en giltig träningstyp (technique, tactical, game, conditioning, mixed)`)
  );
  
  return validators;
};

/**
 * Validera testtyp
 * @param {string} field - Fältnamnet att validera
 * @param {boolean} required - Om fältet är obligatoriskt
 * @returns {Array} - Valideringsregler
 */
const testTypeValidator = (field = 'test_type', required = true) => {
  const validators = [];
  
  // Byggna upp valideringskedjan
  let validator = body(field);
  
  if (required) {
    validator = validator.notEmpty().withMessage(`${field} är obligatoriskt`);
  } else {
    validator = validator.optional();
  }
  
  // Validera mot tillåtna värden
  validators.push(
    validator
      .isIn(['speed', 'strength', 'endurance', 'agility', 'flexibility', 'balance', 'technique', 'vo2max'])
      .withMessage(`${field} måste vara en giltig testtyp`)
  );
  
  return validators;
};

/**
 * Middleware för att hantera valideringsfel
 * @param {Request} req - Request objekt från Express
 * @param {Response} res - Response objekt från Express
 * @param {Function} next - Next funktion från Express
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Valideringsfel',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  dateValidator,
  timeValidator,
  eventTimeValidator,
  idValidator,
  sessionTypeValidator,
  testTypeValidator,
  handleValidationErrors
};