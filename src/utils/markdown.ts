/**
 * XSS-Safe Markdown Parser & Sanitizer for NEXUS Document Preview
 * Strictly escapes all raw HTML input and verifies URL schemes to eliminate script execution vectors.
 */

/**
 * Escapes raw HTML tags and characters to prevent XSS.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes URLs to ensure they only use safe protocols (http, https, mailto, relative).
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Normalize and decode entities to uncover obfuscated schemes
  const normalized = trimmed
    .replace(/&amp;/gi, '&')
    .replace(/&colon;/gi, ':')
    .replace(/&#x3a;/gi, ':')
    .replace(/&#58;/gi, ':')
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '')
    .toLowerCase();

  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('vbscript:') ||
    normalized.includes('javascript:')
  ) {
    return '#blocked-unsafe-link';
  }

  // Permitted scheme allowlist
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('#') ||
    lower.startsWith('/') ||
    lower.startsWith('./')
  ) {
    return trimmed;
  }

  return '#blocked-unsafe-link';
}

/**
 * Parses markdown into safe HTML string with guaranteed XSS protection.
 */
export function renderSafeMarkdown(markdownText: string): string {
  if (!markdownText) return '';

  // 1. First escape all raw HTML characters
  let safe = escapeHtml(markdownText);

  // 2. Fenced code blocks
  safe = safe.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="p-3 my-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800"><code>${code.trim()}</code></pre>`;
  });

  // 3. Inline code
  safe = safe.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] text-brand-600 dark:text-brand-400">${code}</code>`;
  });

  // 4. Headers
  safe = safe.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mt-4 mb-1 text-slate-900 dark:text-white">$1</h3>');
  safe = safe.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-5 mb-2 text-brand-600 dark:text-brand-400 pb-1 border-b border-slate-200 dark:border-slate-800">$1</h2>');
  safe = safe.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold mt-6 mb-3 text-slate-900 dark:text-white">$1</h1>');

  // 5. Bold and Italic
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 6. Safe Markdown Links: [label](url)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, rawUrl) => {
    const cleanUrl = sanitizeUrl(rawUrl);
    return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="text-brand-600 dark:text-brand-400 font-medium hover:underline">${label}</a>`;
  });

  // 7. Unordered list items
  safe = safe.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 dark:text-slate-300">$1</li>');

  // 8. Line breaks
  safe = safe.replace(/\n\n/g, '<div class="h-2"></div>');

  return safe;
}
