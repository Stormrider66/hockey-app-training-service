const { pool } = require('../index');
const { handleDatabaseError, notFoundError } = require('../utils/errorHandler');
const { syncQueue, syncTestResultToUserProfile } = require('../utils/syncService');

/**
 * Beräkna förändring jämfört med tidigare testresultat
 * @param {number} userId - Användar-ID
 * @param {number} testId - Test-ID
 * @param {number} newResult - Nytt testresultat
 * @returns {Promise<number|null>} - Procentuell förändring eller null om inget tidigare resultat finns
 */
async function calculateComparison(userId, testId, newResult) {
  try {
    const query = `
      SELECT result 
      FROM hockey_training.test_results 
      WHERE user_id = $1 AND test_id = $2 
      ORDER BY test_date DESC, created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, testId]);
    
    if (result.rows.length === 0) {
      return null; // Inget tidigare resultat
    }
    
    const previousResult = parseFloat(result.rows[0].result);
    
    if (previousResult === 0) {
      return null; // Undvik division med noll
    }
    
    // Beräkna procentuell förändring ((new - old) / old) * 100
    const change = ((newResult - previousResult) / previousResult) * 100;
    
    // Avrunda till 2 decimaler
    return Math.round(change * 100) / 100;
  } catch (error) {
    console.error('Fel vid beräkning av jämförelse:', error);
    return null; // Om något går fel, returnera null
  }
}

/**
 * Hämta alla testresultat med möjlighet att filtrera
 * @param {Object} options - Filtreringsalternativ
 * @param {number} [options.userId] - Filtrera på användar-ID
 * @param {number} [options.teamId] - Filtrera på lag-ID
 * @param {number} [options.testId] - Filtrera på test-ID
 * @param {string} [options.testType] - Filtrera på testtyp
 * @param {Date} [options.startDate] - Filtrera på startdatum
 * @param {Date} [options.endDate] - Filtrera på slutdatum
 * @returns {Promise<Array>} - Lista med testresultat
 */
async function getTestResults(options = {}) {
  const { userId, teamId, testId, testType, startDate, endDate } = options;
  
  let query = `
    SELECT r.*, t.name as test_name
    FROM hockey_training.test_results r
    JOIN hockey_training.tests t ON r.test_id = t.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (userId) {
    params.push(userId);
    query += ` AND r.user_id = $${params.length}`;
  }
  
  if (teamId) {
    params.push(teamId);
    query += ` AND r.team_id = $${params.length}`;
  }
  
  if (testId) {
    params.push(testId);
    query += ` AND r.test_id = $${params.length}`;
  }
  
  if (testType) {
    params.push(testType);
    query += ` AND r.test_type = $${params.length}`;
  }
  
  if (startDate) {
    params.push(startDate);
    query += ` AND r.test_date >= $${params.length}`;
  }
  
  if (endDate) {
    params.push(endDate);
    query += ` AND r.test_date <= $${params.length}`;
  }
  
  query += ` ORDER BY r.test_date DESC, r.created_at DESC`;
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta ett testresultat baserat på ID
 * @param {number} id - Testresultat-ID
 * @returns {Promise<Object>} - Testresultatinformation
 */
async function getTestResultById(id) {
  try {
    const query = `
      SELECT r.*, t.name as test_name
      FROM hockey_training.test_results r
      JOIN hockey_training.tests t ON r.test_id = t.id
      WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw notFoundError('Testresultatet kunde inte hittas');
    }
    
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Skapa ett nytt testresultat
 * @param {Object} testResult - Testresultatdata
 * @param {number} testResult.test_id - Test-ID
 * @param {number} testResult.user_id - Användar-ID
 * @param {number} [testResult.team_id] - Lag-ID
 * @param {Date} testResult.test_date - Testdatum
 * @param {number} testResult.result - Testresultat
 * @param {string} testResult.unit - Måttenhet
 * @param {string} testResult.test_type - Testtyp
 * @param {string} [testResult.notes] - Anteckningar
 * @param {number} testResult.created_by - Användar-ID för den som registrerar resultatet
 * @param {string} [token] - JWT-token för synkronisering till user-service
 * @returns {Promise<Object>} - Det nya testresultatet med ID
 */
async function createTestResult(testResult, token) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      test_id, user_id, team_id, test_date, result, 
      unit, test_type, notes, created_by
    } = testResult;
    
    // Beräkna jämförelse med tidigare resultat
    const comparison = await calculateComparison(user_id, test_id, result);
    
    const query = `
      INSERT INTO hockey_training.test_results
        (test_id, user_id, team_id, test_date, result, unit, test_type, 
        notes, comparison_to_previous, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *
    `;
    
    const values = [
      test_id, user_id, team_id || null, test_date, result, 
      unit, test_type, notes || null, comparison, created_by
    ];
    
    const queryResult = await client.query(query, values);
    const newTestResult = queryResult.rows[0];
    
    await client.query('COMMIT');
    
    // Synkronisera till user-service om token finns
    if (token) {
      // Lägg till i synkroniseringskön
      syncQueue.addTask(syncTestResultToUserProfile, newTestResult.id, token);
    }
    
    return newTestResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw handleDatabaseError(error);
  } finally {
    client.release();
  }
}

/**
 * Uppdatera ett existerande testresultat
 * @param {number} id - Testresultat-ID
 * @param {Object} testResult - Testresultatdata att uppdatera
 * @param {string} [token] - JWT-token för synkronisering till user-service
 * @returns {Promise<Object>} - Det uppdaterade testresultatet
 */
async function updateTestResult(id, testResult, token) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Först, kontrollera att testresultatet finns
    const existingResult = await getTestResultById(id);
    
    // Bygg uppdateringsquery
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Om resultatet ändras, uppdatera jämförelsen
    if (testResult.result && testResult.result !== existingResult.result) {
      const comparison = await calculateComparison(
        existingResult.user_id, 
        existingResult.test_id, 
        testResult.result
      );
      testResult.comparison_to_previous = comparison;
    }
    
    for (const [key, value] of Object.entries(testResult)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    // Alltid uppdatera updated_at
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return existingResult;
    }
    
    // Lägg till id som sista parameter
    values.push(id);
    
    const query = `
      UPDATE hockey_training.test_results
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    const updatedTestResult = result.rows[0];
    
    await client.query('COMMIT');
    
    // Synkronisera till user-service om token finns
    if (token) {
      syncQueue.addTask(syncTestResultToUserProfile, updatedTestResult.id, token);
    }
    
    return updatedTestResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw handleDatabaseError(error);
  } finally {
    client.release();
  }
}

/**
 * Ta bort ett testresultat
 * @param {number} id - Testresultat-ID
 * @returns {Promise<boolean>} - true om borttagning lyckades
 */
async function deleteTestResult(id) {
  try {
    // Kontrollera att testresultatet finns
    await getTestResultById(id);
    
    const query = `
      DELETE FROM hockey_training.test_results
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    return true;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta teststatistik över tid för en användare
 * @param {number} userId - Användar-ID
 * @param {number} testId - Test-ID
 * @param {Object} options - Alternativ
 * @param {Date} [options.startDate] - Startdatum
 * @param {Date} [options.endDate] - Slutdatum
 * @param {number} [options.limit=10] - Max antal resultat
 * @returns {Promise<Array>} - Lista med testresultat över tid
 */
async function getUserTestHistory(userId, testId, options = {}) {
  const { startDate, endDate, limit = 10 } = options;
  
  let query = `
    SELECT r.*, t.name as test_name
    FROM hockey_training.test_results r
    JOIN hockey_training.tests t ON r.test_id = t.id
    WHERE r.user_id = $1 AND r.test_id = $2
  `;
  
  const params = [userId, testId];
  let paramCount = 3;
  
  if (startDate) {
    query += ` AND r.test_date >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }
  
  if (endDate) {
    query += ` AND r.test_date <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }
  
  query += ` ORDER BY r.test_date ASC LIMIT $${paramCount}`;
  params.push(limit);
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta lagstatistik för ett specifikt test
 * @param {number} teamId - Lag-ID
 * @param {number} testId - Test-ID
 * @param {Date} [date=null] - Om angivet, hämta resultat närmast detta datum
 * @returns {Promise<Array>} - Statistik för lagets medlemmar
 */
async function getTeamTestStatistics(teamId, testId, date = null) {
  try {
    let query;
    const params = [teamId, testId];
    
    if (date) {
      // Hämta resultat närmast det angivna datumet för varje spelare
      query = `
        WITH latest_results AS (
          SELECT DISTINCT ON (user_id) *
          FROM hockey_training.test_results
          WHERE team_id = $1 AND test_id = $2
          ORDER BY user_id, ABS(test_date - $3::date) ASC, test_date DESC
        )
        SELECT lr.*, t.name as test_name
        FROM latest_results lr
        JOIN hockey_training.tests t ON lr.test_id = t.id
        ORDER BY lr.result DESC
      `;
      params.push(date);
    } else {
      // Hämta de senaste resultaten för varje spelare
      query = `
        WITH latest_results AS (
          SELECT DISTINCT ON (user_id) *
          FROM hockey_training.test_results
          WHERE team_id = $1 AND test_id = $2
          ORDER BY user_id, test_date DESC, created_at DESC
        )
        SELECT lr.*, t.name as test_name
        FROM latest_results lr
        JOIN hockey_training.tests t ON lr.test_id = t.id
        ORDER BY lr.result DESC
      `;
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
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