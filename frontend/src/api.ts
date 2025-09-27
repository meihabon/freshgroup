import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,
});

// Attach JWT token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired/unauthorized sessions
API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;

/* ---------------- AUTH ---------------- */
export const login = (username: string, password: string) =>
  API.post("/auth/login", { username, password });

export const register = (data: any) => API.post("/auth/register", data);

export const logout = () => API.post("/auth/logout");

export const getMe = () => API.get("/auth/me");

export const changePassword = (data: any) =>
  API.post("/auth/change-password", data);

/* ---------------- USERS ---------------- */
export const getUsers = () => API.get("/users");

export const createUser = (data: any) => API.post("/users", data);

export const updateUser = (userId: number, data: any) =>
  API.put(`/users/${userId}`, data);

export const deleteUser = (userId: number) => API.delete(`/users/${userId}`);

export const resetUserPassword = (userId: number, data: any) =>
  API.post(`/users/${userId}/reset-password`, data);

/* ---------------- DASHBOARD ---------------- */
export const getDashboardStats = () => API.get("/dashboard/stats");

/* ---------------- STUDENTS ---------------- */
export const getStudents = () => API.get("/students");

/* ---------------- CLUSTERS ---------------- */
export const getClusters = () => API.get("/clusters");

export const recluster = (data: any) => API.post("/clusters/recluster", data);

export const getPairwiseClusters = () => API.get("/clusters/pairwise");

export const getClusterPlayground = () => API.get("/clusters/playground");

/* ---------------- DATASETS ---------------- */
export const getDatasets = () => API.get("/datasets");

export const uploadDataset = (formData: FormData) =>
  API.post("/datasets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const previewElbow = (data: any) => API.post("/datasets/elbow", data);

export const deleteDataset = (datasetId: number) =>
  API.delete(`/datasets/${datasetId}`);

/* ---------------- REPORTS ---------------- */
export const exportReport = (reportType: string) =>
  API.get(`/reports/${reportType}`, { responseType: "blob" });

export const exportClusterPlayground = () =>
  API.get("/reports/cluster_playground", { responseType: "blob" });

/* ---------------- HEALTH ---------------- */
export const healthCheck = () => API.get("/");
