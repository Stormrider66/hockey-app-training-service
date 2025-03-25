/**
 * Hantera databasfel och omvandla till ändpunktsvar
 * @param {Object} error - Databasfel
 * @returns {Error} - Formaterad felrespons
 */
function handleDatabaseError(error) {
  console.error('Database error:', error);
  
  // Kontrollera PostgreSQL-specifika felkoder
  if (error.code) {
    // Unique constraint violation
    if (error.code === '23505') {
      const uniqueError = new Error(getUniqueViolationMessage(error));
      uniqueError.statusCode = 400;
      return uniqueError;
    }
    
    // Foreign key constraint violation
    if (error.code === '23503') {
      const fkError = new Error(getForeignKeyViolationMessage(error));
      fkError.statusCode = 400;
      return fkError;
    }
    
    // Check constraint violation
    if (error.code === '23514') {
      const checkError = new Error('Ogiltig data: ett eller flera villkor uppfylldes inte');
      checkError.statusCode = 400;
      return checkError;
    }
  }
  
  // Om felmeddelandet redan är formaterat med en statuskod
  if (error.statusCode) {
    return error;
  }
  
  // Generellt fel
  const serverError = new Error('Ett databasfel inträffade');
  serverError.statusCode = 500;
  return serverError;
}

/**
 * Extrahera ett användarvänligt meddelande från PostgreSQL unique constraint violation
 * @param {Object} error - PostgreSQL-fel
 * @returns {string} - Användarvänligt felmeddelande
 */
function getUniqueViolationMessage(error) {
  try {
    const detail = error.detail;
    const match = detail.match(/\((.+?)\)=\((.+?)\)/);
    
    if (match && match.length >= 3) {
      const field = match[1];
      const value = match[2];
      const readableField = mapFieldToReadable(field);
      
      return `${readableField} '${value}' existerar redan.`;
    }
    
    return 'Posten existerar redan.';
  } catch (err) {
    console.error('Error parsing unique violation:', err);
    return 'Posten existerar redan.';
  }
}

/**
 * Extrahera ett användarvänligt meddelande från PostgreSQL foreign key constraint violation
 * @param {Object} error - PostgreSQL-fel
 * @returns {string} - Användarvänligt felmeddelande
 */
function getForeignKeyViolationMessage(error) {
  try {
    const detail = error.detail;
    const tableMatch = detail.match(/table "(.+?)"/i);
    let table = tableMatch && tableMatch[1] ? tableMatch[1] : 'en relaterad post';
    
    // Ta bort schema-prefixet om det finns
    if (table.includes('.')) {
      table = table.split('.')[1];
    }
    
    const readableTable = mapTableToReadable(table);
    
    if (detail.includes('still referenced')) {
      return `Kan inte ta bort posten eftersom den används av ${readableTable}.`;
    } else {
      return `Refererad ${readableTable} existerar inte.`;
    }
  } catch (err) {
    console.error('Error parsing foreign key violation:', err);
    return 'Ett relaterat data-fel har inträffat.';
  }
}

/**
 * Omvandla databaskolumnnamn till läsbara svenska namn
 * @param {string} field - Databaskolumnnamn
 * @returns {string} - Läsbart namn
 */
function mapFieldToReadable(field) {
  const fieldMap = {
    'name': 'Namnet',
    'email': 'E-postadressen',
    'username': 'Användarnamnet',
    'test_id': 'Test-ID',
    'exercise_id': 'Övnings-ID',
    'user_id': 'Användar-ID',
    'team_id': 'Lag-ID',
    'program_id': 'Program-ID',
    'workout_id': 'Träningspass-ID'
  };
  
  return fieldMap[field] || `Fältet '${field}'`;
}

/**
 * Omvandla databastabell-namn till läsbara svenska namn
 * @param {string} table - Databastabell-namn
 * @returns {string} - Läsbart namn
 */
function mapTableToReadable(table) {
  const tableMap = {
    'exercises': 'övningar',
    'tests': 'tester',
    'test_results': 'testresultat',
    'programs': 'träningsprogram',
    'workouts': 'träningspass',
    'workout_exercises': 'träningspassövningar',
    'user_program_logs': 'användarloggar',
    'user_exercise_logs': 'övningsloggar'
  };
  
  return tableMap[table] || table;
}

/**
 * Skapa ett 404 Not Found-fel
 * @param {string} message - Felmeddelande
 * @returns {Error} - Formaterat fel
 */
function notFoundError(message = 'Resursen kunde inte hittas') {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

/**
 * Skapa ett 403 Forbidden-fel
 * @param {string} message - Felmeddelande
 * @returns {Error} - Formaterat fel
 */
function forbiddenError(message = 'Du har inte behörighet till denna resurs') {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

/**
 * Skapa ett 400 Bad Request-fel
 * @param {string} message - Felmeddelande
 * @param {Object} [details] - Ytterligare detaljer
 * @returns {Error} - Formaterat fel
 */
function badRequestError(message = 'Ogiltig förfrågan', details = null) {
  const error = new Error(message);
  error.statusCode = 400;
  if (details) {
    error.details = details;
  }
  return error;
}

/**
 * Skapa ett 500 Internal Server-fel
 * @param {string} message - Felmeddelande
 * @param {Error} [originalError] - Ursprungligt fel för loggning
 * @returns {Error} - Formaterat fel
 */
function serverError(message = 'Ett internt serverfel inträffade', originalError = null) {
  if (originalError) {
    console.error('Internal Server Error:', originalError);
  }
  
  const error = new Error(message);
  error.statusCode = 500;
  return error;
}

/**
 * Hantera valideringsfel från express-validator
 * @param {Array} errors - Fel från validationResult
 * @returns {Error} - Formaterat fel
 */
function validationError(errors) {
  const error = new Error('Valideringsfel');
  error.statusCode = 400;
  error.details = errors.map(err => ({
    field: err.param,
    message: err.msg
  }));
  return error;
}

module.exports = {
  handleDatabaseError,
  notFoundError,
  forbiddenError,
  badRequestError,
  serverError,
  validationError
};