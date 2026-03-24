import { h, render } from '../utils/dom';
import { createAIBubble, createUserBubble } from '../components/ai-bubble';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIModel {
  id: string;
  label: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev/api/v1';

const MODELS: AIModel[] = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B' },
  { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1' },
  { id: '@cf/mistral/mistral-small-3.1-24b-instruct', label: 'Mistral Small' },
  { id: '@cf/qwen/qwen2.5-coder-32b-instruct', label: 'Qwen 2.5' },
  { id: '@cf/google/gemma-7b-it-lora', label: 'Gemma 7B' },
];

const QUICK_PROMPTS = [
  { emoji: '\u270D\uFE0F', label: 'Summarize', prompt: 'Summarize this topic for me: ' },
  { emoji: '\uD83C\uDF0D', label: 'Translate to Twi', prompt: 'Translate the following to Twi: ' },
  { emoji: '\uD83D\uDCE7', label: 'Draft a letter', prompt: 'Draft a professional email about: ' },
  { emoji: '\uD83D\uDCA1', label: 'Explain simply', prompt: 'Explain this simply: ' },
  { emoji: '\u2696\uFE0F', label: 'Compare options', prompt: 'Compare these options: ' },
  { emoji: '\uD83D\uDCCB', label: 'Key facts', prompt: 'List the key facts about: ' },
];

const STORAGE_KEY_HISTORY = 'os_mobile_ai_history';
const STORAGE_KEY_MODEL = 'os_mobile_ai_model';
const MAX_STORED_MESSAGES = 50;

// ── State ────────────────────────────────────────────────────────────────────

let messages: ChatMessage[] = [];
let selectedModel: string = MODELS[0].id;
let isStreaming = false;

// ── Persistence ──────────────────────────────────────────────────────────────

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveHistory(): void {
  try {
    const toSave = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

function loadModel(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MODEL);
    if (saved && MODELS.some(m => m.id === saved)) return saved;
  } catch { /* ignore */ }
  return MODELS[0].id;
}

function saveModel(): void {
  try { localStorage.setItem(STORAGE_KEY_MODEL, selectedModel); } catch { /* ignore */ }
}

// ── Streaming API ────────────────────────────────────────────────────────────

async function streamChat(
  message: string,
  conversationHistory: ChatMessage[],
  onChunk: (fullText: string) => void,
): Promise<string> {
  const token = localStorage.getItem('os_mobile_token');
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      model: selectedModel,
      conversation_history: conversationHistory.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`AI ${res.status}: ${errText}`);
  }

  if (res.headers.get('content-type')?.includes('text/event-stream') || res.headers.get('content-type')?.includes('text/plain')) {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let full = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        onChunk(full);
      }
    }
    return full;
  } else {
    const data = await res.json();
    const content = data.content || data.response || JSON.stringify(data);
    onChunk(content);
    return content;
  }
}

// ── Inject global keyframe styles ────────────────────────────────────────────

