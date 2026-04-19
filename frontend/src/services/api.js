import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: (username, password) => api.post('/login', { username, password }),

  logout: () => api.post('/logout'),

  me: () => api.get('/me'),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),

  getUpcomingEvents: () => api.get('/dashboard/upcoming-events'),

  getAgeDistribution: () => api.get('/dashboard/age-distribution'),

  getGenderDistribution: () => api.get('/dashboard/gender-distribution'),

  getHeatmapData: (params) => api.get('/dashboard/heatmap', { params }),
};

// Seniors API
export const seniorsApi = {
  getList: (params) => api.get('/seniors', { params }),

  getById: (id) => api.get(`/seniors/${id}`),

  getStatistics: () => api.get('/seniors/statistics'),

  export: (params) => api.get('/seniors/export', { params, responseType: 'blob' }),

  update: (id, data) => api.put(`/seniors/${id}`, data),

  reportDeceased: (id, formData) => api.post(`/seniors/${id}/report-deceased`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Applications API
export const applicationsApi = {
  getList: (params) => api.get('/applications', { params }),

  getById: (id) => api.get(`/applications/${id}`),

  getStatistics: () => api.get('/applications/statistics'),

  updateStatus: (id, data) => api.patch(`/applications/${id}/status`, data),

  updateNotes: (id, data) => api.patch(`/applications/${id}/notes`, data),
};

// ID Printing API
export const idPrintingApi = {
  getList: (params) => api.get('/id-printing', { params }),

  getStatistics: () => api.get('/id-printing/statistics'),

  getAvailableSeniors: (search = '') =>
    api.get('/id-printing/available-seniors', { params: { search } }),

  addToQueue: (data) => api.post('/id-printing/add', data),

  getCardData: (id) => api.get(`/id-printing/${id}/card-data`),

  getBatchCardData: (ids) => api.post('/id-printing/batch-card-data', { ids }),

  updateStatus: (id, data) => api.patch(`/id-printing/${id}/status`, data),

  bulkPrint: (ids) => api.post('/id-printing/bulk-print', { ids }),

  bulkClaim: (ids) => api.post('/id-printing/bulk-claim', { ids }),

  getSeniorsWithoutId: (params) => api.get('/id-printing/seniors-without-id', { params }),
};

// Announcements API
export const announcementsApi = {
  getList: (params) => api.get('/announcements', { params }),

  getById: (id) => api.get(`/announcements/${id}`),

  getTypes: () => api.get('/announcements/types'),

  create: (data) => api.post('/announcements', data),

  update: (id, data) => api.put(`/announcements/${id}`, data),

  delete: (id) => api.delete(`/announcements/${id}`),

  getMedia: (id) => api.get(`/announcements/${id}/media`),

  uploadMedia: (id, formData) =>
    api.post(`/announcements/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteMedia: (mediaId) => api.delete(`/announcements/media/${mediaId}`),
};

// Registration API
export const registrationApi = {
  getLookupOptions: () => api.get('/registration/lookup-options'),

  getBarangays: () => api.get('/registration/barangays'),

  checkDuplicate: (data) => api.post('/registration/check-duplicate', data),

  submitNew: (data) => api.post('/registration/new', data),

  getById: (id) => api.get(`/registration/${id}`),

  update: (id, data) => api.put(`/registration/${id}`, data),

  getDocuments: (id) => api.get(`/registration/${id}/documents`),

  uploadDocument: (formData) =>
    api.post('/registration/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteDocument: (documentId) =>
    api.delete(`/registration/document/${documentId}`),

  searchFamilySenior: (query) =>
    api.get("/registration/search-family-senior", { params: { query } }),
};

// Renewal API (Renew ID)
export const renewalApi = {
  searchByOscaId: (oscaId) =>
    api.get("/renew/search", { params: { osca_id: oscaId } }),

  submitNew: (data) => api.post("/renew/new", data),

  getById: (id) => api.get(`/renew/${id}`),

  update: (id, data) => api.put(`/renew/${id}`, data),

  getDocuments: (id) => api.get(`/renew/${id}/documents`),

  uploadDocument: (formData) =>
    api.post("/renew/upload-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteDocument: (documentId) => api.delete(`/renew/document/${documentId}`),
};

// Replace Lost ID API
export const replaceLostApi = {
  searchByOscaId: (oscaId) =>
    api.get("/replace-lost/search", { params: { osca_id: oscaId } }),

  submitNew: (data) => api.post("/replace-lost/new", data),

  getById: (id) => api.get(`/replace-lost/${id}`),

  update: (id, data) => api.put(`/replace-lost/${id}`, data),

  getDocuments: (id) => api.get(`/replace-lost/${id}/documents`),

  uploadDocument: (formData) =>
    api.post("/replace-lost/upload-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteDocument: (documentId) =>
    api.delete(`/replace-lost/document/${documentId}`),
};

// Replace Damaged ID API
export const replaceDamagedApi = {
  searchByOscaId: (oscaId) =>
    api.get("/replace-damaged/search", { params: { osca_id: oscaId } }),

  submitNew: (data) => api.post("/replace-damaged/new", data),

  getById: (id) => api.get(`/replace-damaged/${id}`),

  update: (id, data) => api.put(`/replace-damaged/${id}`, data),

  getDocuments: (id) => api.get(`/replace-damaged/${id}/documents`),

  uploadDocument: (formData) =>
    api.post("/replace-damaged/upload-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteDocument: (documentId) =>
    api.delete(`/replace-damaged/document/${documentId}`),
};

// Public API (No authentication required)
export const publicApi = {
  getBarangays: () => api.get('/public/barangays'),

  getAnnouncements: (params) => api.get('/public/announcements', { params }),

  apply: (data) => api.post('/public/apply', data),

  checkStatus: (referenceNumber) =>
    api.get(`/public/status/${referenceNumber}`),

  getStats: () => api.get('/public/stats'),
};

// Pre-Registration Admin API
export const preRegistrationApi = {
  list: (params) => api.get('/pre-registrations', { params }),

  statistics: () => api.get('/pre-registrations/statistics'),

  getById: (id) => api.get(`/pre-registrations/${id}`),

  markUnderReview: (id) => api.post(`/pre-registrations/${id}/mark-review`),

  foReview: (id, data) => api.post(`/pre-registrations/${id}/fo-review`, data),

  mainReview: (id, data) =>
    api.post(`/pre-registrations/${id}/main-review`, data),

  convert: (id) => api.post(`/pre-registrations/${id}/convert`),

  completeConversion: (id, applicationId) =>
    api.post(`/pre-registrations/${id}/complete-conversion`, {
      application_id: applicationId,
    }),
};

// Benefits API (PRD 4.3)
export const benefitsApi = {
  getTypes: () => api.get('/benefits/types'),

  getClaims: (params) => api.get('/benefits/claims', { params }),

  exportClaims: (params) =>
    api.get('/benefits/claims/export', { params, responseType: 'blob' }),

  getEligible: (params) => api.get('/benefits/eligible', { params }),

  exportEligible: (params) =>
    api.get('/benefits/eligible/export', { params, responseType: 'blob' }),

  getDistribution: (params) => api.get('/benefits/distribution', { params }),

  getStatistics: (params) => api.get('/benefits/statistics', { params }),

  getFilterOptions: () => api.get('/benefits/filter-options'),

  createClaim: (data) => api.post('/benefits/claims', data),

  updateStatus: (id, data) => api.patch(`/benefits/claims/${id}/status`, data),

  getSeniorClaims: (seniorId) => api.get(`/seniors/${seniorId}/benefits`),
};

// Archives API (PRD 4.6)
export const archivesApi = {
  getList: (params) => api.get('/archives', { params }),

  getById: (id) => api.get(`/archives/${id}`),

  getTimeline: (id) => api.get(`/archives/${id}/timeline`),
};

// Accounts API (Admin Management)
export const accountsApi = {
  getList: (params) => api.get('/admin/accounts', { params }),

  getById: (id) => api.get(`/admin/accounts/${id}`),

  getOptions: () => api.get('/admin/accounts/options'),

  create: (data) => api.post("/admin/accounts", data),

  update: (id, data) => api.put(`/admin/accounts/${id}`, data),

  delete: (id) => api.delete(`/admin/accounts/${id}`),

  toggleStatus: (id) => api.patch(`/admin/accounts/${id}/toggle-status`),

  resetPassword: (id, password) =>
    api.post(`/admin/accounts/${id}/reset-password`, { password }),

  getBarangaysByBranch: (branchId) =>
    api.get(`/admin/accounts/barangays-by-branch/${branchId}`),
};

// Field Office Management API
export const branchApi = {
  getList: () => api.get('/admin/branches'),

  getById: (id) => api.get(`/admin/branches/${id}`),

  create: (data) => api.post("/admin/branches", data),

  update: (id, data) => api.put(`/admin/branches/${id}`, data),

  delete: (id) => api.delete(`/admin/branches/${id}`),
};

// Barangay Management API
export const barangayManagementApi = {
  getList: (params) => api.get('/admin/barangays', { params }),

  getUnassigned: () => api.get('/admin/barangays/unassigned'),

  create: (data) => api.post('/admin/barangays', data),

  update: (id, data) => api.put(`/admin/barangays/${id}`, data),

  delete: (id) => api.delete(`/admin/barangays/${id}`),

  assign: (barangayId, branchId) =>
    api.post('/admin/barangays/assign', {
      barangay_id: barangayId,
      branch_id: branchId,
    }),

  bulkAssign: (branchId, barangayIds) =>
    api.post('/admin/barangays/bulk-assign', {
      branch_id: branchId,
      barangay_ids: barangayIds,
    }),

  unassign: (barangayId) =>
    api.delete(`/admin/barangays/${barangayId}/unassign`),
};

// District Management API
export const districtApi = {
  getList: () => api.get("/admin/districts"),

  create: (data) => api.post("/admin/districts", data),

  update: (id, data) => api.put(`/admin/districts/${id}`, data),

  delete: (id) => api.delete(`/admin/districts/${id}`),

  assignBarangays: (id, barangayIds) =>
    api.post(`/admin/districts/${id}/assign-barangays`, { barangay_ids: barangayIds }),
};

// Benefit Types Management API
export const benefitTypesApi = {
  getAll: () => api.get('/admin/benefit-types'),

  create: (data) => api.post('/admin/benefit-types', data),

  update: (id, data) => api.put(`/admin/benefit-types/${id}`, data),

  delete: (id) => api.delete(`/admin/benefit-types/${id}`),

  toggle: (id) => api.patch(`/admin/benefit-types/${id}/toggle`),
};

// Benefit Complaints API (admin)
export const benefitComplaintsApi = {
  getList: (params) => api.get("/benefits/complaints", { params }),

  show: (id) => api.get(`/benefits/complaints/${id}`),

  respond: (id, data) => api.patch(`/benefits/complaints/${id}/respond`, data),
};

// Audit Log API
export const auditLogApi = {
  getList: (params) => api.get('/admin/audit-logs', { params }),

  getById: (id) => api.get(`/admin/audit-logs/${id}`),

  getStats: () => api.get('/admin/audit-logs/stats'),
};

// Dropdown / Lookup Management API
export const dropdownApi = {
  getTypes: () => api.get('/admin/dropdowns/types'),

  getAll: (type) => api.get(`/admin/dropdowns/${type}`),

  create: (type, data) => api.post(`/admin/dropdowns/${type}`, data),

  update: (type, id, data) => api.put(`/admin/dropdowns/${type}/${id}`, data),

  toggleEnabled: (type, id) => api.patch(`/admin/dropdowns/${type}/${id}/toggle`),

  reorder: (type, order) => api.post(`/admin/dropdowns/${type}/reorder`, { order }),
};

// SMS Settings API
export const smsApi = {
  getSettings: () => api.get('/admin/sms/settings'),

  updateSettings: (settings) => api.put('/admin/sms/settings', { settings }),

  getLogs: (params) => api.get('/admin/sms/logs', { params }),

  getStats: () => api.get('/admin/sms/stats'),

  sendTest: (phone_number) => api.post('/admin/sms/test', { phone_number }),
};

export default api;
