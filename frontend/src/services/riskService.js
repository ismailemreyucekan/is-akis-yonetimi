import api from './api';

const riskService = {
  async getRisks(params = {}) {
    const response = await api.get('/risks', { params });
    return response.data;
  },

  async getRisk(id) {
    const response = await api.get(`/risks/${id}`);
    return response.data;
  },

  async createRisk(data) {
    const response = await api.post('/risks', data);
    return response.data;
  },

  async updateRisk(id, data) {
    const response = await api.put(`/risks/${id}`, data);
    return response.data;
  },

  async deleteRisk(id) {
    const response = await api.delete(`/risks/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/risks/stats');
    return response.data;
  }
};

export default riskService;
