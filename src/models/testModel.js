const { pool } = require('../index');
const { handleDatabaseError, notFoundError } = require('../utils/errorHandler');

/**
 * Hämta alla tester med möjlighet att filtrera på typ
 * @param {Object} options - Filtreringsalternativ
 * @param {string} [options.type] - Testtyp att filtrera på
 * @param {boolean} [options.activeOnly=true] - Returnera endast aktiva tester
 * @returns {Promise<Array>} - Lista med tester
 */
async function getAllTests(options = {}) {
  const { type, activeOnly = true } = options;
  
  let query = `
    SELECT * FROM hockey_training.tests
    WHERE 1=1
  `;
  
  const params = [];
  
  if (activeOnly) {
    query += ` AND is_active = true`;
  }
  
  if (type) {
    params.push(type);
    query += ` AND test_type = $${params.length}`;
  }
  
  query += ` ORDER BY name ASC`;
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta ett test baserat på ID
 * @param {number} id - Test-ID
 * @returns {Promise<Object>} - Testinformation
 */
async function getTestById(id) {
  try {
    const query = `
      SELECT * FROM hockey_training.tests
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw notFoundError('Testet kunde inte hittas');
    }
    
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Skapa ett nytt test
 * @param {Object} test - Testdata
 * @param {string} test.name - Namn på testet
 * @param {string} test.description - Beskrivning
 * @param {string} test.test_type - Testtyp (från enum test_type)
 * @param {string} test.unit - Måttenhet (från enum test_unit)
 * @param {string} [test.instructions] - Utförandeinstruktioner
 * @param {Array<string>} [test.equipment] - Utrustning som behövs
 * @param {number} test.created_by - Användar-ID för den som skapar testet
 * @returns {Promise<Object>} - Det nya testet med ID
 */
async function createTest(test) {
  try {
    const { 
      name, description, test_type, unit, instructions, 
      equipment, created_by
    } = test;
    
    const query = `
      INSERT INTO hockey_training.tests
        (name, description, test_type, unit, instructions, equipment, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      name, 
      description, 
      test_type, 
      unit, 
      instructions || null, 
      equipment || null, 
      created_by
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Uppdatera ett existerande test
 * @param {number} id - Test-ID
 * @param {Object} test - Testdata att uppdatera
 * @returns {Promise<Object>} - Det uppdaterade testet
 */
async function updateTest(id, test) {
  try {
    // Först, kontrollera att testet finns
    const existingTest = await getTestById(id);
    
    // Bygg uppdateringsquery
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(test)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    // Lägg alltid till updated_at
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return existingTest;
    }
    
    // Lägg till id som sista parameter
    values.push(id);
    
    const query = `
      UPDATE hockey_training.tests
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Markera ett test som inaktivt (soft delete)
 * @param {number} id - Test-ID
 * @returns {Promise<boolean>} - true om borttagning lyckades
 */
async function deleteTest(id) {
  try {
    // Kontrollera att testet finns
    await getTestById(id);
    
    // Kontrollera om det finns testresultat kopplade till testet
    const checkQuery = `
      SELECT COUNT(*) FROM hockey_training.test_results
      WHERE test_id = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [id]);
    const count = parseInt(checkResult.rows[0].count);
    
    if (count > 0) {
      // Om det finns testresultat, gör en soft delete
      const query = `
        UPDATE hockey_training.tests
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      await pool.query(query, [id]);
    } else {
      // Annars, gör en hard delete
      const query = `
        DELETE FROM hockey_training.tests
        WHERE id = $1
      `;
      
      await pool.query(query, [id]);
    }
    
    return true;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest
};