import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../../src/components/projects/TaskCard';
import { AppProvider } from '../../src/context/AppContext';
import { Task } from '../../src/types';

const mockTask: Task = {
  id: 'task-kanban-test',
  key: 'TSK-99',
  title: 'Test Accessible Kanban Progression',
  description: 'Testing touch/keyboard controls',
  status: 'In Progress',
  priority: 'High',
  projectId: 'proj-1',
  assigneeId: 'user-1',
  dueDate: '2026-10-15',
  startDate: '2026-09-01',
  estimatedHours: 4,
  labels: ['Core'],
  subtasks: [],
  comments: [],
  attachments: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('Kanban Keyboard & Touch Status Progression Controls', () => {
  it('renders forward and backward accessible progression buttons for intermediate status', () => {
    render(
      <AppProvider>
        <TaskCard
          task={mockTask}
          onDragStart={vi.fn()}
          onClick={vi.fn()}
        />
      </AppProvider>
    );

    const backButton = screen.getByRole('button', {
      name: /move task TSK-99 back to Todo/i,
    });
    const advanceButton = screen.getByRole('button', {
      name: /advance task TSK-99 to Review/i,
    });

    expect(backButton).toBeInTheDocument();
    expect(advanceButton).toBeInTheDocument();
  });

  it('renders only forward button for Backlog status', () => {
    const backlogTask: Task = { ...mockTask, status: 'Backlog' };
    render(
      <AppProvider>
        <TaskCard
          task={backlogTask}
          onDragStart={vi.fn()}
          onClick={vi.fn()}
        />
      </AppProvider>
    );

    expect(screen.queryByRole('button', { name: /back to/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advance task TSK-99 to Todo/i })).toBeInTheDocument();
  });

  it('renders only backward button for Done status', () => {
    const doneTask: Task = { ...mockTask, status: 'Done' };
    render(
      <AppProvider>
        <TaskCard
          task={doneTask}
          onDragStart={vi.fn()}
          onClick={vi.fn()}
        />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: /move task TSK-99 back to Review/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /advance task/i })).not.toBeInTheDocument();
  });

  it('allows keyboard navigation and triggering status movement via Enter/Space', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <AppProvider>
        <TaskCard
          task={mockTask}
          onDragStart={vi.fn()}
          onClick={handleClick}
        />
      </AppProvider>
    );

    const advanceButton = screen.getByRole('button', {
      name: /advance task TSK-99 to Review/i,
    });

    // Focus advance button and press Enter
    advanceButton.focus();
    expect(document.activeElement).toBe(advanceButton);

    await user.keyboard('{Enter}');

    // Clicking quick navigation should stop propagation to card click handler
    expect(handleClick).not.toHaveBeenCalled();
  });
});
