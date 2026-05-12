import api from './api';

const meetingService = {
  async getMeetings(params = {}) {
    const response = await api.get('/meetings', { params });
    return response.data;
  },

  async getMeeting(id) {
    const response = await api.get(`/meetings/${id}`);
    return response.data;
  },

  async createMeeting(data) {
    const response = await api.post('/meetings', data);
    return response.data;
  },

  async updateMeeting(id, data) {
    const response = await api.put(`/meetings/${id}`, data);
    return response.data;
  },

  async deleteMeeting(id) {
    const response = await api.delete(`/meetings/${id}`);
    return response.data;
  },

  async updateStatus(id, status) {
    const response = await api.patch(`/meetings/${id}/status`, { status });
    return response.data;
  },

  async addParticipant(meetingId, userId, isRequired = true) {
    const response = await api.post(`/meetings/${meetingId}/participants`, {
      user_id: userId,
      is_required: isRequired
    });
    return response.data;
  },

  async removeParticipant(meetingId, userId) {
    const response = await api.delete(`/meetings/${meetingId}/participants/${userId}`);
    return response.data;
  },

  async updateNotes(meetingId, notes, outcomes) {
    const response = await api.put(`/meetings/${meetingId}/notes`, { notes, outcomes });
    return response.data;
  },

  async getCalendarMeetings(month) {
    const response = await api.get('/meetings/calendar', { params: { month } });
    return response.data;
  },

  async getStats() {
    const response = await api.get('/meetings/stats');
    return response.data;
  }
};

export default meetingService;
