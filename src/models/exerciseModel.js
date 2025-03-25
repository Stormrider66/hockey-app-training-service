const { pool } = require('../index');
const { handleDatabaseError, notFoundError } = require('../utils/errorHandler');

/**
 * Hämta alla övningar med möjlighet att filtrera på kategori eller söka efter namn
 * @param {Object} options - Filtreringsalternativ
 * @param {string} [options.category] - Kategori att filtrera på
 * @param {string} [options.search] - Söksord för namn eller beskrivning
 * @param {boolean} [options.activeOnly=true] - Returnera endast aktiva övningar
 * @returns {Promise<Array>} - Lista med övningar
 */
async function getAllExercises(options = {}) {
  const { category, search, activeOnly = true } = options;
  
  let query = `
    SELECT * FROM hockey_training.exercises
    WHERE 1=1
  `;
  
  const params = [];
  
  if (activeOnly) {
    query += ` AND is_active = true`;
  }
  
  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
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
 * Hämta en övning baserat på ID
 * @param {number} id - Övnings-ID
 * @returns {Promise<Object>} - Övningsinformation
 */
async function getExerciseById(id) {
  try {
    const query = `
      SELECT * FROM hockey_training.exercises
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw notFoundError('Övningen kunde inte hittas');
    }
    
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Skapa en ny övning
 * @param {Object} exercise - Övningsdata
 * @param {string} exercise.name - Namn på övningen
 * @param {string} exercise.description - Beskrivning
 * @param {string} exercise.category - Kategori (från enum exercise_category)
 * @param {Array<string>} [exercise.equipment] - Utrustning som behövs
 * @param {Array<string>} [exercise.muscle_groups] - Muskelgrupper som tränas
 * @param {string} [exercise.instructions] - Utförandeinstruktioner
 * @param {string} [exercise.video_url] - URL till instruktionsvideo
 * @param {string} [exercise.image_url] - URL till bild
 * @param {number} exercise.created_by - Användar-ID för den som skapar övningen
 * @returns {Promise<Object>} - Den nya övningen med ID
 */
async function createExercise(exercise) {
  try {
    const { 
      name, description, category, equipment, muscle_groups,
      instructions, video_url, image_url, created_by
    } = exercise;
    
    const query = `
      INSERT INTO hockey_training.exercises
        (name, description, category, equipment, muscle_groups,
         instructions, video_url, image_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      name, 
      description, 
      category, 
      equipment || null, 
      muscle_groups || null,
      instructions || null, 
      video_url || null, 
      image_url || null, 
      created_by
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Uppdatera en existerande övning
 * @param {number} id - Övnings-ID
 * @param {Object} exercise - Övningsdata att uppdatera
 * @returns {Promise<Object>} - Den uppdaterade övningen
 */
async function updateExercise(id, exercise) {
  try {
    // Först, kontrollera att övningen finns
    const existingExercise = await getExerciseById(id);
    
    // Bygg uppdateringsquery
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(exercise)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    // Lägg alltid till updated_at
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return existingExercise;
    }
    
    // Lägg till id som sista parameter
    values.push(id);
    
    const query = `
      UPDATE hockey_training.exercises
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
 * Markera en övning som inaktiv (soft delete)
 * @param {number} id - Övnings-ID
 * @returns {Promise<boolean>} - true om borttagning lyckades
 */
async function deleteExercise(id) {
  try {
    // Kontrollera att övningen finns
    await getExerciseById(id);
    
    // Markera övningen som inaktiv (soft delete)
    const query = `
      UPDATE hockey_training.exercises
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    return true;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

module.exports = {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
};