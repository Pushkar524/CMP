import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import Dashboard from '../src/pages/Dashboard/Dashboard';
import Locations from '../src/pages/Locations/Locations';
import Documents from '../src/pages/Documents/Documents';
import ComplianceScore from '../src/pages/ComplianceScore/ComplianceScore';
import AuditLinks from '../src/pages/AuditLinks/AuditLinks';
import AuditView from '../src/pages/AuditView/AuditView';
import { api } from '../src/services/api';

// Mock useAuth hook
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'admin@acme.com', role: 'ORG_ADMIN' },
    isOrgAdmin: true,
    isLocationManager: false,
    canAccessLocation: () => true,
    loading: false,
  }),
}));

describe('Frontend Pages State Rendering Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // Page 1: Dashboard
  // ============================================================
  describe('Dashboard Page', () => {
    it('renders loading state while data is being fetched', () => {
      vi.spyOn(api, 'getLocations').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getDocuments').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getLicenseTypes').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Skeletons are rendered during loading (DashboardSkeleton has animate-pulse)
      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders empty state when no locations or documents exist', async () => {
      vi.spyOn(api, 'getLocations').mockResolvedValue([]);
      vi.spyOn(api, 'getDocuments').mockResolvedValue([]);
      vi.spyOn(api, 'getLicenseTypes').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/0 Locations/i)).toBeInTheDocument();
        expect(screen.getByText(/No active operational facilities registered/i)).toBeInTheDocument();
      });
    });

    it('renders visible error state when API call fails', async () => {
      vi.spyOn(api, 'getLocations').mockRejectedValue(new Error('Network error: Unable to connect to server'));
      vi.spyOn(api, 'getDocuments').mockRejectedValue(new Error('Network error'));
      vi.spyOn(api, 'getLicenseTypes').mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Assert CORRECT behaviour: A failed API call must show a visible error message
        const errorElement = screen.queryByText(/failed|error|unable to load|something went wrong/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Page 2: Locations
  // ============================================================
  describe('Locations Page', () => {
    it('renders loading state while fetching locations', () => {
      vi.spyOn(api, 'getLocations').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getDocuments').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <Locations />
        </MemoryRouter>
      );

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders empty state when no locations exist', async () => {
      vi.spyOn(api, 'getLocations').mockResolvedValue([]);
      vi.spyOn(api, 'getDocuments').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <Locations />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No locations found/i)).toBeInTheDocument();
      });
    });

    it('renders visible error message when API call fails', async () => {
      vi.spyOn(api, 'getLocations').mockRejectedValue(new Error('Database error'));
      vi.spyOn(api, 'getDocuments').mockRejectedValue(new Error('Database error'));

      render(
        <MemoryRouter>
          <Locations />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Assert CORRECT behaviour: A failed API call must display a visible error notification
        const errorElement = screen.queryByText(/failed|error|unable to load|something went wrong/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Page 3: Documents
  // ============================================================
  describe('Documents Page', () => {
    it('renders loading state while fetching documents', () => {
      vi.spyOn(api, 'getDocuments').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getLocations').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getLicenseTypes').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <Documents />
        </MemoryRouter>
      );

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders empty state when no documents exist', async () => {
      vi.spyOn(api, 'getDocuments').mockResolvedValue([]);
      vi.spyOn(api, 'getLocations').mockResolvedValue([{ id: 'loc-1', name: 'Store 1' }]);
      vi.spyOn(api, 'getLicenseTypes').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <Documents />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No compliance documents found/i)).toBeInTheDocument();
      });
    });

    it('renders visible error message when API call fails', async () => {
      vi.spyOn(api, 'getDocuments').mockRejectedValue(new Error('Internal Server Error'));
      vi.spyOn(api, 'getLocations').mockRejectedValue(new Error('Internal Server Error'));
      vi.spyOn(api, 'getLicenseTypes').mockRejectedValue(new Error('Internal Server Error'));

      render(
        <MemoryRouter>
          <Documents />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Assert CORRECT behaviour: Failure must show user-facing error message
        const errorElement = screen.queryByText(/failed|error|unable to load|something went wrong/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Page 4: ComplianceScore
  // ============================================================
  describe('ComplianceScore Page', () => {
    it('renders loading state while calculating scores', () => {
      vi.spyOn(api, 'getLocations').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getDependencies').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getLicenseTypes').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getDocuments').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <ComplianceScore />
        </MemoryRouter>
      );

      expect(screen.getByText(/Evaluating Regulatory Compliance Engine/i)).toBeInTheDocument();
    });

    it('renders empty state when organization has no locations', async () => {
      vi.spyOn(api, 'getLocations').mockResolvedValue([]);
      vi.spyOn(api, 'getDependencies').mockResolvedValue([]);
      vi.spyOn(api, 'getLicenseTypes').mockResolvedValue([]);
      vi.spyOn(api, 'getDocuments').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <ComplianceScore />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No operational locations registered/i)).toBeInTheDocument();
      });
    });

    it('renders visible error message when compliance score calculation API fails', async () => {
      vi.spyOn(api, 'getLocations').mockRejectedValue(new Error('Calculation engine unreachable'));
      vi.spyOn(api, 'getDependencies').mockRejectedValue(new Error('Calculation engine unreachable'));
      vi.spyOn(api, 'getLicenseTypes').mockRejectedValue(new Error('Calculation engine unreachable'));
      vi.spyOn(api, 'getDocuments').mockRejectedValue(new Error('Calculation engine unreachable'));

      render(
        <MemoryRouter>
          <ComplianceScore />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Assert CORRECT behaviour: Error must be displayed to user
        const errorElement = screen.queryByText(/failed|error|unable to load|something went wrong/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Page 5: AuditLinks
  // ============================================================
  describe('AuditLinks Page', () => {
    it('renders loading skeleton while loading audit data rooms', () => {
      vi.spyOn(api, 'getAuditLinks').mockReturnValue(new Promise(() => {}));
      vi.spyOn(api, 'getDocuments').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <AuditLinks />
        </MemoryRouter>
      );

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders empty state when no audit data rooms exist', async () => {
      vi.spyOn(api, 'getAuditLinks').mockResolvedValue([]);
      vi.spyOn(api, 'getDocuments').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <AuditLinks />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No active audit links generated/i)).toBeInTheDocument();
      });
    });

    it('renders visible error message when audit links API fails', async () => {
      vi.spyOn(api, 'getAuditLinks').mockRejectedValue(new Error('Failed to fetch audit links'));
      vi.spyOn(api, 'getDocuments').mockRejectedValue(new Error('Failed to fetch documents'));

      render(
        <MemoryRouter>
          <AuditLinks />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Assert CORRECT behaviour: Error message must be visible
        const errorElement = screen.queryByText(/failed|error|unable to load|something went wrong/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Page 6: AuditView (Public Inspector Portal)
  // ============================================================
  describe('AuditView Page', () => {
    it('renders loading state when validating audit token', () => {
      vi.spyOn(api, 'getAuditByToken').mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter initialEntries={['/audit/test-token-123']}>
          <Routes>
            <Route path="/audit/:token" element={<AuditView />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Validating Secure Audit Token/i)).toBeInTheDocument();
    });

    it('renders Access Denied error message when token is invalid or revoked', async () => {
      vi.spyOn(api, 'getAuditByToken').mockRejectedValue(new Error('This audit data room has been revoked by the organization.'));

      render(
        <MemoryRouter initialEntries={['/audit/revoked-token']}>
          <Routes>
            <Route path="/audit/:token" element={<AuditView />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/This audit data room has been revoked by the organization\./i)).toBeInTheDocument();
      });
    });

    it('renders empty state when audit room contains no documents', async () => {
      vi.spyOn(api, 'getAuditByToken').mockResolvedValue({
        data: {
          title: 'Empty Inspector Room',
          expires_at: '2026-12-31T00:00:00Z',
          documents: [],
        },
      });

      render(
        <MemoryRouter initialEntries={['/audit/empty-room']}>
          <Routes>
            <Route path="/audit/:token" element={<AuditView />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Empty Inspector Room')).toBeInTheDocument();
        expect(screen.getByText(/Verified Compliance Documents\s*\(\s*0\s*\)/i)).toBeInTheDocument();
      });
    });
  });
});
