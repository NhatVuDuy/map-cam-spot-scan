import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach auth token if stored
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — normalize errors
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
    }
    return Promise.reject(err);
  }
);

export const scanAPI = {
  scan: (params) => client.post("/v1/scan", params),
  sources: () => client.get("/v1/sources"),
  health: () => client.get("/health"),
  exportData: (format, scanId) =>
    client.get(`/v1/export/${format}`, { params: { scanId }, responseType: "blob" }),
};

export default client;
