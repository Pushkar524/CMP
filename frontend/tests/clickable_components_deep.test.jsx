import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import SettingsModal from '../src/components/Modals/SettingsModal';
import VersionHistoryModal from '../src/components/Modals/VersionHistoryModal';
import UploadDocumentModal from '../src/components/Modals/UploadDocumentModal';
import DeleteDocumentModal from '../src/components/Modals/DeleteDocumentModal';
import AddLocationModal from '../src/components/Modals/AddLocationModal';
import NotificationModal from '../src/components/NotificationModal';
import ScoreGauge from '../src/components/ScoreGauge';
import Layout from '../src/components/Layout';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { auth, api } from '../src/services/api';

describe('Clickable Components, Functions, and Properties Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==============================================================
  // 1. SettingsModal (Tabs, Toggles, Form Inputs, Reset & Save)
  // ==============================================================
  describe('SettingsModal Component', () => {
    const mockUser = { id: 'u1', name: 'Admin User', email: 'admin@acme.com', role: 'ORG_ADMIN' };
    const mockOrg = { id: 'org-1', name: 'Acme SuperCorp', tax_id: 'GSTIN-ACME-999' };

    const renderSettings = (props = {}) => {
      localStorage.setItem('sclip_auth_token', 'fake-jwt-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_org', JSON.stringify(mockOrg));

      return render(
        <AuthProvider>
          <SettingsModal isOpen={true} onClose={vi.fn()} {...props} />
        </AuthProvider>
      );
    };

    it('renders all tab navigation buttons and switches active view on click', () => {
      const handleClose = vi.fn();
      renderSettings({ onClose: handleClose });

      // Check header and tabs
      expect(screen.getByText(/Platform Settings & Policies/i)).toBeInTheDocument();

      const complianceTabBtn = screen.getByRole('button', { name: /Compliance Rules/i });
      const securityTabBtn = screen.getByRole('button', { name: /Security & RBAC/i });
      const alertsTabBtn = screen.getByRole('button', { name: /Alerts & Channels/i });
      const storageTabBtn = screen.getByRole('button', { name: /Storage & Cloud/i });

      // Click Compliance Rules tab
      fireEvent.click(complianceTabBtn);
      expect(screen.getByText(/License Expiry Lead Warning Threshold/i)).toBeInTheDocument();

      // Click Security & RBAC tab
      fireEvent.click(securityTabBtn);
      expect(screen.getByText(/Data Room Default Expiration/i)).toBeInTheDocument();

      // Click Alerts & Channels tab
      fireEvent.click(alertsTabBtn);
      expect(screen.getByText(/Email Dispatch \(Resend \/ SMTP\)/i)).toBeInTheDocument();

      // Click Storage & Cloud tab
      fireEvent.click(storageTabBtn);
      expect(screen.getByText(/Object Storage Provider/i)).toBeInTheDocument();
    });

    it('updates text input properties and persists changes to localStorage on Save Settings click', async () => {
      renderSettings();

      // On Organization tab, change headquarters input
      const hqInput = screen.getByDisplayValue(/Brigade Gateway, Bangalore/i);
      fireEvent.change(hqInput, { target: { value: 'Tower 4, Cyber City, Gurugram, 122002' } });
      expect(hqInput.value).toBe('Tower 4, Cyber City, Gurugram, 122002');

      // Click Save Settings button
      const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        const stored = localStorage.getItem('cmp_workspace_settings');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored);
        expect(parsed.headquarters).toBe('Tower 4, Cyber City, Gurugram, 122002');
      });
    });

    it('toggles boolean settings properties and resets to default values on Reset Defaults click', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderSettings();

      // Switch to Compliance Rules tab
      fireEvent.click(screen.getByRole('button', { name: /Compliance Rules/i }));

      // Find Cascading Penalty toggle
      const toggles = screen.getAllByRole('button').filter(b => b.className.includes('rounded-full'));
      expect(toggles.length).toBeGreaterThan(0);
      fireEvent.click(toggles[0]);

      // Click Reset Defaults button
      const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
      fireEvent.click(resetBtn);

      // Verify defaults are restored
      const stored = localStorage.getItem('cmp_workspace_settings');
      expect(stored).toBeNull();
    });

    it('calls onClose callback when clicking close button (X)', () => {
      const handleClose = vi.fn();
      renderSettings({ onClose: handleClose });

      const closeButtons = screen.getAllByRole('button');
      const closeBtn = closeButtons.find(b => b.querySelector('svg.lucide-x') || b.className.includes('text-gray-400'));
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  // ==============================================================
  // 2. VersionHistoryModal (Render, Document Thumbnails, Status Badges)
  // ==============================================================
  describe('VersionHistoryModal Component', () => {
    const dummyDocument = {
      id: 'doc-999',
      file_name: 'Factory_License_v2.pdf',
      version: 2,
      parent_document_id: 'doc-998',
      mime_type: 'application/pdf',
      file_size_bytes: 1048576,
      created_at: new Date('2026-06-01').toISOString(),
      license_type: { name: 'Factory Operating License' },
      status: 'APPROVED',
    };

    const allDocs = [
      dummyDocument,
      {
        id: 'doc-998',
        version: 1,
        parent_document_id: null,
        file_name: 'Factory_License_v1_rejected.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 850000,
        created_at: new Date('2026-01-15').toISOString(),
        status: 'REJECTED',
        rejection_reason: 'Missing municipal stamp on annexure 3',
        license_type: { name: 'Factory Operating License' },
      }
    ];

    it('renders version history details, rejection reasons, and status badges', () => {
      const handleClose = vi.fn();
      render(
        <VersionHistoryModal
          isOpen={true}
          onClose={handleClose}
          document={dummyDocument}
          allDocuments={allDocs}
        />
      );

      // Document title and file name
      expect(screen.getByText(/Factory Operating License/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Factory_License_v2\.pdf/i).length).toBeGreaterThan(0);

      // Check version entries
      expect(screen.getAllByText(/v2/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/v1/i).length).toBeGreaterThan(0);

      // Check rejection reason in v1
      expect(screen.getByText(/Missing municipal stamp on annexure 3/i)).toBeInTheDocument();

      // Close modal button
      const closeBtn = screen.getByRole('button', { name: /Close History/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('returns null when isOpen is false', () => {
      const { container } = render(
        <VersionHistoryModal
          isOpen={false}
          onClose={vi.fn()}
          document={dummyDocument}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ==============================================================
  // 3. UploadDocumentModal (Interactive Form Inputs, Selectors, Toggles)
  // ==============================================================
  describe('UploadDocumentModal Component', () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Bangalore Hub' },
      { id: 'loc-2', name: 'Mumbai Warehouse' }
    ];
    const mockLicenseTypes = [
      { id: 'lt-1', name: 'Trade License', default_validity_months: 12, is_lifetime_valid: false },
      { id: 'lt-2', name: 'FSSAI License', is_lifetime_valid: true }
    ];

    it('handles interactive inputs: license type selection, lifetime toggle, and form controls', () => {
      const handleClose = vi.fn();
      const handleUpload = vi.fn();

      render(
        <UploadDocumentModal
          isOpen={true}
          onClose={handleClose}
          onUpload={handleUpload}
          locations={mockLocations}
          licenseTypes={mockLicenseTypes}
        />
      );

      // Verify modal title
      expect(screen.getByText(/Upload Regulatory Document/i)).toBeInTheDocument();

      const licenseSelect = screen.getByLabelText(/License \/ Clearance Type/i);
      expect(within(licenseSelect).getByRole('option', { name: /Trade License/i })).toBeInTheDocument();
      expect(within(licenseSelect).getByRole('option', { name: /FSSAI License/i })).toBeInTheDocument();
      expect(within(licenseSelect).getByRole('option', { name: /Other/i })).toBeInTheDocument();

      const locationSelect = screen.getByRole('combobox', { name: /Jurisdiction \/ Scope/i });
      expect(within(locationSelect).getByRole('option', { name: /Bangalore Hub/i })).toBeInTheDocument();
      expect(within(locationSelect).getByRole('option', { name: /Mumbai Warehouse/i })).toBeInTheDocument();

      // Toggle Org-Wide scope
      const orgWideCheckbox = screen.getByRole('checkbox', { name: /Organization-Wide/i });
      fireEvent.click(orgWideCheckbox);
      expect(orgWideCheckbox).toBeChecked();

      // Toggle Lifetime Validity
      const lifetimeCheckbox = screen.getByRole('checkbox', { name: /Lifetime/i });
      fireEvent.click(lifetimeCheckbox);
      expect(lifetimeCheckbox).toBeChecked();

      // Close button
      const closeButtons = screen.getAllByRole('button');
      const closeBtn = closeButtons.find(b => b.querySelector('svg.lucide-x') || b.className.includes('text-gray-400'));
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('preserves Other mode and submits a manual document name', () => {
      const handleUpload = vi.fn();

      render(
        <UploadDocumentModal
          isOpen={true}
          onClose={vi.fn()}
          onUpload={handleUpload}
          locations={mockLocations}
          licenseTypes={mockLicenseTypes}
        />
      );

      fireEvent.change(screen.getByLabelText(/License \/ Clearance Type/i), {
        target: { value: "__other__" },
      });

      expect(screen.getByText(/Specify Custom Document/i)).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText(/ISO 9001 Quality Certificate/i), {
        target: { value: "Factory Fire Drill Certificate" },
      });
      fireEvent.change(screen.getByPlaceholderText(/Bureau Veritas/i), {
        target: { value: "State Fire Department" },
      });
      fireEvent.change(screen.getByLabelText(/Jurisdiction \/ Scope/i), {
        target: { value: "loc-1" },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /Lifetime/i }));
      fireEvent.submit(document.getElementById("upload-doc-form"));

      expect(handleUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          license_type_id: "__other__",
          custom_license_name: "Factory Fire Drill Certificate",
          custom_issuing_authority: "State Fire Department",
          location_id: "loc-1",
          is_lifetime_valid: true,
        }),
        null
      );
    });
  });

  // ==============================================================
  // 4. DeleteDocumentModal (Confirmation & Safe Purge Trigger)
  // ==============================================================
  describe('DeleteDocumentModal Component', () => {
    const sampleDoc = {
      id: 'doc-to-delete-123',
      file_name: 'Hazardous_Waste_NOC.pdf',
      license_type: { name: 'Pollution Control Board NOC' }
    };

    it('renders delete confirmation prompt and triggers onDelete with document id', () => {
      const handleClose = vi.fn();
      const handleDelete = vi.fn();

      render(
        <DeleteDocumentModal
          isOpen={true}
          onClose={handleClose}
          document={sampleDoc}
          onDelete={handleDelete}
          isDeleting={false}
        />
      );

      expect(screen.getByRole('heading', { name: /Delete Document/i })).toBeInTheDocument();
      expect(screen.getByText(/Hazardous_Waste_NOC\.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/Pollution Control Board NOC/i)).toBeInTheDocument();

      // Click Confirm Delete button
      const deleteBtn = screen.getByRole('button', { name: /Yes, Delete Document/i });
      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith('doc-to-delete-123');

      // Click Cancel button
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('disables delete button while isDeleting is true', () => {
      render(
        <DeleteDocumentModal
          isOpen={true}
          onClose={vi.fn()}
          document={sampleDoc}
          onDelete={vi.fn()}
          isDeleting={true}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /Deleting/i });
      expect(deleteBtn).toBeDisabled();
    });
  });

  // ==============================================================
  // 5. AddLocationModal (Facility Inputs, State Dropdown, Form Submission)
  // ==============================================================
  describe('AddLocationModal Component', () => {
    it('populates fields and triggers onAdd callback with formatted location payload', () => {
      const handleClose = vi.fn();
      const handleAdd = vi.fn();

      render(
        <AddLocationModal
          isOpen={true}
          onClose={handleClose}
          onAdd={handleAdd}
        />
      );

      expect(screen.getByText(/Add Store \/ Branch/i)).toBeInTheDocument();

      // Fill in facility name
      const nameInput = screen.getByPlaceholderText(/e\.g\. Koramangala Hypermart/i);
      fireEvent.change(nameInput, { target: { value: 'Whitefield Distribution Hub' } });

      // Fill in facility code
      const codeInput = screen.getByPlaceholderText(/BLR-STR-05/i);
      fireEvent.change(codeInput, { target: { value: 'blr-wh-02' } });

      // Fill in city
      const cityInput = screen.getByPlaceholderText(/Bengaluru/i);
      fireEvent.change(cityInput, { target: { value: 'Bengaluru' } });

      // Fill in pincode
      const pinInput = screen.getByPlaceholderText(/560034/i);
      fireEvent.change(pinInput, { target: { value: '560066' } });

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /Save Location/i });
      fireEvent.click(submitBtn);

      expect(handleAdd).toHaveBeenCalledTimes(1);
      const payload = handleAdd.mock.calls[0][0];
      expect(payload.name).toBe('Whitefield Distribution Hub');
      expect(payload.code).toBe('BLR-WH-02');
      expect(payload.city).toBe('Bengaluru');
      expect(payload.pincode).toBe('560066');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  // ==============================================================
  // 6. ScoreGauge (Gauge Properties, Risk Categorization & Labeling)
  // ==============================================================
  describe('ScoreGauge Component', () => {
    it('renders 100% Compliant score correctly', () => {
      render(<ScoreGauge score={100} size={140} showLabel={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/Compliant/i)).toBeInTheDocument();
    });

    it('renders Moderate Risk category for score 82%', () => {
      render(<ScoreGauge score={82} size={120} showLabel={true} />);
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText(/Moderate Risk/i)).toBeInTheDocument();
    });

    it('renders Critical Risk category for score 45%', () => {
      render(<ScoreGauge score={45} size={100} showLabel={true} />);
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText(/Critical Risk/i)).toBeInTheDocument();
    });
  });

  // ==============================================================
  // 7. NotificationModal (Alert List, Preferences Toggles, Actions)
  // ==============================================================
  describe('NotificationModal Component', () => {
    it('renders notification tabs and allows switching between alerts and preferences', () => {
      const handleClose = vi.fn();
      render(
        <NotificationProvider>
          <NotificationModal isOpen={true} onClose={handleClose} />
        </NotificationProvider>
      );

      // Verify header
      expect(screen.getByText(/Compliance Alert Center/i)).toBeInTheDocument();

      // Switch to Channels & Settings tab
      const prefsTabBtn = screen.getByRole('button', { name: /Channels & Settings/i });
      fireEvent.click(prefsTabBtn);
      expect(screen.getByText(/Email Notifications \(SMTP \/ Resend\)/i)).toBeInTheDocument();

      // Switch back to Recent Sweeps tab
      const alertsTabBtn = screen.getByRole('button', { name: /Recent Sweeps/i });
      fireEvent.click(alertsTabBtn);
      expect(screen.getByText(/All Caught Up!/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  // ==============================================================
  // 8. Layout Navigation & Core Shell
  // ==============================================================
  describe('Layout Component', () => {
    it('renders navigation links, brand, and triggers settings modal on click', async () => {
      localStorage.setItem('sclip_auth_token', 'mock-jwt-token');
      
      const mockProfile = {
        user: {
          id: 'usr-1',
          name: 'Pushkar Purohit',
          email: 'pushkar@acme.com',
          role: 'ORG_ADMIN'
        },
        organization: {
          id: 'org-1',
          name: 'Acme Logistics Ltd',
          tax_id: 'GSTIN-LOGISTICS-01'
        },
        accessibleLocations: []
      };

      vi.spyOn(auth, 'getCurrentUser').mockResolvedValue({
        data: mockProfile
      });
      vi.spyOn(api, 'getUsers').mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route path="dashboard" element={<div>Dashboard Child Page</div>} />
                </Route>
              </Routes>
            </NotificationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for auth hydration
      await waitFor(() => {
        expect(screen.getByText(/Compliance workspace/i)).toBeInTheDocument();
      });

      // Verify Navigation Links
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Locations/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Documents Registry/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Compliance Score Engine/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Cloud Data Rooms/i })).toBeInTheDocument();

      // Verify active tenant
      expect(screen.getByText('Acme Logistics Ltd')).toBeInTheDocument();

      // Click Settings button in sidebar
      const settingsBtns = screen.getAllByRole('button').filter(b => b.textContent && b.textContent.includes('Settings'));
      expect(settingsBtns.length).toBeGreaterThan(0);
      fireEvent.click(settingsBtns[0]);

      // Settings modal should open
      await waitFor(() => {
        expect(screen.getByText(/Platform Settings & Policies/i)).toBeInTheDocument();
      });
    });
  });
});