function injectStyles(): void {
  if (document.getElementById('ai-chat-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-chat-styles';
  style.textContent = `
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
    .typing-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #7a7060;
      margin: 0 2px;
      animation: bounce 1.2s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .typing-dot:nth-child(3) { animation-delay: 0.3s; }
    .quick-prompt-pill:active {
      transform: scale(0.95) !important;
    }
    .ai-input-area textarea:focus {
      outline: none;
      border-color: #D4A017 !important;
    }
    .ai-action-btn:active {
      background: rgba(212,160,23,0.12) !important;
    }
    .ai-model-select:focus {
      outline: none;
      border-color: #D4A017 !important;
    }
  `;
  document.head.appendChild(style);
}

// ── Main render ──────────────────────────────────────────────────────────────

export function renderAIChat(container: HTMLElement): void {
  injectStyles();

  // Load persisted state
  messages = loadHistory();
  selectedModel = loadModel();

  // DOM references we'll need
  let messagesContainer: HTMLElement;
  let inputTextarea: HTMLTextAreaElement;
  let quickPromptsBar: HTMLElement;
  let typingIndicator: HTMLElement | null = null;
  let currentStreamBubble: HTMLElement | null = null;

  // ── Header ───────────────────────────────────────────────────────────────

  const modelSelect = h('select', {
    className: 'ai-model-select',
    onChange: (e: Event) => {
      selectedModel = (e.target as HTMLSelectElement).value;
      saveModel();
    },
    style: {
      background: 'var(--color-surface, #141414)',
      color: 'var(--color-text, #e0e0e0)',
      border: '1px solid var(--color-border, #1e1e1e)',
      borderRadius: '8px',
      padding: '4px 8px',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(13px, 3.4vw, 14px)',
      maxWidth: '140px',
      minHeight: '32px',
      cursor: 'pointer',
    },
  }) as HTMLSelectElement;

  for (const model of MODELS) {
    const opt = h('option', { value: model.id }, model.label) as HTMLOptionElement;
    if (model.id === selectedModel) opt.selected = true;
    modelSelect.appendChild(opt);
  }

  const header = h('header', {
    style: {
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      paddingTop: 'env(safe-area-inset-top)',
      background: 'var(--color-surface, #141414)',
      borderBottom: '1px solid var(--color-border, #1e1e1e)',
      boxSizing: 'border-box',
      gap: '8px',
      flexShrink: '0',
    },
  },
    h('span', { style: { fontSize: '20px', lineHeight: '1' } }, '\u2728'),
    h('span', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(16px, 4.2vw, 18px)',
        fontWeight: '700',
        flex: '1',
      },
    }, 'AskOzzy'),
    modelSelect,
  );

  // ── Quick Prompts ────────────────────────────────────────────────────────

  quickPromptsBar = h('div', {
    className: 'quick-prompts-bar',
    style: {
      display: messages.length > 0 ? 'none' : 'flex',
      gap: '8px',
      padding: '12px 16px',
      overflowX: 'auto',
      overflowY: 'hidden',
      flexShrink: '0',
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    },
  });

  // Hide scrollbar for webkit
  (quickPromptsBar as any).style.msOverflowStyle = 'none';

  for (const qp of QUICK_PROMPTS) {
    const pill = h('button', {
      className: 'quick-prompt-pill',
      onClick: () => {
        inputTextarea.value = qp.prompt;
        inputTextarea.focus();
        autoResize();
        // Don't auto-send - let user complete the prompt
      },
      style: {
        background: 'var(--color-surface, #141414)',
        border: '1px solid var(--color-border, #1e1e1e)',
        borderRadius: '20px',
        padding: '8px 14px',
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        color: 'var(--color-text, #e0e0e0)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: '0',
        transition: 'transform 0.1s ease',
        minHeight: '36px',
      },
    }, `${qp.emoji} ${qp.label}`);

    quickPromptsBar.appendChild(pill);
  }

  // ── Messages Area ────────────────────────────────────────────────────────

  messagesContainer = h('div', {
    className: 'ai-messages',
    style: {
      flex: '1',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      scrollBehavior: 'smooth',
    },
  });

  // Render existing messages
  if (messages.length === 0) {
    const emptyState = h('div', {
      className: 'ai-empty-state',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '1',
        gap: '12px',
        opacity: '0.5',
        padding: '40px 20px',
        textAlign: 'center',
      },
    },
      h('div', { style: { fontSize: '48px' } }, '\u2728'),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 4vw, 17px)',
          fontWeight: '600',
          color: 'var(--color-text, #e0e0e0)',
        },
      }, 'Ask me anything'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(13px, 3.4vw, 14px)',
          color: 'var(--color-text-secondary, #7a7060)',
          maxWidth: '260px',
        },
      }, 'Get help with summarizing, translating, writing, and more.'),
    );
    messagesContainer.appendChild(emptyState);
  } else {
    for (const msg of messages) {
      if (msg.role === 'user') {
        messagesContainer.appendChild(createUserBubble(msg.content));
      } else {
        messagesContainer.appendChild(createAIBubble(msg.content));
      }
    }
  }

  // ── Input Area ───────────────────────────────────────────────────────────

  inputTextarea = h('textarea', {
    placeholder: 'Ask Ozzy anything...',
    rows: '1',
    style: {
      flex: '1',
      background: 'var(--color-surface, #141414)',
      border: '1px solid var(--color-border, #1e1e1e)',
      borderRadius: '20px',
      padding: '10px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(15px, 3.8vw, 16px)',
      color: 'var(--color-text, #e0e0e0)',
      resize: 'none',
      maxHeight: '120px',
      lineHeight: '1.4',
    },
  }) as HTMLTextAreaElement;

  const sendBtn = h('button', {
    className: 'ai-send-btn',
    onClick: () => handleSend(),
    style: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #D4A017, #006B3F)',
      border: 'none',
      color: '#fff',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      transition: 'opacity 0.15s ease',
    },
  }, '\u2191');

  const inputBar = h('div', {
    className: 'ai-input-area',
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      padding: '8px 12px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      background: 'var(--color-surface, #141414)',
      borderTop: '1px solid var(--color-border, #1e1e1e)',
      flexShrink: '0',
    },
  }, inputTextarea, sendBtn);

  // ── Auto-resize textarea ─────────────────────────────────────────────────

  function autoResize(): void {
    inputTextarea.style.height = 'auto';
    inputTextarea.style.height = Math.min(inputTextarea.scrollHeight, 120) + 'px';
  }

  inputTextarea.addEventListener('input', autoResize);

  // Enter to send (shift+enter for newline)
  inputTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ── Scroll to bottom ─────────────────────────────────────────────────────

  function scrollToBottom(): void {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  // ── Typing indicator ─────────────────────────────────────────────────────

  function showTypingIndicator(): void {
    typingIndicator = h('div', {
      className: 'typing-indicator',
      style: {
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: '4px',
        padding: '12px 16px',
        background: 'var(--color-surface, #141414)',
        borderRadius: '16px 16px 16px 4px',
        marginBottom: '12px',
      },
    },
      h('span', { className: 'typing-dot' }),
      h('span', { className: 'typing-dot' }),
      h('span', { className: 'typing-dot' }),
    );
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom();
  }

  function removeTypingIndicator(): void {
    if (typingIndicator && typingIndicator.parentNode) {
      typingIndicator.remove();
      typingIndicator = null;
    }
  }

  // ── Clear empty state ────────────────────────────────────────────────────

  function clearEmptyState(): void {
    const empty = messagesContainer.querySelector('.ai-empty-state');
    if (empty) empty.remove();
    quickPromptsBar.style.display = 'none';
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async function handleSend(): Promise<void> {
    const text = inputTextarea.value.trim();
    if (!text || isStreaming) return;

    isStreaming = true;
    sendBtn.style.opacity = '0.5';

    // Clear empty state on first message
    clearEmptyState();

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: text };
    messages.push(userMsg);
    messagesContainer.appendChild(createUserBubble(text));
    scrollToBottom();

    // Clear input
    inputTextarea.value = '';
    autoResize();

    // Show typing
    showTypingIndicator();

    try {
      // Build conversation history for context (last 20 messages max)
      const historyForAPI = messages.slice(-20);

      // Stream response
      let streamedContent = '';
      currentStreamBubble = null;

      const fullResponse = await streamChat(
        text,
        historyForAPI.slice(0, -1), // exclude the current message since it's sent as `message`
        (fullText: string) => {
          streamedContent = fullText;

          // Remove typing indicator on first chunk
          removeTypingIndicator();

          // Update or create the streaming bubble
          if (currentStreamBubble && currentStreamBubble.parentNode) {
            currentStreamBubble.remove();
          }
          currentStreamBubble = createAIBubble(fullText, true);
          messagesContainer.appendChild(currentStreamBubble);
          scrollToBottom();
        },
      );

      // Replace streaming bubble with final version
      const streamEl = currentStreamBubble as HTMLElement | null;
      if (streamEl && streamEl.parentNode) {
        streamEl.remove();
      }
      removeTypingIndicator();

      const finalContent = fullResponse || streamedContent || 'No response received.';
      const assistantMsg: ChatMessage = { role: 'assistant', content: finalContent };
      messages.push(assistantMsg);
      saveHistory();

      messagesContainer.appendChild(createAIBubble(finalContent, false));
      scrollToBottom();
    } catch (err: any) {
      removeTypingIndicator();
      const errStreamEl = currentStreamBubble as HTMLElement | null;
      if (errStreamEl && errStreamEl.parentNode) {
        errStreamEl.remove();
      }

      const errorContent = `Sorry, something went wrong: ${err.message || 'Unknown error'}. Please try again.`;
      const errorBubble = createAIBubble(errorContent, false);
      messagesContainer.appendChild(errorBubble);
      scrollToBottom();
    } finally {
      isStreaming = false;
      sendBtn.style.opacity = '1';
      currentStreamBubble = null;
    }
  }

  // ── Main layout ──────────────────────────────────────────────────────────

  const page = h('div', {
    className: 'ai-chat-page',
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      paddingBottom: '56px', // space for nav bar
    },
  }, header, quickPromptsBar, messagesContainer, inputBar);

  render(container, page);

  // Scroll to bottom if we have messages
  if (messages.length > 0) {
    scrollToBottom();
  }

  // Focus input
  inputTextarea.focus();
}
