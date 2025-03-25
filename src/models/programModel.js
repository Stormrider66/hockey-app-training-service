const { pool } = require('../index');
const { handleDatabaseError, notFoundError } = require('../utils/errorHandler');

/**
 * Hämta alla träningsprogram med möjlighet att filtrera
 * @param {Object} options - Filtreringsalternativ
 * @param {number} [options.teamId] - Filtrera på lag-ID
 * @param {number} [options.userId] - Filtrera på användar-ID (program tilldelade till användaren)
 * @param {boolean} [options.activeOnly=true] - Returnera endast aktiva program
 * @returns {Promise<Array>} - Lista med träningsprogram
 */
async function getAllPrograms(options = {}) {
  const { teamId, userId, activeOnly = true } = options;
  
  let query = `
    SELECT p.* 
    FROM hockey_training.programs p
  `;
  
  // Om userId är angivet, hämta program tilldelade till denna användare
  if (userId) {
    query = `
      SELECT p.*, pa.completion_status 
      FROM hockey_training.programs p
      JOIN hockey_training.program_assignments pa ON p.id = pa.program_id
      WHERE pa.user_id = $1
    `;
    
    if (activeOnly) {
      query += ` AND p.is_active = true AND pa.is_active = true`;
    }
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
  
  // Lägg till WHERE-villkor för andra filtreringar
  const conditions = [];
  const params = [];
  
  if (activeOnly) {
    conditions.push('p.is_active = true');
  }
  
  if (teamId) {
    params.push(teamId);
    conditions.push(`p.team_id = $${params.length}`);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY p.created_at DESC`;
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta ett träningsprogram baserat på ID
 * @param {number} id - Program-ID
 * @returns {Promise<Object>} - Programinformation
 */
async function getProgramById(id) {
  try {
    const query = `
      SELECT * FROM hockey_training.programs
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw notFoundError('Träningsprogrammet kunde inte hittas');
    }
    
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Skapa ett nytt träningsprogram
 * @param {Object} program - Programdata
 * @param {string} program.name - Namn på programmet
 * @param {string} [program.description] - Beskrivning
 * @param {number} [program.team_id] - Lag-ID om programmet är för ett helt lag
 * @param {boolean} [program.is_team_program=false] - Om programmet är för ett helt lag
 * @param {Date} [program.start_date] - Startdatum för programmet
 * @param {Date} [program.end_date] - Slutdatum för programmet
 * @param {number} program.created_by - Användar-ID för den som skapar programmet
 * @returns {Promise<Object>} - Det nya programmet med ID
 */
async function createProgram(program) {
  try {
    const {
      name, description, team_id, is_team_program = false,
      start_date, end_date, created_by
    } = program;
    
    const query = `
      INSERT INTO hockey_training.programs
        (name, description, team_id, is_team_program, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      name,
      description || null,
      team_id || null,
      is_team_program,
      start_date || null,
      end_date || null,
      created_by
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Uppdatera ett existerande träningsprogram
 * @param {number} id - Program-ID
 * @param {Object} program - Programdata att uppdatera
 * @returns {Promise<Object>} - Det uppdaterade programmet
 */
async function updateProgram(id, program) {
  try {
    // Först, kontrollera att programmet finns
    const existingProgram = await getProgramById(id);
    
    // Bygg uppdateringsquery
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(program)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    // Lägg alltid till updated_at
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return existingProgram;
    }
    
    // Lägg till id som sista parameter
    values.push(id);
    
    const query = `
      UPDATE hockey_training.programs
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
 * Markera ett träningsprogram som inaktivt (soft delete)
 * @param {number} id - Program-ID
 * @returns {Promise<boolean>} - true om borttagning lyckades
 */
async function deleteProgram(id) {
  try {
    // Kontrollera att programmet finns
    await getProgramById(id);
    
    // Markera programmet som inaktivt (soft delete)
    const query = `
      UPDATE hockey_training.programs
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    
    // Markera även alla programtilldelningar som inaktiva
    const assignmentQuery = `
      UPDATE hockey_training.program_assignments
      SET is_active = false
      WHERE program_id = $1
    `;
    
    await pool.query(assignmentQuery, [id]);
    
    return true;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Tilldela ett program till en eller flera användare
 * @param {number} programId - Program-ID
 * @param {Array<number>} userIds - Lista med användar-IDs
 * @param {number} assignedBy - Användar-ID för den som tilldelar programmet
 * @returns {Promise<Array>} - Lista med nya tilldelningar
 */
async function assignProgramToUsers(programId, userIds, assignedBy) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Kontrollera att programmet finns
    const programQuery = `
      SELECT * FROM hockey_training.programs
      WHERE id = $1
    `;
    
    const programResult = await client.query(programQuery, [programId]);
    
    if (programResult.rows.length === 0) {
      throw notFoundError('Träningsprogrammet kunde inte hittas');
    }
    
    // Deaktivera eventuella befintliga tilldelningar för detta program
    const deactivateQuery = `
      UPDATE hockey_training.program_assignments
      SET is_active = false
      WHERE program_id = $1 AND user_id = ANY($2::integer[])
    `;
    
    await client.query(deactivateQuery, [programId, userIds]);
    
    // Skapa nya tilldelningar
    const assignmentValues = userIds.map(userId => {
      return `(${programId}, ${userId}, ${assignedBy})`;
    }).join(', ');
    
    if (assignmentValues.length === 0) {
      await client.query('COMMIT');
      return [];
    }
    
    const insertQuery = `
      INSERT INTO hockey_training.program_assignments
        (program_id, user_id, assigned_by)
      VALUES ${assignmentValues}
      RETURNING *
    `;
    
    const result = await client.query(insertQuery);
    
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw handleDatabaseError(error);
  } finally {
    client.release();
  }
}

/**
 * Uppdatera slutförandestatus för ett program som tilldelats en användare
 * @param {number} assignmentId - Tilldelnings-ID
 * @param {number} completionStatus - Färdigställandeprocent (0-100)
 * @returns {Promise<Object>} - Uppdaterad tilldelning
 */
async function updateProgramCompletionStatus(assignmentId, completionStatus) {
  try {
    const query = `
      UPDATE hockey_training.program_assignments
      SET completion_status = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [completionStatus, assignmentId]);
    
    if (result.rows.length === 0) {
      throw notFoundError('Programtilldelningen kunde inte hittas');
    }
    
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Hämta alla användare som tilldelats ett specifikt program
 * @param {number} programId - Program-ID
 * @returns {Promise<Array>} - Lista med användare och deras slutförandestatus
 */
async function getProgramAssignments(programId) {
  try {
    const query = `
      SELECT pa.* 
      FROM hockey_training.program_assignments pa
      WHERE pa.program_id = $1 AND pa.is_active = true
    `;
    
    const result = await pool.query(query, [programId]);
    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

module.exports = {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  assignProgramToUsers,
  updateProgramCompletionStatus,
  getProgramAssignments
};