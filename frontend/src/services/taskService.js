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
  },

  async getCalendarTasks(month) {
    const response = await api.get('/tasks/calendar', { params: { month } });
    return response.data;
  },

  async addNote(taskId, message) {
    const response = await api.post(`/tasks/${taskId}/notes`, { message });
    return response.data;
  },

  async getActivity(taskId) {
    const response = await api.get(`/tasks/${taskId}/activity`);
    return response.data;
  }
};

export default taskService;
