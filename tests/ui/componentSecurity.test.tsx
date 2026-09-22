import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderSafeMarkdown } from '../../src/utils/markdown';
import { Modal } from '../../src/components/common/Modal';

// A wrapper component to test DOM-level markdown injection directly
const MarkdownPreviewTestHarness: React.FC<{ content: string }> = ({ content }) => {
  const html = renderSafeMarkdown(content);
  return (
    <div data-testid="markdown-container" dangerouslySetInnerHTML={{ __html: html }} />
  );
};

describe('Component-Level Security & DOM Invariants', () => {
  describe('Document Markdown DOM Sanitization', () => {
    it('neutralizes malicious script tags and inline handlers in rendered DOM', () => {
      const maliciousPayloads = [
        '<script>window.pwned = true;</script>',
        '<img src="invalid-src" onerror="alert(1)" />',
        '<svg onload="alert(1)"><circle r="10"/></svg>',
        '<iframe src="https://evil.example.com/exploit"></iframe>',
        '<a href="javascript:alert(1)">Click for exploit</a>',
        '<input type="text" autofocus onfocus="alert(1)" />',
      ];

      for (const payload of maliciousPayloads) {
        const { container } = render(<MarkdownPreviewTestHarness content={payload} />);

        // 1. Must not contain executable script nodes
        expect(container.querySelector('script')).toBeNull();

        // 2. Must not contain executable iframe nodes
        expect(container.querySelector('iframe')).toBeNull();

        // 3. Must not render executable onerror or onload handler attributes
        expect(container.querySelector('[onerror]')).toBeNull();
        expect(container.querySelector('[onload]')).toBeNull();
        expect(container.querySelector('[onfocus]')).toBeNull();

        // 4. Any rendered link must NOT have javascript: protocol
        const links = Array.from(container.querySelectorAll('a'));
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          expect(href.toLowerCase().startsWith('javascript:')).toBe(false);
          expect(href).not.toContain('javascript:');
        }
      }
    });

    it('preserves legitimate safe markdown formatting', () => {
      const safeMarkdown = `# Core Architecture
## Subsystem
**Bold statement** and *italic note* and \`inline code\`.
[Safe External Link](https://nexus.internal/docs)
- Bullet point 1
- Bullet point 2
`;
      const { container } = render(<MarkdownPreviewTestHarness content={safeMarkdown} />);

      expect(container.querySelector('h1')?.textContent).toBe('Core Architecture');
      expect(container.querySelector('h2')?.textContent).toBe('Subsystem');
      expect(container.querySelector('strong')?.textContent).toBe('Bold statement');
      expect(container.querySelector('em')?.textContent).toBe('italic note');
      expect(container.querySelector('code')?.textContent).toBe('inline code');

      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://nexus.internal/docs');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Modal Background Isolation & Accessibility', () => {
    it('sets aria-modal, role dialog, and aria-hidden on backdrop', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Security Confirmation">
          <div>Modal Dialog Content</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');

      // Backdrop has aria-hidden=true
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('dismisses modal on Escape keydown', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Keyboard Test">
          <button type="button">Focusable</button>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render anything when isOpen is false', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Modal isOpen={false} onClose={handleClose} title="Closed Modal">
          <div>Hidden Content</div>
        </Modal>
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
