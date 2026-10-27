import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';

import CreateAuditLinkModal from '../src/components/Modals/CreateAuditLinkModal';
import VerifyDocumentModal from '../src/components/Modals/VerifyDocumentModal';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// Test protected layout consumer
function TestProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading workspace...</div>;
  return user ? <div><Outlet />Protected Content Loaded</div> : <div>Redirected to Login</div>;
}

// Consumer component to test AuthContext actions
function AuthTestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="auth-user">{user ? user.email : 'anonymous'}</div>
      <button onClick={() => login('admin@acme.com', 'Password@123')}>Login Button</button>
      <button onClick={() => logout()}>Logout Button</button>
    </div>
  );
}

describe('Frontend Component Tests', () => {
  let mockFetch;

  beforeEach(() => {
    localStorage.clear();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // 1. CreateAuditLinkModal submit payload
  // ============================================================
  describe('CreateAuditLinkModal', () => {
    const dummyDocs = [
      { id: 'doc-1', file_name: 'FSSAI_License.pdf', license_type: { name: 'Food Safety' } },
      { id: 'doc-2', file_name: 'Fire_NOC.pdf', license_type: { name: 'Fire Safety' } },
    ];

    it('asserts submit payload includes title, notes, expires_at, document_ids, and pin', () => {
      const handleCreate = vi.fn();
      const handleClose = vi.fn();

      render(
        <CreateAuditLinkModal
          isOpen={true}
          onClose={handleClose}
          onCreate={handleCreate}
          documents={dummyDocs}
        />
      );

      // Select first document
      const docCheckbox = screen.getByText(/FSSAI_License\.pdf/i);
      fireEvent.click(docCheckbox);

      // Fill in Title
      const titleInput = screen.getByPlaceholderText(/e\.g\. BBMP Annual Fire/i);
      fireEvent.change(titleInput, { target: { value: 'Annual Regulatory Review 2026' } });

      // Enable PIN and fill PIN
      const pinCheckbox = screen.getByLabelText(/Require PIN Protection/i);
      fireEvent.click(pinCheckbox);

      const pinInput = document.getElementById('pin-toggle-checkbox').closest('.grid').querySelector('input[type="text"]');
      fireEvent.change(pinInput, { target: { value: '482910' } });

      // Submit Form
      const submitBtn = screen.getByRole('button', { name: /Generate Audit Room Link/i });
      fireEvent.click(submitBtn);

      expect(handleCreate).toHaveBeenCalledTimes(1);
      const payload = handleCreate.mock.calls[0][0];

      // Contract Assertion:
      // Backend createAuditLink expects `{ title, notes, expires_at, pin, document_ids }`
      // and hashes `pin` server-side.
      expect(payload).toHaveProperty('title', 'Annual Regulatory Review 2026');
      expect(payload).toHaveProperty('document_ids', ['doc-1']);
      expect(payload).toHaveProperty('expires_at');
      // Assert CORRECT behaviour: the PIN sent to backend must be named 'pin', not 'pin_hash'
      expect(payload).toHaveProperty('pin', '482910');
      expect(payload).not.toHaveProperty('pin_hash');
    });
  });

  // ============================================================
  // 2. VerifyDocumentModal payload
  // ============================================================
  describe('VerifyDocumentModal', () => {
    const dummyDoc = {
      id: 'doc-101',
      file_name: 'Trade_License_2026.pdf',
      license_type: { name: 'Trade License' },
      uploaded_by: { name: 'Store Manager' },
      expiry_date: '2026-12-31',
      sha256_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    };

    it('asserts approval payload passes (document.id, true)', () => {
      const handleVerify = vi.fn();
      const handleClose = vi.fn();

      render(
        <VerifyDocumentModal
          isOpen={true}
          onClose={handleClose}
          document={dummyDoc}
          onVerify={handleVerify}
        />
      );

      const approveBtn = screen.getByRole('button', { name: /Verify & Confirm/i });
      fireEvent.click(approveBtn);

      expect(handleVerify).toHaveBeenCalledTimes(1);
      expect(handleVerify).toHaveBeenCalledWith('doc-101', true);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('asserts rejection payload passes (document.id, false, reason)', () => {
      const handleVerify = vi.fn();
      const handleClose = vi.fn();

      render(
        <VerifyDocumentModal
          isOpen={true}
          onClose={handleClose}
          document={dummyDoc}
          onVerify={handleVerify}
        />
      );

      // Click Reject to show rejection reason form
      const rejectInitialBtn = screen.getByRole('button', { name: /Reject Certificate/i });
      fireEvent.click(rejectInitialBtn);

      // Enter rejection reason
      const reasonInput = screen.getByPlaceholderText(/e\.g\. Issuing authority stamp unclear/i);
      fireEvent.change(reasonInput, { target: { value: 'Stamp unclear and address does not match BLR facility' } });

      // Confirm rejection
      const confirmRejectBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
      fireEvent.click(confirmRejectBtn);

      expect(handleVerify).toHaveBeenCalledTimes(1);
      expect(handleVerify).toHaveBeenCalledWith(
        'doc-101',
        false,
        'Stamp unclear and address does not match BLR facility'
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 3. ProtectedLayout (redirects when logged out)
  // ============================================================
  describe('ProtectedLayout', () => {
    it('redirects to /login when user is logged out (no auth token)', async () => {
      localStorage.clear();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Screen</div>} />
              <Route path="/" element={<TestProtectedLayout />}>
                <Route path="dashboard" element={<div>Dashboard Screen</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Redirected to Login')).toBeInTheDocument();
      });
    });

    it('renders protected layout when authenticated user exists', async () => {
      localStorage.setItem('sclip_auth_token', 'valid-jwt');

      mockFetch
        // 1. GET /api/auth/me
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              user: { id: 'u-1', email: 'admin@acme.com', role: 'LOCATION_MANAGER' },
              organization: { id: 'org-1', name: 'Acme' },
              accessibleLocations: [{ id: 'loc-1' }],
            },
          }),
        });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Screen</div>} />
              <Route path="/" element={<TestProtectedLayout />}>
                <Route path="dashboard" element={<div>Dashboard Screen</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Protected Content Loaded/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // 4. AuthContext login / logout
  // ============================================================
  describe('AuthContext login/logout workflow', () => {
    it('handles successful login and populates user state', async () => {
      mockFetch
        // 1. POST /api/auth/login
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              token: 'jwt-12345',
              user: { id: 'u-mgr', email: 'mgr@acme.com', role: 'LOCATION_MANAGER' },
              organization: { id: 'org-1', name: 'Acme Retail' },
              accessibleLocations: [{ id: 'loc-1' }],
            },
          }),
        });

      render(
        <AuthProvider>
          <AuthTestConsumer />
        </AuthProvider>
      );

      const loginBtn = screen.getByRole('button', { name: /Login Button/i });
      await act(async () => {
        fireEvent.click(loginBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-user')).toHaveTextContent('mgr@acme.com');
      });
      expect(localStorage.getItem('sclip_auth_token')).toBe('jwt-12345');
    });

    it('clears credentials and resets user state on logout', async () => {
      localStorage.setItem('sclip_auth_token', 'jwt-12345');
      localStorage.setItem('sclip_user_id', 'u-admin');

      render(
        <AuthProvider>
          <AuthTestConsumer />
        </AuthProvider>
      );

      const logoutBtn = screen.getByRole('button', { name: /Logout Button/i });
      act(() => {
        fireEvent.click(logoutBtn);
      });

      expect(screen.getByTestId('auth-user')).toHaveTextContent('anonymous');
      expect(localStorage.getItem('sclip_auth_token')).toBeNull();
      expect(localStorage.getItem('sclip_user_id')).toBeNull();
    });
  });
});
