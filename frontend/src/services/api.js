// API service for the Compliance Management Platform frontend
// Communicates with backend via REST API calls
// All endpoints are under /api prefix

// Base API URL
// In development, Vite proxies /api/* to localhost:5000, so we use an empty base.
// In production, set VITE_API_BASE in .env (e.g. https://api.yourapp.com)
const API_BASE = import.meta.env.VITE_API_BASE || '';

// ============================================================
// Helper: perform fetch with error handling and JSON parsing
// ============================================================

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };

  // Add authorization header if token exists
  const token = localStorage.getItem('sclip_auth_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include', // send cookies if needed
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new Error('No internet connection. Please connect to the internet to continue.');
  }

  // Try to parse JSON, fall back to text
  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    let message = typeof data === 'object' && data.message
      ? data.message
      : typeof data === 'string' && data.length > 0
        ? data
        : `API error: ${response.status}`;

    const lower = String(message).toLowerCase();
    if (
      response.status === 503 ||
      lower.includes("can't reach database server") ||
      lower.includes("can't reach") ||
      lower.includes("database server") ||
      lower.includes("prisma") ||
      lower.includes("connection refused") ||
      lower.includes("econnrefused") ||
      lower.includes("etimedout") ||
      lower.includes("enotfound") ||
      lower.includes("failed to fetch")
    ) {
      message = 'No internet connection. Please connect to the internet to continue.';
    }

    throw new Error(message);
  }

  return data;
}

// ============================================================
// Authentication API
// ============================================================

export const auth = {
  // Login user and store auth token
  login: async (email, password) => {
    const data = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Store auth token for subsequent requests
    if (data.data && data.data.token) {
      localStorage.setItem('sclip_auth_token', data.data.token);
      if (data.data.user) {
        localStorage.setItem('sclip_user_id', data.data.user.id);
      }
    }
    return data;
  },

  register: async ({ organizationName, taxId, adminName, email, password, industry, website, phone, address, branches }) => {
    return await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        organizationName,
        taxId,
        adminName,
        email,
        password,
        industry,
        website,
        phone,
        address,
        branches,
      }),
    });
  },

  // Get current user profile (JWT-protected — token identifies the user server-side)
  getCurrentUser: async () => {
    return await fetchAPI('/api/auth/me');
  },

  // Set current user (used by AuthContext)
  setCurrentUser: (userId) => {
    localStorage.setItem('sclip_user_id', userId);
  },

  // Clear auth state
  logout: () => {
    localStorage.removeItem('sclip_auth_token');
    localStorage.removeItem('sclip_user_id');
  },
};

// ============================================================
// Tenancy / Locations API
// ============================================================

export const tenancy = {
  getLocations: async () => {
    const response = await fetchAPI('/api/tenancy/locations');
    return response.data || [];
  },

  getOrganization: async () => {
    const response = await fetchAPI('/api/tenancy/organization');
    return response.data;
  },

  createLocation: async (locData) => {
    return await fetchAPI('/api/tenancy/locations', {
      method: 'POST',
      body: JSON.stringify(locData),
    });
  },

  updateLocation: async (locationId, locationData) => {
    return await fetchAPI(`/api/tenancy/locations/${locationId}`, {
      method: 'PATCH',
      body: JSON.stringify(locationData),
    });
  },

  getUsers: async () => {
    const response = await fetchAPI('/api/tenancy/users');
    return response.data || [];
  },

  createUser: async (userData) => {
    return await fetchAPI('/api/tenancy/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  assignLocationAccess: async (userId, locationId) => {
    return await fetchAPI('/api/tenancy/assign-location', {
      method: 'POST',
      body: JSON.stringify({ userId, locationId }),
    });
  },
};

// ============================================================
// Compliance Score API
// ============================================================

export const compliance = {
  calculateLocationScore: async (locationId) => {
    const response = await fetchAPI(`/api/compliance/locations/${locationId}`);
    return response.data;
  },

  recalculateLocationScore: async (locationId) => {
    const response = await fetchAPI(`/api/compliance/locations/${locationId}/recalculate`, {
      method: 'POST',
    });
    return response.data;
  },

  getLocationHistory: async (locationId, limit) => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await fetchAPI(`/api/compliance/locations/${locationId}/history${params}`);
    return response.data;
  },

  getLocationHistory: async (locationId, limit) => {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    const response = await fetchAPI(`/api/compliance/locations/${locationId}/history${params}`);
    return response.data || [];
  },

  getOrganizationOverview: async () => {
    const response = await fetchAPI('/api/compliance/organization/overview');
    return response.data;
  },
};

