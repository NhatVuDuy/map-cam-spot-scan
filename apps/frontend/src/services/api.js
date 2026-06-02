import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.message ?? err.message ?? 'Network error';
    return Promise.reject(new Error(msg));
  },
);

export async function fetchSources() {
  const res = await api.get('/v1/sources');
  return res.data.sources;
}

export async function runScan(payload) {
  const res = await api.post('/v1/scan', payload);
  return res.data;
}

export function exportUrl(format, scanId) {
  return `/api/v1/export/${format}?scanId=${encodeURIComponent(scanId)}`;
}

export default api;
