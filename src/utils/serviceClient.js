const axios = require('axios');

/**
 * Klient för att kommunicera med user-service
 */
class UserServiceClient {
  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
  }

  /**
   * Hämta information om en användare
   * @param {number} userId - Användar-ID
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Object>} - Användarinformation
   */
  async getUser(userId, token) {
    try {
      const response = await this.client.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Fel vid hämtning av användarinformation:', error.message);
      throw new Error('Kunde inte hämta användarinformation');
    }
  }

  /**
   * Kontrollera om en användare har tillgång till ett lag
   * @param {number} userId - Användar-ID
   * @param {number} teamId - Lag-ID
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<boolean>} - Om användaren har tillgång till laget
   */
  async checkTeamAccess(userId, teamId, token) {
    try {
      const response = await this.client.get(`/api/users/${userId}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const teams = response.data.teams || [];
      return teams.some(team => team.id === parseInt(teamId));
    } catch (error) {
      console.error('Fel vid kontroll av lagbehörighet:', error.message);
      throw new Error('Kunde inte verifiera lagbehörighet');
    }
  }

  /**
   * Hämta alla medlemmar i ett lag
   * @param {number} teamId - Lag-ID
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Array>} - Lista med lagmedlemmar
   */
  async getTeamMembers(teamId, token) {
    try {
      const response = await this.client.get(`/api/teams/${teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Fel vid hämtning av lagmedlemmar:', error.message);
      throw new Error('Kunde inte hämta lagmedlemmar');
    }
  }

  /**
   * Uppdatera användarstatistik med testresultat
   * @param {number} userId - Användar-ID
   * @param {Object} data - Data att uppdatera
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Object>} - Uppdaterad användarinformation
   */
  async updateUserStats(userId, data, token) {
    try {
      const response = await this.client.post(`/api/users/${userId}/stats`, data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Fel vid uppdatering av användarstatistik:', error.message);
      throw new Error('Kunde inte uppdatera användarstatistik');
    }
  }
}

/**
 * Klient för att kommunicera med calendar-service
 */
class CalendarServiceClient {
  constructor() {
    this.baseUrl = process.env.CALENDAR_SERVICE_URL || 'http://calendar-service:3003';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
  }

  /**
   * Hämta en plats/arena
   * @param {number} locationId - Plats-ID
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Object>} - Platsinformation
   */
  async getLocation(locationId, token) {
    try {
      const response = await this.client.get(`/api/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Fel vid hämtning av platsinformation:', error.message);
      throw new Error('Kunde inte hämta platsinformation');
    }
  }

  /**
   * Kontrollera om en plats är tillgänglig för ett visst datum och tid
   * @param {number} locationId - Plats-ID
   * @param {string} date - Datum (YYYY-MM-DD)
   * @param {string} startTime - Starttid (HH:MM)
   * @param {string} endTime - Sluttid (HH:MM)
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<boolean>} - Om platsen är tillgänglig
   */
  async checkLocationAvailability(locationId, date, startTime, endTime, token) {
    try {
      const response = await this.client.get(`/api/locations/check-availability`, {
        params: {
          locationId,
          date,
          startTime,
          endTime
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data.available === true;
    } catch (error) {
      console.error('Fel vid kontroll av platstillgänglighet:', error.message);
      throw new Error('Kunde inte kontrollera platstillgänglighet');
    }
  }

  /**
   * Skapa en kalenderhändelse för en träning
   * @param {Object} event - Händelsedata
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Object>} - Skapad händelse
   */
  async createEvent(event, token) {
    try {
      const response = await this.client.post('/api/events', event, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Fel vid skapande av kalenderhändelse:', error.message);
      throw new Error('Kunde inte skapa kalenderhändelse');
    }
  }

  /**
   * Uppdatera en kalenderhändelse
   * @param {number} eventId - Händelse-ID
   * @param {Object} event - Händelsedata
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<Object>} - Uppdaterad händelse
   */
  async updateEvent(eventId, event, token) {
    try {
      const response = await this.client.put(`/api/events/${eventId}`, event, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Fel vid uppdatering av kalenderhändelse:', error.message);
      throw new Error('Kunde inte uppdatera kalenderhändelse');
    }
  }

  /**
   * Ta bort en kalenderhändelse
   * @param {number} eventId - Händelse-ID
   * @param {string} token - JWT-token från requestande användare
   * @returns {Promise<boolean>} - Om borttagningen lyckades
   */
  async deleteEvent(eventId, token) {
    try {
      await this.client.delete(`/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Fel vid borttagning av kalenderhändelse:', error.message);
      throw new Error('Kunde inte ta bort kalenderhändelse');
    }
  }
}

// Exportera instanser av klienterna
const userServiceClient = new UserServiceClient();
const calendarServiceClient = new CalendarServiceClient();

module.exports = {
  userServiceClient,
  calendarServiceClient
};