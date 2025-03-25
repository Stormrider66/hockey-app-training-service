const { userServiceClient } = require('./serviceClient');
const { pool } = require('../index');

/**
 * Synkronisera ett testresultat till användarens profil i user-service
 * @param {number} testResultId - ID för testresultatet
 * @param {string} token - JWT token för auktorisering
 * @returns {Promise<boolean>} Om synkroniseringen lyckades
 */
const syncTestResultToUserProfile = async (testResultId, token) => {
  try {
    // Hämta testresultatet
    const query = `
      SELECT 
        t.user_id, t.team_id, t.test_type, t.test_date,
        t.result, t.unit, t.comparison_to_previous
      FROM hockey_training.test_results t
      WHERE t.id = $1
    `;
    
    const result = await pool.query(query, [testResultId]);
    
    if (result.rows.length === 0) {
      console.error(`Testresultat med ID ${testResultId} kunde inte hittas`);
      return false;
    }
    
    const testResult = result.rows[0];
    
    // Skapa data att skicka till user-service
    const userData = {
      testResult: {
        type: testResult.test_type,
        date: testResult.test_date,
        value: testResult.result,
        unit: testResult.unit,
        change: testResult.comparison_to_previous
      }
    };
    
    // Anropa user-service för att uppdatera användarens statistik
    // Detta är en förenklad modell - faktisk implementation skulle anpassas
    // till user-service API
    try {
      // Denna endpoint är en förenklad representation - den faktiska endpointen
      // skulle behöva implementeras i user-service
      await userServiceClient.updateUserStats(testResult.user_id, userData, token);
      return true;
    } catch (error) {
      console.error('Fel vid synkronisering av testresultat till user-service:', error);
      return false;
    }
  } catch (error) {
    console.error('Fel vid förberedelse av testresultat för synkronisering:', error);
    return false;
  }
};

/**
 * Queue för att hantera asynkrona synkroniseringar
 */
class SyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  /**
   * Lägg till en synkroniseringsuppgift i kön
   * @param {function} task - Funktion att köra
   * @param {Array} args - Argument till funktionen
   */
  addTask(task, ...args) {
    this.queue.push({ task, args });
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  /**
   * Processera kön av synkroniseringsuppgifter
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const { task, args } = this.queue.shift();
    
    try {
      await task(...args);
    } catch (error) {
      console.error('Fel vid synkroniseringsuppgift:', error);
    }
    
    // Fortsätt med nästa uppgift
    setTimeout(() => this.processQueue(), 100);
  }
}

// Skapa en instans av synkroniseringskön
const syncQueue = new SyncQueue();

module.exports = {
  syncTestResultToUserProfile,
  syncQueue
};