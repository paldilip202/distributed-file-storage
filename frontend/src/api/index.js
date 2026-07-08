import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If token expired → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth APIs ─────────────────────────────────────────────
export const authAPI = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),
}

// ─── File APIs ─────────────────────────────────────────────
export const fileAPI = {
  getFiles: () =>
    api.get('/api/files'),

  initiateUpload: (filename, sizeBytes, mimeType) =>
    api.post('/api/files/initiate', { filename, sizeBytes, mimeType }),

  confirmUpload: (fileId, chunkConfirmations) =>
    api.post(`/api/files/${fileId}/confirm`, { chunkConfirmations }),

  getDownloadPlan: (fileId) =>
    api.get(`/api/files/${fileId}/download-plan`),

  deleteFile: (fileId) =>
    api.delete(`/api/files/${fileId}`),
}

// ─── Node APIs ─────────────────────────────────────────────
export const nodeAPI = {
  getNodes: () => api.get('/api/nodes'),
}

export default api