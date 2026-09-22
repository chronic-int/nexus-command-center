import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../src/components/common/Modal';

function TestModalHarness({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button data-testid="external-trigger" onClick={() => setOpen(true)}>
        Open Modal
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Accessibility Test Dialog">
        <div>
          <button data-testid="first-button">First Action</button>
          <input data-testid="middle-input" placeholder="Type here" />
          <button data-testid="last-button">Last Action</button>
        </div>
      </Modal>
    </div>
  );
}

describe('Modal WAI-ARIA Accessibility & Focus Trapping', () => {
  it('renders modal dialog with correct aria attributes', () => {
    render(<TestModalHarness defaultOpen={true} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Accessibility Test Dialog')).toBeInTheDocument();
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();
    render(<TestModalHarness defaultOpen={true} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when clicking the backdrop', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
        <p>Content</p>
      </Modal>
    );

    const backdrop = container.querySelector('.bg-slate-950\\/70') as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab navigation within the modal dialog (wrapping last to first)', async () => {
    const user = userEvent.setup();
    render(<TestModalHarness defaultOpen={true} />);

    const firstBtn = screen.getByTestId('first-button');
    const middleInput = screen.getByTestId('middle-input');
    const lastBtn = screen.getByTestId('last-button');
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });

    // Focus on the last button
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Tab should wrap to the first interactive element (closeBtn or firstBtn)
    await user.tab();
    expect([closeBtn, firstBtn]).toContain(document.activeElement);
  });

  it('traps Shift+Tab navigation (wrapping first to last)', async () => {
    const user = userEvent.setup();
    render(<TestModalHarness defaultOpen={true} />);

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    const lastBtn = screen.getByTestId('last-button');

    // Focus close button (first element in header)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab should wrap to the last button
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('restores focus to trigger button after closing', async () => {
    const user = userEvent.setup();
    render(<TestModalHarness defaultOpen={false} />);

    const trigger = screen.getByTestId('external-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close with escape
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Focus should be restored to the external trigger
    expect(document.activeElement).toBe(trigger);
  });
});
