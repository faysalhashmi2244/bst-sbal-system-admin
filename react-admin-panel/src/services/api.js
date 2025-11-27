// API service for communicating with the backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.beastpartnerclub.com/api';
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';


class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User endpoints
  async getUsers(page = 1, limit = 10) {
    return this.request(`/users?page=${page}&limit=${limit}`);
  }

  async getUser(address) {
    return this.request(`/users/${address}`);
  }

  async createOrUpdateUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Events endpoints
  async getEvents(page = 1, limit = 100) {
    return this.request(`/events?page=${page}&limit=${limit}`);
  }

  async getUserEvents(address, page = 1, limit = 100) {
    return this.request(`/events/user/${address}?page=${page}&limit=${limit}`);
  }

  async getEventsSummary() {
    return this.request('/events/summary');
  }

  async createEvent(eventData) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Analytics endpoints
  async getMonthlyAnalytics() {
    return this.request('/analytics/monthly');
  }

  async getPackageAscensionAnalytics(packageId) {
    return this.request(`/analytics/package/${packageId}/ascension`);
  }

  // Packages endpoints
  async getPackages() {
    return this.request('/packages');
  }

  async getNodePackages() {
    return this.request('/packages');
  }

  async createOrUpdatePackage(packageData) {
    return this.request('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  // User stats endpoints
  async createOrUpdateUserStats(statsData) {
    return this.request('/user-stats', {
      method: 'POST',
      body: JSON.stringify(statsData),
    });
  }

  // Hard refresh - clear database and trigger full sync
  async hardRefresh() {
    return this.request('/hard-refresh', {
      method: 'POST',
    });
  }

  // Health check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
export default apiService;