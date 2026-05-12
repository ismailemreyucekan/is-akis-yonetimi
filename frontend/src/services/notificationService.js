import api from './api';

const notificationService = {
  async getNotifications(category = null) {
    const params = {};
    if (category) params.category = category;
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  async deleteNotification(id) {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  async clearRead() {
    const response = await api.delete('/notifications/clear-read');
    return response.data;
  },

  async getConfig() {
    const response = await api.get('/notifications/config');
    return response.data;
  },

  async updateConfig(configs) {
    const response = await api.put('/notifications/config', { configs });
    return response.data;
  },

  async triggerReminderCheck() {
    const response = await api.post('/notifications/check-reminders');
    return response.data;
  }
};

export default notificationService;
