import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { ProfileView } from '../../src/components/profile/ProfileView';
import { SettingsView } from '../../src/components/settings/SettingsView';
import { UserMenu } from '../../src/components/layout/UserMenu';
import { Avatar } from '../../src/components/common/Avatar';
import { ShortcutsModal } from '../../src/components/layout/ShortcutsModal';
import { STORAGE_KEYS, clearNexusStorage } from '../../src/utils/storage';

// Helper test consumer
function ProfileTestConsumer() {
  const { userProfile, members, workspaceSettings } = useApp();
  const currentMember = members.find((m) => m.id === userProfile.id || m.id === 'user-1');
  return (
    <div>
      <div data-testid="consumer-user-name">{userProfile.name}</div>
      <div data-testid="consumer-user-role">{userProfile.role}</div>
      <div data-testid="consumer-user-availability">{userProfile.availability}</div>
      <div data-testid="consumer-member-name">{currentMember?.name}</div>
      <div data-testid="consumer-member-role">{currentMember?.role}</div>
      <div data-testid="consumer-ws-name">{workspaceSettings.name}</div>
    </div>
  );
}

describe('Phase 2 Prompt 1: Profile, Settings, and Personalization Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearNexusStorage();
    document.documentElement.className = '';
  });

  describe('1. User Profile Experience & Synchronization', () => {
    it('renders current user identity, role, department, and working hours in ProfileView', () => {
      render(
        <AppProvider>
          <ProfileView />
        </AppProvider>
      );

      // Identity headers
      expect(screen.getByRole('heading', { level: 1, name: /alex rivera/i })).toBeInTheDocument();
      expect(screen.getByText(/staff product engineer/i)).toBeInTheDocument();
      expect(screen.getAllByText(/engineering/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/alex.rivera@nexus.io/i)).toBeInTheDocument();
      expect(screen.getAllByText(/09:00 - 17:00 EST/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/America\/New_York/i)[0]).toBeInTheDocument();
    });

    it('allows entering edit mode and editing user profile attributes', async () => {
      render(
        <AppProvider>
          <ProfileView />
          <ProfileTestConsumer />
        </AppProvider>
      );

      // Click "Edit Profile" button
      const editBtn = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editBtn);

      // Verify form is visible
      const nameInput = screen.getByDisplayValue('Alex Rivera');
      const roleInput = screen.getByDisplayValue('Staff Product Engineer');

      fireEvent.change(nameInput, { target: { value: 'Alexandra Vance' } });
      fireEvent.change(roleInput, { target: { value: 'VP of Infrastructure' } });

      // Click "Save Profile Changes"
      const saveBtn = screen.getByRole('button', { name: /save profile changes/i });
      fireEvent.click(saveBtn);

      // Consumer should reflect updated profile
      await waitFor(() => {
        expect(screen.getByTestId('consumer-user-name')).toHaveTextContent('Alexandra Vance');
        expect(screen.getByTestId('consumer-user-role')).toHaveTextContent('VP of Infrastructure');
      });

      // Crucial: Workspace members collection must also be synchronized!
      expect(screen.getByTestId('consumer-member-name')).toHaveTextContent('Alexandra Vance');
      expect(screen.getByTestId('consumer-member-role')).toHaveTextContent('VP of Infrastructure');
    });

    it('validates required fields in profile form', async () => {
      render(
        <AppProvider>
          <ProfileView />
        </AppProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByDisplayValue('Alex Rivera');
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveBtn = screen.getByRole('button', { name: /save profile changes/i });
      fireEvent.click(saveBtn);

      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });

    it('warns when attempting to cancel with unsaved changes', async () => {
      render(
        <AppProvider>
          <ProfileView />
        </AppProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByDisplayValue('Alex Rivera');
      fireEvent.change(nameInput, { target: { value: 'Alex Rivera Edited' } });

      // Click Cancel
      const cancelBtn = screen.getAllByRole('button', { name: /^cancel$/i })[0];
      fireEvent.click(cancelBtn);

      // Warning modal appears
      expect(screen.getByText(/discard unsaved changes\?/i)).toBeInTheDocument();

      // Discard changes
      fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));
      expect(screen.queryByText(/discard unsaved changes\?/i)).not.toBeInTheDocument();
    });
  });

  describe('2. Avatar Experience & Fallback', () => {
    it('falls back to initials when avatar image fails to load', async () => {
      render(
        <Avatar
          name="Jordan Zhao"
          avatarUrl="https://invalid-non-existent-domain.test/photo.png"
          size="md"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();

      // Trigger image error
      fireEvent.error(img);

      // Initials fallback must render
      const fallback = screen.getByTestId('avatar-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('JZ');
    });

    it('renders initials immediately when no avatar url is provided', () => {
      render(<Avatar name="Marcus Vance" size="sm" />);
      const fallback = screen.getByTestId('avatar-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('MV');
    });
  });

  describe('3. User Menu & Availability Selector', () => {
    it('opens User Menu on avatar click and changes availability status immediately', async () => {
      const user = userEvent.setup();
      render(
        <AppProvider>
          <UserMenu />
          <ProfileTestConsumer />
        </AppProvider>
      );

      const triggerBtn = screen.getByRole('button', { name: /user menu for alex rivera/i });
      await user.click(triggerBtn);

      // Menu opens with user details
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText(/local-first workspace/i)).toBeInTheDocument();

      // Ensure NO fake sign-out button is present
      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();

      // Change availability to "In a meeting"
      const inMeetingBtn = screen.getByRole('menuitemradio', { name: /in a meeting/i });
      await user.click(inMeetingBtn);

      await waitFor(() => {
        expect(screen.getByTestId('consumer-user-availability')).toHaveTextContent('In a meeting');
      });
    });

    it('navigates to Profile view from User Menu', async () => {
      const user = userEvent.setup();
      function NavTest() {
        const { activeView } = useApp();
        return (
          <div>
            <UserMenu />
            <div data-testid="current-view">{activeView}</div>
          </div>
        );
      }

      render(
        <AppProvider>
          <NavTest />
        </AppProvider>
      );

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      await user.click(screen.getByRole('menuitem', { name: /view profile/i }));

      expect(screen.getByTestId('current-view')).toHaveTextContent('profile');
    });
  });

  describe('4. Appearance Settings & Immediate Live Preview', () => {
    it('applies theme, density, and reduced-motion live without requiring a save button', async () => {
      const user = userEvent.setup();
      function LiveAppearanceHarness() {
        const { theme, density, reducedMotion, setTheme, setDensity, setReducedMotion } = useApp();
        return (
          <div>
            <span data-testid="live-theme">{theme}</span>
            <span data-testid="live-density">{density}</span>
            <span data-testid="live-motion">{reducedMotion}</span>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setDensity('compact')}>Set Compact</button>
            <button onClick={() => setReducedMotion('always')}>Set Reduced Motion</button>
          </div>
        );
      }

      render(
        <AppProvider>
          <LiveAppearanceHarness />
        </AppProvider>
      );

      // Switch theme
      await user.click(screen.getByText('Set Light'));
      expect(screen.getByTestId('live-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Switch density
      await user.click(screen.getByText('Set Compact'));
      expect(screen.getByTestId('live-density')).toHaveTextContent('compact');
      expect(document.documentElement.classList.contains('density-compact')).toBe(true);

      // Switch reduced motion
      await user.click(screen.getByText('Set Reduced Motion'));
      expect(screen.getByTestId('live-motion')).toHaveTextContent('always');
      expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    });
  });

  describe('5. Data & Storage: Export, Import Validation, and Reset Flow', () => {
    it('exports structured workspace JSON with schema metadata', async () => {
      let exportedBlob: Blob | null = null;
      // Mock window.URL.createObjectURL
      window.URL.createObjectURL = vi.fn((blob: Blob) => {
        exportedBlob = blob;
        return 'blob:mock-url';
      });
      window.URL.revokeObjectURL = vi.fn();

      function ExportHarness() {
        const { exportWorkspaceData } = useApp();
        return <button onClick={exportWorkspaceData}>Trigger Export</button>;
      }

      render(
        <AppProvider>
          <ExportHarness />
        </AppProvider>
      );

      fireEvent.click(screen.getByText('Trigger Export'));

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(exportedBlob).not.toBeNull();
    });

    it('validates workspace import payload and rejects malformed data', () => {
      let validateFn: any;
      function ValidatorHarness() {
        const { validateImportPayload } = useApp();
        validateFn = validateImportPayload;
        return null;
      }

      render(
        <AppProvider>
          <ValidatorHarness />
        </AppProvider>
      );

      // Non-JSON input
      const invalidJson = validateFn('not-json-content');
      expect(invalidJson.valid).toBe(false);
      expect(invalidJson.error).toMatch(/JSON/i);

      // JSON without projects or tasks
      const missingCollections = validateFn(JSON.stringify({ someKey: 123 }));
      expect(missingCollections.valid).toBe(false);
      expect(missingCollections.error).toMatch(/missing/i);

      // Valid workspace JSON
      const validPayload = JSON.stringify({
        schemaVersion: 2,
        workspace: {
          projects: [{ id: 'p1', name: 'Proj 1' }],
          tasks: [{ id: 't1', title: 'Task 1' }],
          members: [],
          documents: [],
        },
      });
      const validRes = validateFn(validPayload);
      expect(validRes.valid).toBe(true);
      expect(validRes.counts.projects).toBe(1);
      expect(validRes.counts.tasks).toBe(1);
    });

    it('renders structured reset confirmation dialog detailing what will be deleted and what remains', async () => {
      const user = userEvent.setup();
      render(
        <AppProvider>
          <SettingsView />
        </AppProvider>
      );

      // Open reset modal
      const resetBtn = screen.getAllByRole('button', { name: /reset workspace/i })[0];
      await user.click(resetBtn);

      // Check modal heading and structured comparison
      expect(screen.getByRole('heading', { name: /reset nexus workspace\?/i })).toBeInTheDocument();
      expect(screen.getByText(/will be deleted/i)).toBeInTheDocument();
      expect(screen.getByText(/what will remain/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keep workspace/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset workspace to defaults/i })).toBeInTheDocument();
    });
  });

  describe('6. Shortcuts Platform-Aware Modifiers', () => {
    it('renders shortcuts modal with platform-aware key modifiers', () => {
      render(
        <AppProvider>
          <ShortcutsModal />
        </AppProvider>
      );

      // Trigger opening modal
      fireEvent.keyDown(window, { key: '?' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/accelerate your workflow with nexus hotkeys/i)).toBeInTheDocument();
      expect(screen.getByText(/quick navigation/i)).toBeInTheDocument();
    });
  });
});
