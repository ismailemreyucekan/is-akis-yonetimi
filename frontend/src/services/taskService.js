import api from './api';

const taskService = {
  async getTasks(params = {}) {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  async getTask(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async createTask(taskData) {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  async updateTask(id, taskData) {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  async deleteTask(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/tasks/stats');
    return response.data;
  }
};

export default taskService;