// ============================================================
// Intelligence API
// ============================================================

export const intelligence = {
  getLicenseTypes: async () => {
    const response = await fetchAPI('/api/intelligence/license-types');
    return response.data || [];
  },

  getDependencies: async () => {
    const response = await fetchAPI('/api/intelligence/dependencies');
    return response.data || [];
  },

  getRequiredRules: async (locationType, state) => {
    const params = locationType || state
      ? `?locationType=${encodeURIComponent(locationType || '')}&state=${encodeURIComponent(state || '')}`
      : '';
    const response = await fetchAPI(`/api/intelligence/rules${params}`);
    return response.data || [];
  },

  getGlobalGraph: async () => {
    const response = await fetchAPI('/api/intelligence/graph');
    return response.data;
  },

  getLocationGraph: async (locationId, orgId) => {
    return await fetchAPI(`/api/intelligence/locations/${locationId}/graph?orgId=${orgId}`);
  },
};

// ============================================================
// Documents API
// ============================================================

export const documents = {
  getDocuments: async () => {
    return await fetchAPI('/api/documents');
  },

  // Upload a regulatory document (multipart/form-data)
  uploadDocument: async (docData, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_name', docData.file_name);
    formData.append('license_type_id', docData.license_type_id);
    formData.append('org_id', docData.org_id);
    if (docData.location_id) {
      formData.append('location_id', docData.location_id);
    }
    formData.append('version', docData.version || 1);
    if (docData.issue_date) {
      formData.append('issue_date', docData.issue_date);
    }
    if (docData.expiry_date) {
      formData.append('expiry_date', docData.expiry_date);
    }
    if (docData.parent_document_id) {
      formData.append('parent_document_id', docData.parent_document_id);
    }

    const token = localStorage.getItem('sclip_auth_token');
    const response = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  },

  // Verify/reject a document (admin action)
  verifyDocument: async (docId, approve, reason) => {
    const token = localStorage.getItem('sclip_auth_token');
    return await fetchAPI(`/api/documents/${docId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ approve, reason }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Create a renewal version of a document
  renewDocument: async (originalDoc, renewedData, file) => {
    // Create a new document version (renewal) via upload
    return await documents.uploadDocument(renewedData, file);
  },

  // Delete a document
  deleteDocument: async (docId) => {
    return await fetchAPI(`/api/documents/${docId}`, {
      method: 'DELETE',
    });
  },

  // Get inline document file preview URL
  getDocumentFileUrl: (docId) => {
    const token = localStorage.getItem('sclip_auth_token') || '';
    return `/api/documents/${docId}/file?token=${encodeURIComponent(token)}`;
  },

  // Get presigned document download URL
  getDocumentDownloadUrl: async (docId) => {
    const data = await fetchAPI(`/api/documents/${docId}/download`);
    return data.url;
  },
};

// ============================================================
// Notifications API
// ============================================================

export const notifications = {
  getNotifications: async ({ page = 1, limit = 20, status = null, type = null } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    const response = await fetchAPI(`/api/notifications?${params}`);
    return response.data || {};
  },

  getUnreadCount: async () => {
    return await fetchAPI('/api/notifications/unread-count');
  },

  markAsRead: async (notificationId) => {
    return await fetchAPI(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return await fetchAPI('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },

  deleteNotification: async (notificationId) => {
    return await fetchAPI(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  createTestAlert: async (title, message, type, link, sendEmail = false) => {
    const alertType = type || 'EXPIRY_WARNING';
    return await fetchAPI('/api/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ title, message, type: alertType, link, sendEmail }),
    });
  },
};

// ============================================================
// Audit Links API
// ============================================================

export const auditLinks = {
  getAuditLinks: async () => {
    return await fetchAPI('/api/audit-links');
  },

  createAuditLink: async (linkData) => {
    return await fetchAPI('/api/audit-links', {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  },

  revokeAuditLink: async (linkId) => {
    return await fetchAPI(`/api/audit-links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
  },

  getAuditByToken: async (token, pin = '') => {
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return await fetchAPI(`/api/audit-links/by-token/${token}${query}`);
  },

  recordAuditAccess: async (token, payload = {}) => {
    return await fetchAPI(`/api/audit-links/access/${token}`, {
      method: 'POST',
      body: JSON.stringify(typeof payload === 'object' ? payload : { pinEntered: payload }),
    });
  },

  getAuditDocumentDownloadUrl: (token, docId, pin = '') => {
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${API_BASE}/api/audit-links/by-token/${token}/documents/${docId}/download${query}`;
  },
};

export const computeSHA256 = async (textOrBuffer) => {
  const enc = new TextEncoder();
  const data = typeof textOrBuffer === "string" ? enc.encode(textOrBuffer) : textOrBuffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

// ============================================================
// Main api object - exported for components
// Must maintain compatible interface with existing component code
// ============================================================

// Main API object exported for components
// All methods return data directly (raw payload from backend)
// Components handle their own error states via try/catch
export const api = {
  // --- Organizations ---
  getOrganizations: async () => {
    const data = await tenancy.getOrganization();
    return data ? [data] : [];
  },

  getUsers: async () => {
    const data = await tenancy.getUsers();
    return data.users || [];
  },

  getCurrentUser: async () => {
    const data = await auth.getCurrentUser();
    return data;
  },

  setCurrentUser: auth.setCurrentUser,
  logout: auth.logout,

  // --- Locations ---
  getLocations: async () => {
    const data = await tenancy.getLocations();
    return Array.isArray(data) ? data : [];
  },

  saveLocations: () => {},

  addLocation: async (loc) => {
    const result = await tenancy.createLocation(loc);
    return result;
  },

  updateLocation: async (locationId, locationData) => {
    const result = await tenancy.updateLocation(locationId, locationData);
    return result.data;
  },

  // --- License Types & Dependencies ---
  getLicenseTypes: async () => {
    const data = await intelligence.getLicenseTypes();
    return Array.isArray(data) ? data : [];
  },

  getDependencies: async () => {
    const data = await intelligence.getDependencies();
    return Array.isArray(data) ? data : [];
  },

  getRequiredRules: async () => {
    const data = await intelligence.getRequiredRules();
    return Array.isArray(data) ? data : [];
  },

  // --- Documents ---
  getDocuments: async () => {
    const data = await documents.getDocuments();
    return data.documents || [];
  },

  saveDocuments: () => {},

  uploadDocument: async (docData, file) => {
    const result = await documents.uploadDocument(docData, file);
    return result;
  },

  verifyDocument: async (docId, approve, reason) => {
    const result = await documents.verifyDocument(docId, approve, reason);
    return result;
  },

  renewDocument: async (originalDoc, renewedData, file) => {
    const result = await documents.renewDocument(originalDoc, renewedData, file);
    return result;
  },

  deleteDocument: async (docId) => {
    const result = await documents.deleteDocument(docId);
    return result;
  },

  getDocumentFileUrl: documents.getDocumentFileUrl,
  getDocumentDownloadUrl: documents.getDocumentDownloadUrl,

  // --- Compliance Score Engine ---
  calculateLocationScore: async (locationId) => {
    const result = await compliance.calculateLocationScore(locationId);
    return result;
  },

  getLocationHistory: async (locationId, limit) => {
    return await compliance.getLocationHistory(locationId, limit);
  },

  // --- Audit Links ---
  getAuditLinks: async () => {
    const data = await auditLinks.getAuditLinks();
    return data.audit_links || [];
  },

  createAuditLink: async (linkData) => {
    const result = await auditLinks.createAuditLink(linkData);
    return result;
  },

  revokeAuditLink: async (linkId) => {
    const result = await auditLinks.revokeAuditLink(linkId);
    return result;
  },

  getAuditByToken: auditLinks.getAuditByToken,
  recordAuditAccess: auditLinks.recordAuditAccess,
  getAuditDocumentDownloadUrl: auditLinks.getAuditDocumentDownloadUrl,

  // --- Notifications ---
  getNotifications: async () => {
    const data = await notifications.getNotifications();
    return data.notifications || [];
  },

  getPreferences: () => ({
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    expiry_warning: true,
    lapsed_license: true,
    cascading_risk: true,
  }),

  savePreferences: () => {},

  // --- Utility ---
  computeSHA256,
};

export default api;