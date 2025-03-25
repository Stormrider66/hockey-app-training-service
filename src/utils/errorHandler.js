/**
 * Utility för att hantera databasfel och andra feltyper
 */

/**
 * Hantera databasfel och returnera lämpligt felmeddelande
 * @param {Error} err - Felet som uppstått
 * @param {Response} res - Response objekt från Express
 */
const handleDatabaseError = (err, res) => {
  console.error('Databas fel:', err);
  
  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      error: true,
      message: getUniqueViolationMessage(err)
    });
  }
  
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(409).json({
      error: true,
      message: getForeignKeyViolationMessage(err)
    });
  }
  
  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      error: true,
      message: 'Ett eller flera fält innehåller ogiltiga värden'
    });
  }
  
  // PostgreSQL not null violation
  if (err.code === '23502') {
    const column = err.column || 'Ett obligatoriskt fält';
    return res.status(400).json({
      error: true,
      message: `${mapFieldToReadable(column)} får inte vara tomt`
    });
  }
  
  // Alla andra fel returnerar 500 Internal Server Error
  return serverError(res, err);
};

/**
 * Extrahera mer användarvänligt meddelande från PostgreSQL unique constraint violation
 * @param {Error} err - PostgreSQL fel
 * @returns {string} - Användarvänligt felmeddelande
 */
const getUniqueViolationMessage = (err) => {
  try {
    // Försök hitta vilket fält som orsakade felet
    const detail = err.detail || '';
    const match = detail.match(/\((.+)\)=\((.+)\)/);
    
    if (match && match.length >= 3) {
      const field = match[1];
      const value = match[2];
      
      return `${mapFieldToReadable(field)} med värdet '${value}' finns redan`;
    }
    
    return 'En post med detta värde finns redan';
  } catch (e) {
    return 'En post med detta värde finns redan';
  }
};

/**
 * Extrahera mer användarvänligt meddelande från PostgreSQL foreign key constraint violation
 * @param {Error} err - PostgreSQL fel
 * @returns {string} - Användarvänligt felmeddelande
 */
const getForeignKeyViolationMessage = (err) => {
  try {
    // Försök hitta vilken tabell/relation som orsakade felet
    const detail = err.detail || '';
    const tableMatch = detail.match(/table "(\w+)"/);
    const keyMatch = detail.match(/"(\w+)"/);
    
    if (tableMatch && tableMatch.length >= 2) {
      const table = tableMatch[1];
      
      if (detail.includes('still referenced')) {
        return `Kan inte ta bort denna post eftersom den används av ${mapTableToReadable(table)}`;
      } else {
        return `Refererad ${mapTableToReadable(table)} finns inte`;
      }
    }
    
    return 'Refererad post finns inte eller kan inte raderas pga beroenden';
  } catch (e) {
    return 'Refererad post finns inte eller kan inte raderas pga beroenden';
  }
};

/**
 * Mappa databasfält till mer läsbara svenska namn
 * @param {string} field - Databasfält
 * @returns {string} - Läsbart namn
 */
const mapFieldToReadable = (field) => {
  const fieldMap = {
    'name': 'Namnet',
    'email': 'E-postadressen',
    'title': 'Titeln',
    'session_date': 'Datumet',
    'user_id': 'Användaren',
    'team_id': 'Laget',
    'exercise_id': 'Övningen'
  };
  
  return fieldMap[field] || field;
};

/**
 * Mappa databastabell till mer läsbara svenska namn
 * @param {string} table - Databastabell
 * @returns {string} - Läsbart namn
 */
const mapTableToReadable = (table) => {
  const tableMap = {
    'exercises': 'övningar',
    'ice_sessions': 'isträningar',
    'ice_session_exercises': 'isträningsövningar',
    'physical_training': 'fysträningar',
    'physical_training_exercises': 'fysträningsövningar',
    'test_results': 'testresultat'
  };
  
  return tableMap[table] || table;
};

/**
 * Hantera 404 Not Found
 * @param {Response} res - Response objekt från Express
 * @param {string} message - Felmeddelande
 */
const notFoundError = (res, message = 'Resursen kunde inte hittas') => {
  return res.status(404).json({
    error: true,
    message
  });
};

/**
 * Hantera 403 Forbidden
 * @param {Response} res - Response objekt från Express
 * @param {string} message - Felmeddelande
 */
const forbiddenError = (res, message = 'Du har inte behörighet att utföra denna åtgärd') => {
  return res.status(403).json({
    error: true,
    message
  });
};

/**
 * Hantera 400 Bad Request
 * @param {Response} res - Response objekt från Express
 * @param {string} message - Felmeddelande
 * @param {Object} details - Ytterligare detaljer om felet
 */
const badRequestError = (res, message = 'Ogiltigt förfrågan', details = null) => {
  const response = {
    error: true,
    message
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(400).json(response);
};

/**
 * Hantera 500 Internal Server Error
 * @param {Response} res - Response objekt från Express
 * @param {Error} err - Felet som uppstått
 */
const serverError = (res, err) => {
  console.error('Server fel:', err);
  
  return res.status(500).json({
    error: true,
    message: 'Ett internt serverfel inträffade',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * Hantera valideringsfel från express-validator
 * @param {Response} res - Response objekt från Express
 * @param {Array} errors - Valideringsfel från express-validator
 */
const validationError = (res, errors) => {
  return res.status(400).json({
    error: true,
    message: 'Valideringsfel',
    errors: errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }))
  });
};

module.exports = {
  handleDatabaseError,
  notFoundError,
  forbiddenError,
  badRequestError,
  serverError,
  validationError
};