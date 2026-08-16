import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Rules API ─────────────────────────────────────────────────────────

export const getRules = (params = {}) => api.get('/rules', { params });
export const getRule = (id) => api.get(`/rules/${id}`);
export const createRule = (data) => api.post('/rules', data);
export const updateRule = (id, data) => api.put(`/rules/${id}`, data);
export const deleteRule = (id) => api.delete(`/rules/${id}`);
export const seedDefaultRules = (overwrite = false) =>
  api.post('/rules/seed', { overwrite });

// ─── Breaches API ──────────────────────────────────────────────────────

export const getBreaches = (params = {}) =>
  api.get('/breaches', { params });
export const clearBreaches = () => api.delete('/breaches');

// ─── Notifications API ────────────────────────────────────────────────

export const getNotifications = (params = {}) =>
  api.get('/notifications', { params });
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () =>
  api.patch('/notifications/read-all');

// ─── Stats API ─────────────────────────────────────────────────────────

export const getStats = () => api.get('/stats');

// ─── Auth API (JWT) ───────────────────────────────────────────────────

export const generateJwtToken = (data = {}) => api.post('/auth/token', data);
export const verifyJwtToken = (token) => api.post('/auth/verify', { token });

// ─── Test API (Rate Limited) ──────────────────────────────────────────

export const sendTestRequest = (headers = {}) =>
  api.get('/test', { headers });

export const sendTestPostRequest = (body = {}, headers = {}) =>
  api.post('/test', body, { headers });

export default api;
