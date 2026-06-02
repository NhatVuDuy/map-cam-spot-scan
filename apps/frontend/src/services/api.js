import axios from 'axios';

// VITE_API_URL points to deployed backend, e.g. https://my-scanner.railway.app
// Falls back to same-origin /api for local dev and Docker
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

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
