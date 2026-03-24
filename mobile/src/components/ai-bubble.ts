import { h } from '../utils/dom';

/**
 * Basic markdown-like parser for AI responses.
 * Handles: **bold**, `code`, bullet points (- item), code blocks (```), newlines.
 */
function parseMarkdown(text: string): string {
  let html = text;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```)
  html = html.replace(/```(?:\w*)\n?([\s\S]*?)```/g, (_m, code) => {
    return `<pre style="background:#141414;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5;margin:8px 0"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#141414;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Bullet points: lines starting with "- "
  // Gather consecutive bullet lines into <ul>
  html = html.replace(/(^|\n)(- .+(?:\n- .+)*)/g, (_m, prefix, block) => {
    const items = block.split('\n').map((line: string) => {
      const content = line.replace(/^- /, '');
      return `<li style="margin:2px 0">${content}</li>`;
    }).join('');
    return `${prefix}<ul style="padding-left:20px;margin:6px 0">${items}</ul>`;
  });

  // Newlines to <br> (but not inside <pre> or <ul>)
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Creates an AI response bubble with copy/share actions.
 */
export function createAIBubble(content: string, isStreaming?: boolean): HTMLElement {
  const parsed = parseMarkdown(content);

  const bubble = h('div', {
    className: 'ai-bubble',
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'flex-start',
      maxWidth: '85%',
      marginBottom: '12px',
    },
  });

  const body = h('div', {
    className: 'ai-bubble-body',
    innerHTML: parsed + (isStreaming ? '<span class="ai-cursor" style="display:inline-block;width:6px;height:16px;background:#D4A017;margin-left:2px;animation:blink 0.8s step-end infinite;vertical-align:text-bottom"></span>' : ''),
    style: {
      background: 'var(--color-surface, #141414)',
      borderRadius: '16px 16px 16px 4px',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(15px, 3.8vw, 16px)',
      lineHeight: '1.55',
      color: 'var(--color-text, #e0e0e0)',
      wordBreak: 'break-word',
    },
  });

  bubble.appendChild(body);

  // Only show action buttons when not streaming
  if (!isStreaming) {
    const actions = h('div', {
      className: 'ai-bubble-actions',
      style: {
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
        paddingLeft: '4px',
        opacity: '0.6',
      },
    });

    // Copy button
    const copyBtn = h('button', {
      className: 'ai-action-btn',
      onClick: () => {
        navigator.clipboard.writeText(content).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = '\uD83D\uDCCB Copy'; }, 1500);
        }).catch(() => {
          // Fallback
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = '\uD83D\uDCCB Copy'; }, 1500);
        });
      },
      style: {
        background: 'none',
        border: 'none',
        color: 'var(--color-text-secondary, #7a7060)',
        fontSize: '13px',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '6px',
        minHeight: '28px',
      },
    }, '\uD83D\uDCCB Copy');

    // Share button
    const shareBtn = h('button', {
      className: 'ai-action-btn',
      onClick: () => {
        if (navigator.share) {
          navigator.share({ text: content }).catch(() => {});
        }
      },
      style: {
        background: 'none',
        border: 'none',
        color: 'var(--color-text-secondary, #7a7060)',
        fontSize: '13px',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '6px',
        minHeight: '28px',
      },
    }, '\uD83D\uDD17 Share');

    actions.appendChild(copyBtn);
    actions.appendChild(shareBtn);
    bubble.appendChild(actions);
  }

  return bubble;
}

/**
 * Creates a user message bubble (right-aligned, gold/green gradient).
 */
export function createUserBubble(content: string): HTMLElement {
  const time = new Date();
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubble = h('div', {
    className: 'user-bubble',
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      alignSelf: 'flex-end',
      maxWidth: '80%',
      marginBottom: '12px',
    },
  },
    h('div', {
      style: {
        background: 'linear-gradient(135deg, #D4A017, #006B3F)',
        borderRadius: '16px 16px 4px 16px',
        padding: '10px 14px',
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(15px, 3.8vw, 16px)',
        lineHeight: '1.5',
        color: '#fff',
        wordBreak: 'break-word',
      },
    }, content),
    h('span', {
      style: {
        fontSize: '10px',
        color: 'var(--color-text-secondary, #7a7060)',
        marginTop: '2px',
        paddingRight: '4px',
      },
    }, timeStr),
  );

  return bubble;
}
