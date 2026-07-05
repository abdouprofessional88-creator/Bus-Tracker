const API_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch (err) {
    throw new Error('تعذر الاتصال بالخادم. تأكد من تشغيل الخادم (server)');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('الخادم أعاد رداً فارغاً. تأكد من تشغيل الخادم');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const auth = {
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  getMe: () => request('/auth/me'),
};

export const driver = {
  getDashboard: () => request('/driver/dashboard'),
  toggleStatus: (isOnline) => request('/driver/toggle-status', {
    method: 'POST',
    body: JSON.stringify({ isOnline }),
  }),
  updateLocation: (lat, lng) => request('/driver/location', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  }),
  updatePassengerCount: (count) => request('/driver/passenger-count', {
    method: 'POST',
    body: JSON.stringify({ count }),
  }),
  getRoutes: () => request('/driver/routes'),
};

export const passenger = {
  getNearbyBuses: (lat, lng, radius = 5000) =>
    request(`/passenger/nearby-buses?lat=${lat}&lng=${lng}&radius=${radius}`),
  getNearestStation: (lat, lng) =>
    request(`/passenger/nearest-station?lat=${lat}&lng=${lng}`),
  getRouteSuggestions: (originLat, originLng, destLat, destLng) =>
    request(`/passenger/route-suggestions?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`),
  getAllRoutes: () => request('/passenger/routes'),
  trackBus: (busId) => request(`/passenger/track-bus/${busId}`),
};

export const admin = {
  getStations: () => request('/admin/stations'),
  addStation: (name, lat, lng) => request('/admin/stations', {
    method: 'POST', body: JSON.stringify({ name, lat, lng }),
  }),
  deleteStation: (id) => request(`/admin/stations/${id}`, { method: 'DELETE' }),
  updateStation: (id, data) => request(`/admin/stations/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  getRoutes: () => request('/admin/routes'),
  createRoute: (name, description, stationIds) => request('/admin/routes', {
    method: 'POST', body: JSON.stringify({ name, description, stationIds }),
  }),
  deleteRoute: (id) => request(`/admin/routes/${id}`, { method: 'DELETE' }),
  getBuses: () => request('/admin/buses'),
  createBus: (busNumber, routeId, driverId, capacity) => request('/admin/buses', {
    method: 'POST', body: JSON.stringify({ busNumber, routeId, driverId, capacity }),
  }),
  getDrivers: () => request('/admin/drivers'),
  quickSetup: () => request('/admin/quick-setup', { method: 'POST' }),
};

export const getConfig = () => request('/config');
