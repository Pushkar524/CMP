// API Service for SCLIP Frontend
// Communicates with backend via REST API calls
// All endpoints are under /api prefix

// Base API URL - configure via environment variable
// Set REACT_APP_API_BASE in .env to point to your backend host
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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

  const response = await fetch(url, config);

  // Try to parse JSON, fall back to text
  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data.message
      ? data.message
      : typeof data === 'string' && data.length > 0
        ? data
        : `API error: ${response.status}`;
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

  register: async (organizationName, taxId, adminName, email, password) => {
    return await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ organizationName, taxId, adminName, email, password }),
    });
  },

  // Get current user profile
  getCurrentUser: async () => {
    const id = localStorage.getItem('sclip_user_id') || 'user-1';
    return await fetchAPI(`/api/auth/me/${id}`);
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
    return await fetchAPI('/api/tenancy/locations');
  },

  getOrganization: async () => {
    return await fetchAPI('/api/tenancy/organization');
  },

  createLocation: async (locData) => {
    return await fetchAPI('/api/tenancy/locations', {
      method: 'POST',
      body: JSON.stringify(locData),
    });
  },

  getUsers: async () => {
    return await fetchAPI('/api/tenancy/users');
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
    return await fetchAPI(`/api/compliance/locations/${locationId}`);
  },

  recalculateLocationScore: async (locationId) => {
    return await fetchAPI(`/api/compliance/locations/${locationId}/recalculate`, {
      method: 'POST',
    });
  },

  getLocationHistory: async (locationId, limit) => {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return await fetchAPI(`/api/compliance/locations/${locationId}/history${params}`);
  },

  getOrganizationOverview: async () => {
    return await fetchAPI('/api/compliance/organization/overview');
  },
};

// ============================================================
// Intelligence API
// ============================================================

export const intelligence = {
  getLicenseTypes: async () => {
    return await fetchAPI('/api/intelligence/license-types');
  },

  getDependencies: async () => {
    return await fetchAPI('/api/intelligence/dependencies');
  },

  getRequiredRules: async (locationType, state) => {
    const params = locationType || state
      ? `?locationType=${encodeURIComponent(locationType || '')}&state=${encodeURIComponent(state || '')}`
      : '';
    return await fetchAPI(`/api/intelligence/rules${params}`);
  },

  getGlobalGraph: async () => {
    return await fetchAPI('/api/intelligence/graph');
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
};

// ============================================================
// Notifications API
// ============================================================

export const notifications = {
  getNotifications: async ({ page = 1, limit = 20, status = null, type = null } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    return await fetchAPI(`/api/notifications?${params}`);
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

  getAuditByToken: async (token) => {
    return await fetchAPI(`/api/audit-by-token/${token}`);
  },

  recordAuditAccess: async (token, pinEntered) => {
    return await fetchAPI(`/api/audit-access/${token}`, {
      method: 'POST',
      body: JSON.stringify({ pinEntered }),
    });
  },
};

// ==========================================================//
// Main api object - exported for components
// Must maintain compatible interface with existing component code
// ============================================================

// Initial seed data (used during auth loading state)
export const {
  initialOrganizations,
  initialUsers,
  initialLocations,
  initialLicenseTypes,
  initialDependencies,
  initialRequiredRules,
  initialDocuments,
} = require('./mockData');

// Main API object exported for components
// All methods return data directly (raw payload from backend)
// Components handle their own error states via try/catch
export const api = {
  // --- Organizations ---
  getOrganizations: async () => {
    const data = await tenancy.getOrganization();
    return data.organizations || [data];
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
    return data.locations || [];
  },

  saveLocations: () => {},

  addLocation: async (loc) => {
    const newLoc = { ...loc, id: `loc-${Date.now()}`, current_compliance_score: 100.0 };
    const result = await tenancy.createLocation(newLoc);
    return result;
  },

  // --- License Types & Dependencies ---
  getLicenseTypes: async () => {
    const data = await intelligence.getLicenseTypes();
    return data;
  },

  getDependencies: async () => {
    const data = await intelligence.getDependencies();
    return data;
  },

  getRequiredRules: async () => {
    const data = await intelligence.getRequiredRules();
    return data;
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

  // --- Compliance Score Engine ---
  calculateLocationScore: async (locationId) => {
    const result = await compliance.calculateLocationScore(locationId);
    return result;
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
  computeSHA256: async (textOrBuffer) => {
    const enc = new TextEncoder();
    const data = typeof textOrBuffer === "string" ? enc.encode(textOrBuffer) : textOrBuffer;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return require('crypto').createHash('sha256').update(typeof textOrBuffer === 'string' ? textOrBuffer : JSON.stringify(textOrBuffer)).digest('hex');
  },
};