import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { Topbar } from '../../src/components/layout/Topbar';
import { QuickCreateModal } from '../../src/components/layout/QuickCreateModal';
import { CommandPalette } from '../../src/components/layout/CommandPalette';
import { CalendarView } from '../../src/components/calendar/CalendarView';
import { SettingsView } from '../../src/components/settings/SettingsView';
import { ProjectsDirectory } from '../../src/components/projects/ProjectsDirectory';
import { clearNexusStorage } from '../../src/utils/storage';

// Helper component to observe and manipulate AppContext state in tests
function ContextStateInspector({ onState }: { onState: (state: ReturnType<typeof useApp>) => void }) {
  const app = useApp();
  React.useEffect(() => {
    onState(app);
  });
  return (
    <div data-testid="context-inspector">
      <span data-testid="active-view">{app.activeView}</span>
      <span data-testid="active-project-id">{app.activeProjectId || 'null'}</span>
      <span data-testid="project-tab">{app.projectTab}</span>
      <span data-testid="last-active-project-id">{app.lastActiveProjectId || 'null'}</span>
      <span data-testid="previous-view">{app.previousView || 'null'}</span>
      <span data-testid="unread-count">{app.unreadNotificationsCount}</span>
      <span data-testid="selected-task-id">{app.selectedTaskId || 'null'}</span>
      <span data-testid="selected-doc-id">{app.selectedDocId || 'null'}</span>
      <span data-testid="selected-member-id">{app.selectedMemberId || 'null'}</span>
      <span data-testid="settings-tab">{app.settingsTab}</span>
      <span data-testid="is-command-palette-open">{app.isCommandPaletteOpen ? 'open' : 'closed'}</span>
      <span data-testid="is-quick-create-open">{app.isQuickCreateOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

describe('Phase 2 Prompt 2: Product Behavior Coherence Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearNexusStorage();
    document.documentElement.className = '';
  });

  describe('1. Navigation Model & Projects Semantic Separation', () => {
    it('sidebar "Projects" navigates to Projects Directory with activeProjectId = null', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <Sidebar />
        </AppProvider>
      );

      // First open a specific project
      act(() => {
        currentState.openProject('proj-1');
      });
      await waitFor(() => {
        expect(screen.getByTestId('active-project-id').textContent).toBe('proj-1');
      });

      // Click "Projects" in sidebar
      const projectsNavBtn = screen.getByTestId('nav-projects');
      fireEvent.click(projectsNavBtn);

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('projects');
        expect(screen.getByTestId('active-project-id').textContent).toBe('null');
        // lastActiveProjectId is preserved
        expect(screen.getByTestId('last-active-project-id').textContent).toBe('proj-1');
      });
    });

    it('opening a project honors productivitySettings.defaultProjectTab', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <ProjectsDirectory />
        </AppProvider>
      );

      // Change default project tab to 'Timeline'
      act(() => {
        currentState.updateProductivitySettings({ defaultProjectTab: 'Timeline' });
      });

      await waitFor(() => {
        expect(screen.getByText('Aurora Cloud Engine')).toBeInTheDocument();
      });

      // Open project via directory card click
      const projectCard = screen.getByText('Aurora Cloud Engine');
      fireEvent.click(projectCard);

      await waitFor(() => {
        expect(screen.getByTestId('active-project-id').textContent).toBe('proj-1');
        expect(screen.getByTestId('project-tab').textContent).toBe('Timeline');
      });
    });

    it('preserves previousView and returns via returnToPreviousView()', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
        </AppProvider>
      );

      // Start on calendar
      act(() => {
        currentState.setActiveView('calendar');
      });
      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('calendar');
      });

      // Navigate to settings
      act(() => {
        currentState.setActiveView('settings');
      });
      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('settings');
        expect(screen.getByTestId('previous-view').textContent).toBe('calendar');
      });

      // Return to previous view
      act(() => {
        currentState.returnToPreviousView();
      });
      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('calendar');
      });
    });
  });

  describe('2. Intelligent Quick Create & Workspace Defaults Integration', () => {
    it('preselects activeProjectId and workspaceSettings.defaultTaskPriority in task creation', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <QuickCreateModal />
        </AppProvider>
      );

      // Set active project to proj-2 and defaultTaskPriority to 'High' before opening
      act(() => {
        currentState.openProject('proj-2');
        currentState.updateWorkspaceSettings({ defaultTaskPriority: 'High' });
        currentState.setQuickCreateDefaultTab('task');
        currentState.setIsQuickCreateOpen(true);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Object')).toBeInTheDocument();
      });

      // Check preselected project
      const projectSelect = screen.getByLabelText(/project/i) as HTMLSelectElement;
      expect(projectSelect.value).toBe('proj-2');

      // Check preselected priority
      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      expect(prioritySelect.value).toBe('High');
    });

    it('auto-assigns creator when workspaceSettings.autoAssignCreator is enabled', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <QuickCreateModal />
        </AppProvider>
      );

      act(() => {
        currentState.updateWorkspaceSettings({ autoAssignCreator: true });
        currentState.setQuickCreateDefaultTab('task');
        currentState.setIsQuickCreateOpen(true);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Object')).toBeInTheDocument();
      });

      const assigneeSelect = screen.getByLabelText(/assignee/i) as HTMLSelectElement;
      expect(assigneeSelect.value).toBe(currentState.userProfile.id);
    });

    it('prefills projectKeyPrefix when creating a project in QuickCreateModal', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <QuickCreateModal />
        </AppProvider>
      );

      act(() => {
        currentState.updateWorkspaceSettings({ projectKeyPrefix: 'ALPHA' });
        currentState.setIsQuickCreateOpen(true);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Object')).toBeInTheDocument();
      });

      // Switch to project tab
      const projectTabBtn = screen.getByRole('button', { name: /project/i });
      fireEvent.click(projectTabBtn);

      await waitFor(() => {
        const keyInput = screen.getByPlaceholderText('e.g. CHR') as HTMLInputElement;
        expect(keyInput.value).toBe('ALPHA-');
      });
    });

    it('creating a project opens it immediately using openProject', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <QuickCreateModal />
        </AppProvider>
      );

      act(() => {
        currentState.setQuickCreateDefaultTab('project');
        currentState.setIsQuickCreateOpen(true);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\. Chronos Time-Series Ingestion/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/e\.g\. Chronos Time-Series Ingestion/i);
      fireEvent.change(nameInput, { target: { value: 'Nebula Distributed Cloud' } });

      const submitBtn = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('projects');
        expect(screen.getByTestId('active-project-id').textContent).not.toBe('null');
      });
    });

    it('creating a document navigates to documents view and selects the document', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <QuickCreateModal />
        </AppProvider>
      );

      act(() => {
        currentState.setQuickCreateDefaultTab('document');
        currentState.setIsQuickCreateOpen(true);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\. Distributed Memory Storage RFC/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText(/e\.g\. Distributed Memory Storage RFC/i);
      fireEvent.change(titleInput, { target: { value: 'Zero-Trust Protocol Spec' } });

      const submitBtn = screen.getByRole('button', { name: /create document/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).toBe('documents');
        expect(screen.getByTestId('selected-doc-id').textContent).not.toBe('null');
      });
    });
  });

  describe('3. Notification Integrity & Category Subscriptions', () => {
    it('unreadNotificationsCount respects inAppNotifications master toggle', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
        </AppProvider>
      );

      // Default should have unread notifications count > 0
      const initialCount = parseInt(screen.getByTestId('unread-count').textContent || '0', 10);
      expect(initialCount).toBeGreaterThan(0);

      // Turn off inAppNotifications
      act(() => {
        currentState.updateNotificationPreferences({ inAppNotifications: false });
      });

      await waitFor(() => {
        expect(screen.getByTestId('unread-count').textContent).toBe('0');
      });
    });

    it('unreadNotificationsCount filters out disabled categories', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
        </AppProvider>
      );

      // Disable all categories
      act(() => {
        currentState.updateNotificationPreferences({
          categories: {
            assignments: false,
            mentions: false,
            deadlines: false,
            projectUpdates: false,
            automationEvents: false,
            workspaceActivity: false,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('unread-count').textContent).toBe('0');
      });
    });
  });

  describe('4. Keyboard Shortcuts Master Toggle & Command Palette', () => {
    it('disabling keyboardShortcutsEnabled suppresses ⌘K and / hotkeys', async () => {
      let currentState: any;
      render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <CommandPalette />
        </AppProvider>
      );

      // Disable shortcuts
      act(() => {
        currentState.updateProductivitySettings({ keyboardShortcutsEnabled: false });
      });

      await waitFor(() => {
        expect(currentState.productivitySettings.keyboardShortcutsEnabled).toBe(false);
      });

      // Trigger ⌘K
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      expect(screen.getByTestId('is-command-palette-open').textContent).toBe('closed');

      // Trigger /
      fireEvent.keyDown(window, { key: '/' });
      expect(screen.getByTestId('is-command-palette-open').textContent).toBe('closed');

      // Re-enable shortcuts
      act(() => {
        currentState.updateProductivitySettings({ keyboardShortcutsEnabled: true });
      });

      await waitFor(() => {
        expect(currentState.productivitySettings.keyboardShortcutsEnabled).toBe(true);
      });

      // Trigger ⌘K
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      await waitFor(() => {
        expect(screen.getByTestId('is-command-palette-open').textContent).toBe('open');
      });
    });
  });

  describe('5. Calendar View Coherence with startOfWeek and workingDays', () => {
    it('adapts column headers and grid offset based on startOfWeek preference', async () => {
      let currentState: any;
      const { rerender } = render(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <CalendarView />
        </AppProvider>
      );

      // Default startOfWeek is monday: header contains Mon
      expect(screen.getAllByText('Mon')[0]).toBeInTheDocument();

      // Change startOfWeek to sunday
      act(() => {
        currentState.updateProductivitySettings({ startOfWeek: 'sunday' });
      });

      rerender(
        <AppProvider>
          <ContextStateInspector onState={(s) => { currentState = s; }} />
          <CalendarView />
        </AppProvider>
      );

      // Weekday headers should include Sun
      expect(screen.getAllByText('Sun')[0]).toBeInTheDocument();
    });
  });

  describe('6. Search Recognition Context & Settings Search Auto-Switch', () => {
    it('topbar search displays recognition context (Task • [Project Name])', async () => {
      const user = userEvent.setup();
      render(
        <AppProvider>
          <Topbar />
        </AppProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search projects, tasks, people, docs/i);
      await user.type(searchInput, 'API');

      await waitFor(() => {
        // Result items should include "Task • " or "Project"
        expect(screen.getAllByText(/task •/i).length).toBeGreaterThan(0);
      });
    });

    it('settings search automatically switches to the highest matching tab', async () => {
      const user = userEvent.setup();
      render(
        <AppProvider>
          <ContextStateInspector onState={() => {}} />
          <SettingsView />
        </AppProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search settings/i);
      await user.type(searchInput, 'dark mode');

      await waitFor(() => {
        expect(screen.getByTestId('settings-tab').textContent).toBe('appearance');
      });

      await user.clear(searchInput);
      await user.type(searchInput, 'start of week');

      await waitFor(() => {
        expect(screen.getByTestId('settings-tab').textContent).toBe('productivity');
      });
    });
  });
});
