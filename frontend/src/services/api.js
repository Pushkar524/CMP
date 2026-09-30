import {
  initialOrganizations,
  initialUsers,
  initialLocations,
  initialLicenseTypes,
  initialDependencies,
  initialRequiredRules,
  initialDocuments,
  initialAuditLinks,
  initialNotificationLogs,
  initialNotificationPreferences
} from "./mockData";

// Helper to initialize local storage
const loadStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(`sclip_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveStorage = (key, data) => {
  try {
    localStorage.setItem(`sclip_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("Storage error:", e);
  }
};

// Compute SHA-256 in browser for real integrity checking
export async function computeSHA256(textOrBuffer) {
  const enc = new TextEncoder();
  const data = typeof textOrBuffer === "string" ? enc.encode(textOrBuffer) : textOrBuffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
  // Organizations
  getOrganizations: () => loadStorage("orgs", initialOrganizations),
  
  // Users & Auth
  getUsers: () => loadStorage("users", initialUsers),
  getCurrentUser: () => {
    const users = api.getUsers();
    const storedId = localStorage.getItem("sclip_current_user_id") || "user-1";
    return users.find(u => u.id === storedId) || users[0];
  },
  setCurrentUser: (userId) => {
    localStorage.setItem("sclip_current_user_id", userId);
  },

  // Locations
  getLocations: () => loadStorage("locations", initialLocations),
  saveLocations: (locs) => saveStorage("locations", locs),
  addLocation: (loc) => {
    const locations = api.getLocations();
    const newLoc = {
      ...loc,
      id: `loc-${Date.now()}`,
      current_compliance_score: 100.0
    };
    const updated = [newLoc, ...locations];
    api.saveLocations(updated);
    return newLoc;
  },

  // License Types & Dependencies
  getLicenseTypes: () => loadStorage("licenseTypes", initialLicenseTypes),
  getDependencies: () => loadStorage("dependencies", initialDependencies),
  getRequiredRules: () => loadStorage("requiredRules", initialRequiredRules),

  // Documents
  getDocuments: () => loadStorage("documents", initialDocuments),
  saveDocuments: (docs) => saveStorage("documents", docs),
  
  uploadDocument: async (docData, file) => {
    const docs = api.getDocuments();
    let hash = "";
    if (file) {
      const buffer = await file.arrayBuffer();
      hash = await computeSHA256(buffer);
    } else {
      hash = await computeSHA256(docData.file_name + Date.now());
    }

    const newDoc = {
      ...docData,
      id: `doc-${Date.now()}`,
      sha256_hash: hash,
      status: "PENDING_VERIFICATION",
      file_size: file ? file.size : 1245000,
      mime_type: file ? file.type : "application/pdf",
      storage_key: `sclip-docs/${new Date().getFullYear()}/${docData.file_name}`,
      uploaded_by_id: api.getCurrentUser().id,
      uploaded_by_name: api.getCurrentUser().name,
      verified_by_id: null,
      verified_by_name: null,
      verified_at: null,
      version: docData.parent_document_id ? (docData.parent_version || 1) + 1 : 1,
    };

    const updated = [newDoc, ...docs];
    api.saveDocuments(updated);
    return newDoc;
  },

  verifyDocument: (docId, approve, reason = null) => {
    const docs = api.getDocuments();
    const user = api.getCurrentUser();
    const updated = docs.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          status: approve ? "VERIFIED" : "REJECTED",
          rejection_reason: approve ? null : reason,
          verified_by_id: user.id,
          verified_by_name: user.name,
          verified_at: new Date().toISOString()
        };
      }
      return d;
    });
    api.saveDocuments(updated);
  },

  renewDocument: async (originalDoc, renewedData, file) => {
    const renewed = await api.uploadDocument({
      ...renewedData,
      parent_document_id: originalDoc.id,
      parent_version: originalDoc.version || 1
    }, file);
    return renewed;
  },

  // Dynamic Rule-Based Compliance Score Engine (Section 11 in README)
  calculateLocationScore: (locationId) => {
    const locations = api.getLocations();
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return { score: 100, breakdown: {}, suggestions: [] };

    const licenseTypes = api.getLicenseTypes();
    const requiredRules = api.getRequiredRules();
    const dependencies = api.getDependencies();
    const docs = api.getDocuments();

    // 1. Determine mandatory licenses for this location type and state
    const required = requiredRules.filter(
      r => r.location_type === loc.type && (r.state === null || r.state === loc.state)
    );

    const suggestions = [];
    let earnedPoints = 0;
    const maxPoints = Math.max(required.length * 25, 100);

    // Track status of licenses at this location
    const locationDocs = docs.filter(d => d.location_id === loc.id);

    // Check gaps (missing mandatory licenses)
    const gaps = [];
    required.forEach(req => {
      const lt = licenseTypes.find(t => t.id === req.license_type_id);
      const matchingDoc = locationDocs.find(d => d.license_type_id === req.license_type_id);

      if (!matchingDoc) {
        gaps.push(lt ? lt.name : "License");
        suggestions.push({
          type: "GAP",
          severity: "HIGH",
          title: `Missing Mandatory License: ${lt?.name || 'Required License'}`,
          desc: `Location type '${loc.type}' in ${loc.state} mandates ${lt?.name}. No document has been uploaded yet.`
        });
      } else {
        // Document exists: score status & expiry
        let docScore = 0;
        if (matchingDoc.status === "VERIFIED") {
          if (lt?.is_lifetime_valid || !matchingDoc.expiry_date) {
            docScore = 25; // Full marks for lifetime valid
          } else {
            const daysLeft = Math.ceil((new Date(matchingDoc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
              docScore = 0; // Expired
              suggestions.push({
                type: "EXPIRED",
                severity: "CRITICAL",
                title: `Expired License: ${lt?.name}`,
                desc: `Expired on ${matchingDoc.expiry_date}. Immediate renewal required.`
              });
            } else if (daysLeft <= 30) {
              docScore = 15; // Proximity to expiry penalty
              suggestions.push({
                type: "EXPIRING_SOON",
                severity: "MEDIUM",
                title: `Expiring in ${daysLeft} days: ${lt?.name}`,
                desc: `Renewal window open. Submit renewal to avoid compliance score drop.`
              });
            } else {
              docScore = 25; // Healthy
            }
          }
        } else if (matchingDoc.status === "PENDING_VERIFICATION") {
          docScore = 10;
          suggestions.push({
            type: "PENDING",
            severity: "LOW",
            title: `Verification Pending: ${lt?.name}`,
            desc: `Document uploaded. Awaiting Org Admin review and sign-off.`
          });
        } else {
          docScore = 0;
        }

        // Check Cascading Dependency Risk
        const depOnThis = dependencies.find(d => d.license_type_id === matchingDoc.license_type_id);
        if (depOnThis) {
          const prereqDoc = locationDocs.find(d => d.license_type_id === depOnThis.prerequisite_license_type_id);
          const prereqLt = licenseTypes.find(t => t.id === depOnThis.prerequisite_license_type_id);
          const isPrereqLapsed = !prereqDoc || prereqDoc.status === "EXPIRED" || 
            (prereqDoc.expiry_date && new Date(prereqDoc.expiry_date) < new Date());

          if (isPrereqLapsed) {
            docScore = Math.max(0, docScore - 15); // Cascading risk penalty
            suggestions.push({
              type: "CASCADING_RISK",
              severity: "CRITICAL",
              title: `Cascading Risk: ${lt?.name} blocked by ${prereqLt?.name || 'Prerequisite'}`,
              desc: `Prerequisite ${prereqLt?.name} has lapsed! Even though this license appears valid, statutory validity is suspended.`
            });
          }
        }

        earnedPoints += docScore;
      }
    });

    const finalScore = Math.min(100, Math.round((earnedPoints / maxPoints) * 100));

    // Update location cache
    loc.current_compliance_score = finalScore;
    api.saveLocations(locations);

    return {
      score: finalScore,
      breakdown: {
        totalMandatory: required.length,
        uploadedCount: locationDocs.length,
        gapsCount: gaps.length,
        earnedPoints,
        maxPoints
      },
      suggestions
    };
  },

  // Audit Links (Cloud Data Rooms)
  getAuditLinks: () => loadStorage("auditLinks", initialAuditLinks),
  saveAuditLinks: (links) => saveStorage("auditLinks", links),
  createAuditLink: (linkData) => {
    const links = api.getAuditLinks();
    const token = `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newLink = {
      ...linkData,
      id: `al-${Date.now()}`,
      token,
      created_by_id: api.getCurrentUser().id,
      created_by_name: api.getCurrentUser().name,
      is_active: true,
      access_logs: []
    };
    const updated = [newLink, ...links];
    api.saveAuditLinks(updated);
    return newLink;
  },
  revokeAuditLink: (linkId) => {
    const links = api.getAuditLinks();
    const updated = links.map(l => l.id === linkId ? { ...l, is_active: false } : l);
    api.saveAuditLinks(updated);
  },
  getAuditByToken: (token) => {
    const links = api.getAuditLinks();
    return links.find(l => l.token === token);
  },
  recordAuditAccess: (token, pinEntered) => {
    const links = api.getAuditLinks();
    let result = { allowed: false, link: null, message: "" };

    const updated = links.map(link => {
      if (link.token === token) {
        if (!link.is_active) {
          result = { allowed: false, message: "This audit data room has been revoked by the organization." };
          return link;
        }
        if (new Date(link.expires_at) < new Date()) {
          result = { allowed: false, message: "This audit share link has expired." };
          return link;
        }
        const pinValid = !link.pin_hash || link.pin_hash === pinEntered;
        const newLog = {
          id: `log-${Date.now()}`,
          accessed_at: new Date().toISOString(),
          ip_address: "Client (Demo IP)",
          user_agent: navigator.userAgent,
          success: pinValid
        };
        link.access_logs = [newLog, ...(link.access_logs || [])];

        if (pinValid) {
          result = { allowed: true, link };
        } else {
          result = { allowed: false, message: "Invalid PIN code entered." };
        }
      }
      return link;
    });

    api.saveAuditLinks(updated);
    return result;
  },

  // Notifications
  getNotifications: () => loadStorage("notifications", initialNotificationLogs),
  saveNotifications: (n) => saveStorage("notifications", n),
  markNotificationRead: (id) => {
    const notifs = api.getNotifications();
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    api.saveNotifications(updated);
  },
  getPreferences: () => loadStorage("preferences", initialNotificationPreferences),
  savePreferences: (p) => saveStorage("preferences", p)
};
