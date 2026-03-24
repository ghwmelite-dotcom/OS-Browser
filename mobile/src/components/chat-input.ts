import { h } from '../utils/dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChatInputOptions {
  onSend: (text: string) => void;
  onSendFile: (file: File) => void;
  onSendVoice: (blob: Blob, duration: number, waveform: number[]) => void;
  onSendSticker?: (packId: string, stickerId: string, altText: string) => void;
  onTyping: () => void;
  roomId: string;
}

export interface ChatInputElement extends HTMLElement {
  setReply: (sender: string, body: string, eventId: string) => void;
  clearReply: () => void;
  getReplyEventId: () => string | null;
}

/* ------------------------------------------------------------------ */
/*  Emoji data                                                         */
/* ------------------------------------------------------------------ */

const EMOJI_DATA: Record<string, string[]> = {
  '\u{1F600}': ['\u{1F600}','\u{1F603}','\u{1F604}','\u{1F601}','\u{1F606}','\u{1F605}','\u{1F923}','\u{1F602}','\u{1F642}','\u{1F60A}','\u{1F607}','\u{1F970}','\u{1F60D}','\u{1F929}','\u{1F618}','\u{1F60B}','\u{1F61B}','\u{1F61C}','\u{1F914}','\u{1F92B}','\u{1F92D}','\u{1F60F}','\u{1F60C}','\u{1F614}','\u{1F622}','\u{1F62D}','\u{1F624}','\u{1F92C}','\u{1F608}','\u{1F480}','\u{1F631}','\u{1F976}','\u{1F92E}','\u{1F927}','\u{1F637}','\u{1F913}','\u{1F60E}','\u{1F973}','\u{1F62C}','\u{1F644}','\u{1F634}'],
  '\u{1F436}': ['\u{1F436}','\u{1F431}','\u{1F42D}','\u{1F439}','\u{1F430}','\u{1F98A}','\u{1F43B}','\u{1F43C}','\u{1F428}','\u{1F42F}','\u{1F981}','\u{1F42E}','\u{1F437}','\u{1F438}','\u{1F435}','\u{1F414}','\u{1F427}','\u{1F426}','\u{1F985}','\u{1F41D}','\u{1F41B}','\u{1F98B}','\u{1F422}','\u{1F40D}','\u{1F98E}','\u{1F420}','\u{1F419}','\u{1F980}','\u{1F99E}','\u{1F40A}'],
  '\u{1F355}': ['\u{1F355}','\u{1F354}','\u{1F35F}','\u{1F32D}','\u{1F37F}','\u{1F9C2}','\u{1F357}','\u{1F356}','\u{1F969}','\u{1F32E}','\u{1F32F}','\u{1F957}','\u{1F35C}','\u{1F35D}','\u{1F363}','\u{1F371}','\u{1F369}','\u{1F36A}','\u{1F382}','\u{1F370}','\u{1F36B}','\u{1F36C}','\u{1F36D}','\u2615','\u{1F375}','\u{1F9C3}','\u{1F37A}','\u{1F377}','\u{1F964}','\u{1F9CB}'],
  '\u26BD': ['\u26BD','\u{1F3C0}','\u{1F3C8}','\u26BE','\u{1F94E}','\u{1F3BE}','\u{1F3D0}','\u{1F3C9}','\u{1F3B1}','\u{1F3D3}','\u{1F3F8}','\u{1F94A}','\u{1F3CB}\uFE0F','\u{1F938}','\u26F7\uFE0F','\u{1F3C4}','\u{1F6B4}','\u{1F3C6}','\u{1F947}','\u{1F948}','\u{1F949}','\u{1F3AF}','\u{1F3AE}','\u{1F3B2}','\u{1F3AD}','\u{1F3A8}','\u{1F3A4}','\u{1F3AC}','\u{1F4F8}','\u{1F3A7}'],
  '\u{1F30D}': ['\u{1F30D}','\u{1F30E}','\u{1F30F}','\u{1F5FA}\uFE0F','\u{1F3D4}\uFE0F','\u26F0\uFE0F','\u{1F30B}','\u{1F3D5}\uFE0F','\u{1F3D6}\uFE0F','\u{1F3DC}\uFE0F','\u{1F3DF}\uFE0F','\u{1F3DB}\uFE0F','\u26EA','\u{1F54C}','\u{1F54D}','\u{1F3E0}','\u{1F3E2}','\u{1F3E8}','\u{1F3EB}','\u{1F3E5}','\u{1F697}','\u{1F695}','\u{1F68C}','\u{1F68E}','\u2708\uFE0F','\u{1F680}','\u{1F6F8}','\u26F5','\u{1F682}','\u{1F5FD}'],
  '\u{1F4A1}': ['\u{1F4A1}','\u{1F526}','\u{1F56F}\uFE0F','\u{1F4B0}','\u{1F4B3}','\u{1F48E}','\u2696\uFE0F','\u{1F527}','\u{1F528}','\u2699\uFE0F','\u{1F52C}','\u{1F52D}','\u{1F4F1}','\u{1F4BB}','\u2328\uFE0F','\u{1F5A5}\uFE0F','\u{1F5A8}\uFE0F','\u{1F4F7}','\u{1F4F9}','\u{1F4FA}','\u{1F4FB}','\u23F0','\u{1F4E1}','\u{1F50B}','\u{1F48A}','\u{1FA7A}','\u{1F9EC}','\u{1F6E1}\uFE0F','\u{1F4E6}','\u{1F4EB}'],
  '\u2764\uFE0F': ['\u2764\uFE0F','\u{1F9E1}','\u{1F49B}','\u{1F49A}','\u{1F499}','\u{1F49C}','\u{1F5A4}','\u{1F90D}','\u{1F494}','\u2763\uFE0F','\u{1F495}','\u{1F49E}','\u{1F493}','\u{1F497}','\u{1F496}','\u{1F498}','\u{1F49D}','\u{1F49F}','\u262E\uFE0F','\u271D\uFE0F','\u262A\uFE0F','\u{1F549}\uFE0F','\u262F\uFE0F','\u2721\uFE0F','\u267B\uFE0F','\u26A0\uFE0F','\u274C','\u2705','\u2753','\u{1F4AF}'],
  '\u{1F3C1}': ['\u{1F3C1}','\u{1F1EC}\u{1F1ED}','\u{1F1F3}\u{1F1EC}','\u{1F1FF}\u{1F1E6}','\u{1F1F0}\u{1F1EA}','\u{1F1EA}\u{1F1F9}','\u{1F1F9}\u{1F1FF}','\u{1F1FA}\u{1F1EC}','\u{1F1E8}\u{1F1EE}','\u{1F1F8}\u{1F1F3}','\u{1F1E8}\u{1F1F2}','\u{1F1F2}\u{1F1F1}','\u{1F1E7}\u{1F1EB}','\u{1F1EC}\u{1F1E7}','\u{1F1FA}\u{1F1F8}','\u{1F1E8}\u{1F1E6}','\u{1F1EB}\u{1F1F7}','\u{1F1E9}\u{1F1EA}','\u{1F1E8}\u{1F1F3}','\u{1F1EF}\u{1F1F5}','\u{1F1EE}\u{1F1F3}','\u{1F1E7}\u{1F1F7}','\u{1F1E6}\u{1F1FA}','\u{1F3F3}\uFE0F','\u{1F3F4}','\u{1F6A9}','\u{1F38C}','\u{1F3F3}\uFE0F\u200D\u{1F308}','\u{1F1EA}\u{1F1FA}','\u{1F1FA}\u{1F1F3}'],
};

const EMOJI_CATEGORY_ICONS: string[] = ['\u{1F600}', '\u{1F436}', '\u{1F355}', '\u26BD', '\u{1F30D}', '\u{1F4A1}', '\u2764\uFE0F', '\u{1F3C1}'];
const EMOJI_CATEGORY_LABELS: string[] = ['Smileys', 'Animals', 'Food', 'Activities', 'Travel', 'Objects', 'Symbols', 'Flags'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/*',
  'video/*',
  'application/zip',
  'application/x-zip-compressed',
].join(',');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Inject keyframe animations (once)                                  */
/* ------------------------------------------------------------------ */

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ci-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Main factory                                                       */
/* ------------------------------------------------------------------ */

export function createChatInput(options: ChatInputOptions): ChatInputElement {
  const { onSend, onSendFile, onSendVoice, onTyping } = options;
  injectStyles();

  /* ---------- state ---------- */
  let replyEventId: string | null = null;
  let attachedFile: File | null = null;
  let isRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let recordingStartTime = 0;
  let recordingTimer: ReturnType<typeof setInterval> | null = null;
  let waveformSamples: number[] = [];
  let waveformRaf: number | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastTypingSent = 0;

  /* ================================================================ */
  /*  Reply preview bar                                                */
  /* ================================================================ */

  const replySender = h('span', {
    style: {
      fontWeight: '700',
      fontSize: '12px',
      color: '#D4A017',
      marginBottom: '2px',
    },
  });

  const replyBody = h('span', {
    style: {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.6)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  });

  const replyDismiss = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.5)',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '4px 8px',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    },
  }, '\u2715');

  const replyBar = h('div', {
    style: {
      display: 'none',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.05)',
      borderLeft: '3px solid #D4A017',
      borderRadius: '4px',
      margin: '0 12px',
      marginTop: '8px',
    },
  },
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        overflow: 'hidden',
      },
    }, replySender, replyBody),
    replyDismiss,
  );

  function showReplyBar() { replyBar.style.display = 'flex'; }
  function hideReplyBar() { replyBar.style.display = 'none'; }

  replyDismiss.addEventListener('click', () => {
    replyEventId = null;
    hideReplyBar();
  });

  /* ================================================================ */
  /*  File attachment preview                                          */
  /* ================================================================ */

  const fileInput = h('input', {
    type: 'file',
    accept: ACCEPTED_TYPES,
    style: { display: 'none' },
  }) as HTMLInputElement;

  const filePreviewName = h('span', {
    style: {
      fontSize: '12px',
      color: '#fff',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1',
    },
  });

  const filePreviewSize = h('span', {
    style: {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.5)',
      flexShrink: '0',
    },
  });

  const fileRemoveBtn = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.5)',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px 8px',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    },
  }, '\u2715');

  const filePreviewBar = h('div', {
    style: {
      display: 'none',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '8px',
      margin: '0 12px',
      marginTop: '4px',
    },
  },
    h('span', { style: { fontSize: '18px', flexShrink: '0' } }, '\uD83D\uDCCE'),
    filePreviewName,
    filePreviewSize,
    fileRemoveBtn,
  );

  function showFilePreview(file: File) {
    attachedFile = file;
    filePreviewName.textContent = file.name;
    filePreviewSize.textContent = formatBytes(file.size);
    filePreviewBar.style.display = 'flex';
    updateActionButton();
  }

  function clearFilePreview() {
    attachedFile = null;
    fileInput.value = '';
    filePreviewBar.style.display = 'none';
    updateActionButton();
  }

  fileRemoveBtn.addEventListener('click', clearFilePreview);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) showFilePreview(file);
  });

  /* ================================================================ */
  /*  Recording UI                                                     */
  /* ================================================================ */

  const recDot = h('span', {
    style: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: '#ff3b3b',
      animation: 'ci-pulse 1s ease-in-out infinite',
      flexShrink: '0',
    },
  });

  const recTimer = h('span', {
    style: {
      fontSize: '14px',
      color: '#ff3b3b',
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'var(--font-body)',
    },
  }, '0:00');

  const recCancel = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '4px 8px',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }, '\u2715');

  const recSend = h('button', {
    style: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #D4A017, #B8860B)',
      color: '#fff',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    },
  }, '\u2191');

  const recordingBar = h('div', {
    style: {
      display: 'none',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      position: 'fixed',
      bottom: '56px',
      left: '0',
      right: '0',
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      zIndex: '52',
    },
  }, recDot, recTimer, h('div', { style: { flex: '1' } }), recCancel, recSend);

  /* Voice recording logic */

  function collectWaveform() {
    if (!analyserNode || !isRecording) return;
    const data = new Uint8Array(analyserNode.fftSize);
    analyserNode.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    waveformSamples.push(Math.min(1, rms * 3));
    waveformRaf = requestAnimationFrame(collectWaveform);
  }

  async function startRecording() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return; // Permission denied — silently abort
    }

    isRecording = true;
    waveformSamples = [];
    recordingStartTime = Date.now();

    // Audio analysis
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    source.connect(analyserNode);
    collectWaveform();

    // MediaRecorder
    const chunks: BlobPart[] = [];
    mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const duration = (Date.now() - recordingStartTime) / 1000;
      const blob = new Blob(chunks, { type: 'audio/webm' });

      // Downsample waveform to ~64 points
      const target = 64;
      const step = Math.max(1, Math.floor(waveformSamples.length / target));
      const waveform: number[] = [];
      for (let i = 0; i < waveformSamples.length; i += step) {
        waveform.push(Math.round(waveformSamples[i] * 1024));
        if (waveform.length >= target) break;
      }

      onSendVoice(blob, Math.round(duration), waveform);
    };
    mediaRecorder.start();

    // Timer display
    recTimer.textContent = '0:00';
    recordingTimer = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      recTimer.textContent = formatTime(elapsed);
    }, 250);

    // Show recording UI, hide main bar
    recordingBar.style.display = 'flex';
    mainBar.style.display = 'none';
  }

  function stopRecording(sendResult: boolean) {
    isRecording = false;

    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
    if (waveformRaf) { cancelAnimationFrame(waveformRaf); waveformRaf = null; }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      if (sendResult) {
        mediaRecorder.stop(); // triggers onstop → onSendVoice
      } else {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
    }

    if (audioStream) { audioStream.getTracks().forEach((t) => t.stop()); audioStream = null; }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    analyserNode = null;
    mediaRecorder = null;

    recordingBar.style.display = 'none';
    mainBar.style.display = 'flex';
  }

  recCancel.addEventListener('click', () => stopRecording(false));
  recSend.addEventListener('click', () => stopRecording(true));

  /* ================================================================ */
  /*  Textarea                                                         */
  /* ================================================================ */

  const textarea = h('textarea', {
    className: 'chat-input-textarea',
    placeholder: 'Type a message\u2026',
    rows: '1',
  }) as HTMLTextAreaElement;

  function autoGrow() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  /* ================================================================ */
  /*  Typing indicator (debounced, 4s cooldown)                        */
  /* ================================================================ */

  function fireTyping() {
    const now = Date.now();
    if (now - lastTypingSent < 4000) return;
    lastTypingSent = now;
    onTyping();
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { /* no-op, just resets debounce window */ }, 4000);
  }

  /* ================================================================ */
  /*  Emoji picker                                                     */
  /* ================================================================ */

  let emojiPickerOpen = false;
  let activeCategory = EMOJI_CATEGORY_ICONS[0];

  // Search bar
  const emojiSearch = h('input', {
    className: 'emoji-picker-search',
    type: 'text',
    placeholder: 'Search emoji\u2026',
  }) as HTMLInputElement;

  // Category tabs
  const emojiTabs = h('div', { className: 'emoji-picker-tabs' },
    ...EMOJI_CATEGORY_ICONS.map((icon, i) => {
      const tab = h('button', {
        className: `emoji-picker-tab${i === 0 ? ' emoji-picker-tab--active' : ''}`,
        'data-cat': icon,
        title: EMOJI_CATEGORY_LABELS[i],
      }, icon);
      tab.addEventListener('click', () => {
        activeCategory = icon;
        renderEmojiGrid();
        emojiTabs.querySelectorAll('.emoji-picker-tab').forEach(t => t.classList.remove('emoji-picker-tab--active'));
        tab.classList.add('emoji-picker-tab--active');
        emojiSearch.value = '';
      });
      return tab;
    }),
  );

  // Grid container
  const emojiGrid = h('div', { className: 'emoji-picker-grid' });

  function renderEmojiGrid(filter?: string) {
    emojiGrid.innerHTML = '';
    let emojis: string[];
    if (filter) {
      // Search across all categories
      emojis = Object.values(EMOJI_DATA).flat().filter(e => e.includes(filter));
    } else {
      emojis = EMOJI_DATA[activeCategory] || [];
    }
    for (const emoji of emojis) {
      const btn = h('button', { className: 'emoji-picker-item' }, emoji);
      btn.addEventListener('click', () => {
        insertEmoji(emoji);
      });
      emojiGrid.appendChild(btn);
    }
  }

  function insertEmoji(emoji: string) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + emoji + textarea.value.slice(end);
    const newPos = start + emoji.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  emojiSearch.addEventListener('input', () => {
    const q = emojiSearch.value.trim();
    renderEmojiGrid(q || undefined);
  });

  // Panel
  const emojiPanel = h('div', { className: 'emoji-picker' },
    emojiSearch, emojiTabs, emojiGrid,
  );

  function toggleEmojiPicker() {
    emojiPickerOpen = !emojiPickerOpen;
    if (emojiPickerOpen) {
      emojiPanel.classList.add('emoji-picker--visible');
      renderEmojiGrid();
      emojiSearch.value = '';
    } else {
      emojiPanel.classList.remove('emoji-picker--visible');
    }
  }

  function closeEmojiPicker() {
    if (!emojiPickerOpen) return;
    emojiPickerOpen = false;
    emojiPanel.classList.remove('emoji-picker--visible');
  }

  // Emoji button (inside capsule)
  const emojiBtn = h('button', {
    className: 'chat-input-emoji',
  }, '\u{1F60A}');

  emojiBtn.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    toggleEmojiPicker();
  });

  // Close picker when typing
  textarea.addEventListener('focus', () => closeEmojiPicker());

  // Close picker when tapping outside
  document.addEventListener('click', (e: Event) => {
    if (!emojiPickerOpen) return;
    const target = e.target as Node;
    if (!emojiPanel.contains(target) && target !== emojiBtn && !emojiBtn.contains(target)) {
      closeEmojiPicker();
    }
  });

  /* ================================================================ */
  /*  Camera capture                                                   */
  /* ================================================================ */

  let cameraStream: MediaStream | null = null;
  let cameraFacingMode: 'environment' | 'user' = 'environment';

  function openCamera() {
    const overlay = h('div', { className: 'camera-overlay' });

    const video = h('video', {
      className: 'camera-video',
      autoplay: true,
      playsinline: true,
    }) as HTMLVideoElement;

    const closeBtn = h('button', { className: 'camera-close-btn' }, '\u2715');
    const switchBtn = h('button', { className: 'camera-switch-btn' }, '\u{1F504}');
    const captureBtn = h('button', { className: 'camera-capture-btn' },
      h('div', { className: 'camera-capture-inner' }),
    );

    overlay.append(video, closeBtn, switchBtn, captureBtn);
    document.body.appendChild(overlay);

    async function startStream() {
      try {
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
        }
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: false,
        });
        video.srcObject = cameraStream;
      } catch {
        cleanup();
      }
    }

    function cleanup() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      overlay.remove();
    }

    closeBtn.addEventListener('click', cleanup);

    switchBtn.addEventListener('click', () => {
      cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
      startStream();
    });

    captureBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onSendFile(file);
          }
          cleanup();
        }, 'image/jpeg', 0.85);
      }
    });

    startStream();
  }

  const cameraBtn = h('button', {
    className: 'chat-input-camera',
  }, '\u{1F4F7}');

  cameraBtn.addEventListener('click', () => openCamera());

  /* ================================================================ */
  /*  Action buttons                                                   */
  /* ================================================================ */

  // Attach button (paperclip)
  const attachBtn = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '0',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      alignSelf: 'flex-end',
      marginBottom: '2px',
    },
  }, '\uD83D\uDCCE');

  attachBtn.addEventListener('click', () => fileInput.click());

  // Send button
  const sendBtn = h('button', {
    style: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #D4A017, #B8860B)',
      color: '#fff',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      alignSelf: 'flex-end',
      transition: 'transform 0.1s ease',
    },
  }, '\u2191') as HTMLButtonElement;

  // Voice button (microphone)
  const voiceBtn = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '0',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      alignSelf: 'flex-end',
      marginBottom: '2px',
    },
  }, '\uD83C\uDFA4') as HTMLButtonElement;

  voiceBtn.addEventListener('click', () => startRecording());

  // Toggle between send & voice
  function updateActionButton() {
    const hasContent = textarea.value.trim().length > 0 || attachedFile !== null;
    if (hasContent) {
      sendBtn.style.display = 'flex';
      voiceBtn.style.display = 'none';
    } else {
      sendBtn.style.display = 'none';
      voiceBtn.style.display = 'flex';
    }
  }

  // Press feedback
  sendBtn.addEventListener('pointerdown', () => { sendBtn.style.transform = 'scale(0.9)'; });
  sendBtn.addEventListener('pointerup', () => { sendBtn.style.transform = 'scale(1)'; });
  sendBtn.addEventListener('pointerleave', () => { sendBtn.style.transform = 'scale(1)'; });

  /* ================================================================ */
  /*  Send logic                                                       */
  /* ================================================================ */

  function send() {
    // If there is an attached file, send that first
    if (attachedFile) {
      onSendFile(attachedFile);
      clearFilePreview();
    }

    const text = textarea.value.trim();
    if (text) {
      onSend(text);
    }

    textarea.value = '';
    autoGrow();
    updateActionButton();
    textarea.focus();
  }

  /* ================================================================ */
  /*  Event listeners                                                  */
  /* ================================================================ */

  textarea.addEventListener('input', () => {
    autoGrow();
    updateActionButton();
    fireTyping();
  });

  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', (e: Event) => {
    e.preventDefault();
    send();
  });

  /* ================================================================ */
  /*  Assemble main bar                                                */
  /* ================================================================ */

  // MoMo button (banknote icon)
  const momoBtn = h('button', {
    style: {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '0',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      alignSelf: 'flex-end',
      marginBottom: '2px',
    },
  }, '\uD83D\uDCB0');
  momoBtn.className = 'chat-input-momo';

  // MoMo panel (slide-up)
  const momoPanel = h('div', {
    style: {
      display: 'none', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'var(--surface-1, #1a1a1a)',
    },
  });

  const MOMO_PROVIDERS: { value: string; label: string; color: string }[] = [
    { value: 'mtn-momo', label: 'MTN MoMo', color: '#FFCC00' },
    { value: 'telecel-cash', label: 'Telecel Cash', color: '#0066CC' },
    { value: 'airteltigo-money', label: 'AirtelTigo Money', color: '#E40000' },
  ];

  let momoTab: 'request' | 'record' = 'request';
  let momoProvider = 'mtn-momo';
  let momoPanelOpen = false;

  function buildMoMoPanel() {
    momoPanel.innerHTML = '';

    // Tabs
    const tabs = h('div', { style: { display: 'flex', gap: '4px', marginBottom: '12px' } });
    (['request', 'record'] as const).forEach(tab => {
      const btn = h('button', {
        style: {
          flex: '1', padding: '8px', borderRadius: '8px', border: 'none', fontSize: '11px',
          fontWeight: '700', cursor: 'pointer',
          background: momoTab === tab ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.05)',
          color: momoTab === tab ? '#D4A017' : 'rgba(255,255,255,0.5)',
        },
      }, tab === 'request' ? '\uD83D\uDCB0 Request Money' : '\uD83E\uDDFE Record Payment');
      btn.addEventListener('click', () => { momoTab = tab; buildMoMoPanel(); });
      tabs.appendChild(btn);
    });
    momoPanel.appendChild(tabs);

    // Amount
    const amtLabel = h('div', { style: { fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' } }, 'Amount');
    momoPanel.appendChild(amtLabel);
    const amtRow = h('div', { style: { display: 'flex', alignItems: 'center', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px' } });
    const prefix = h('span', { style: { padding: '10px 12px', fontSize: '13px', fontWeight: '800', color: '#D4A017', background: 'rgba(212,160,23,0.06)', borderRight: '1px solid rgba(255,255,255,0.08)' } }, 'GH\u20B5');
    const amtInput = h('input', {
      type: 'text', inputMode: 'decimal', placeholder: '0.00',
      style: { flex: '1', background: 'transparent', border: 'none', padding: '10px', fontSize: '13px', fontWeight: '600', color: '#fff', outline: 'none' },
    }) as HTMLInputElement;
    amtInput.addEventListener('input', () => {
      const v = amtInput.value;
      if (!/^\d*\.?\d{0,2}$/.test(v) && v !== '') amtInput.value = v.slice(0, -1);
    });
    amtRow.appendChild(prefix);
    amtRow.appendChild(amtInput);
    momoPanel.appendChild(amtRow);

    // Transaction ID (record tab only)
    let txnInput: HTMLInputElement | null = null;
    if (momoTab === 'record') {
      const txnLabel = h('div', { style: { fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' } }, 'Transaction ID');
      txnInput = h('input', {
        type: 'text', placeholder: 'e.g. TXN-12345678',
        style: {
          width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#fff', outline: 'none', marginBottom: '10px',
        },
      }) as HTMLInputElement;
      momoPanel.appendChild(txnLabel);
      momoPanel.appendChild(txnInput);
    }

    // Note
    const noteLabel = h('div', { style: { fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' } }, 'Note (optional)');
    const noteInput = h('input', {
      type: 'text', placeholder: momoTab === 'request' ? 'What is this for?' : 'Payment description',
      style: {
        width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#fff', outline: 'none', marginBottom: '10px',
      },
    }) as HTMLInputElement;
    momoPanel.appendChild(noteLabel);
    momoPanel.appendChild(noteInput);

    // Provider selector
    const provLabel = h('div', { style: { fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' } }, 'Provider');
    momoPanel.appendChild(provLabel);
    const provRow = h('div', { style: { display: 'flex', gap: '6px', marginBottom: '12px' } });
    MOMO_PROVIDERS.forEach(p => {
      const sel = momoProvider === p.value;
      const btn = h('button', {
        style: {
          flex: '1', padding: '8px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: '700',
          cursor: 'pointer', border: sel ? `1.5px solid ${p.color}` : '1.5px solid rgba(255,255,255,0.1)',
          background: sel ? `${p.color}20` : 'rgba(255,255,255,0.03)', color: sel ? p.color : 'rgba(255,255,255,0.5)',
        },
      }, p.label);
      btn.addEventListener('click', () => { momoProvider = p.value; buildMoMoPanel(); });
      provRow.appendChild(btn);
    });
    momoPanel.appendChild(provRow);

    // Send button
    const sendMoMoBtn = h('button', {
      style: {
        width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
        background: momoTab === 'request'
          ? 'linear-gradient(135deg, #D4A017, #B8860B)'
          : 'linear-gradient(135deg, #006B3F, #004D2C)',
        color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
      },
    }, momoTab === 'request' ? '\u2191 Send Request' : '\u2191 Send Receipt');
    sendMoMoBtn.addEventListener('click', () => {
      const amt = parseFloat(amtInput.value);
      if (!amt || amt <= 0) return;

      if (momoTab === 'request') {
        // Send via room message — custom event
        const body = `Requested GH\u20B5${amt.toFixed(2)}`;
        const msgContent = JSON.stringify({
          msgtype: 'm.momo.request', body, amount: amt, currency: 'GHS',
          note: noteInput.value.trim(), provider: momoProvider, status: 'pending',
          requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        });
        // Send as text that will be parsed — the onSend callback sends to Matrix
        onSend(msgContent);
      } else {
        const txn = txnInput?.value.trim() || `TXN-${Date.now()}`;
        const body = `Payment of GH\u20B5${amt.toFixed(2)} sent`;
        const msgContent = JSON.stringify({
          msgtype: 'm.momo.receipt', body, amount: amt, currency: 'GHS',
          provider: momoProvider, transactionId: txn, note: noteInput.value.trim(),
          timestamp: Date.now(),
        });
        onSend(msgContent);
      }

      momoPanelOpen = false;
      momoPanel.style.display = 'none';
      momoBtn.style.color = 'rgba(255,255,255,0.6)';
    });
    momoPanel.appendChild(sendMoMoBtn);
  }

  momoBtn.addEventListener('click', () => {
    momoPanelOpen = !momoPanelOpen;
    momoPanel.style.display = momoPanelOpen ? 'block' : 'none';
    momoBtn.style.color = momoPanelOpen ? '#D4A017' : 'rgba(255,255,255,0.6)';
    if (momoPanelOpen) buildMoMoPanel();
  });

  // Capsule wrapper around emoji + textarea + camera + attach + momo
  /* ================================================================ */
  /*  Sticker Picker                                                   */
  /* ================================================================ */

  interface MobileStickerEntry { id: string; label: string; face: string; bg: string; textColor: string; }
  interface MobileStickerPack { id: string; name: string; icon: string; stickers: MobileStickerEntry[]; }

  const STICKER_PACKS: MobileStickerPack[] = [
    { id: 'ghana-expressions', name: 'Expressions', icon: '\uD83D\uDDE3\uFE0F', stickers: [
      { id: 'charley', label: 'Charley!', face: '\uD83D\uDE04', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'eiii', label: 'Eiii!', face: '\uD83D\uDE32', bg: '#CE1126', textColor: '#fff' },
      { id: 'as-for-you', label: 'As for you!', face: '\uD83D\uDE24', bg: '#006B3F', textColor: '#fff' },
      { id: 'chale-relax', label: 'Chale, relax', face: '\uD83D\uDE0C', bg: '#2E86AB', textColor: '#fff' },
      { id: 'herh', label: 'Herh!', face: '\uD83D\uDE28', bg: '#CE1126', textColor: '#fff' },
      { id: 'wey-dey', label: 'Wey dey!', face: '\u270C\uFE0F', bg: '#006B3F', textColor: '#D4A017' },
      { id: 'i-beg', label: 'I beg', face: '\uD83D\uDE4F', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'yoo-i-hear', label: 'Yoo, I hear', face: '\uD83D\uDC4D', bg: '#3A506B', textColor: '#fff' },
      { id: 'no-wahala', label: 'No wahala', face: '\u2728', bg: '#006B3F', textColor: '#fff' },
      { id: 'the-thing-is', label: 'The thing is...', face: '\uD83E\uDD14', bg: '#5C2D91', textColor: '#fff' },
      { id: 'me-im-coming', label: "Me I'm coming", face: '\uD83C\uDFC3', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'abi', label: 'Abi?', face: '\uD83E\uDEE4', bg: '#CE1126', textColor: '#fff' },
      { id: 'make-i-tell-you', label: 'Make I tell you...', face: '\u261D\uFE0F', bg: '#1B4332', textColor: '#D4A017' },
      { id: 'keke', label: 'K\u025Bk\u025B!', face: '\uD83D\uDCAF', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'paper-dey', label: 'Paper dey!', face: '\uD83D\uDCB5', bg: '#006B3F', textColor: '#D4A017' },
      { id: 'wo-maame', label: 'Wo maame', face: '\uD83D\uDE0F', bg: '#8B0000', textColor: '#fff' },
      { id: 'i-shock', label: 'I shock!', face: '\u26A1', bg: '#CE1126', textColor: '#fff' },
      { id: 'heavy', label: 'Heavy!', face: '\uD83D\uDCAA', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'die-be-die', label: 'Die be die', face: '\uD83D\uDD25', bg: '#CE1126', textColor: '#fff' },
      { id: 'tweaaa', label: 'Tweaaa!', face: '\uD83D\uDE44', bg: '#4A154B', textColor: '#fff' },
    ]},
    { id: 'adinkra-vibes', name: 'Adinkra', icon: '\u2726', stickers: [
      { id: 'gye-nyame', label: 'Gye Nyame', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'sankofa', label: 'Sankofa', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'dwennimmen', label: 'Dwennimmen', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'aya', label: 'Aya', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'akoma', label: 'Akoma', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'nkyinkyim', label: 'Nkyinkyim', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'fawohodie', label: 'Fawohodie', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'ese-ne-tekrema', label: 'Ese Ne Tekrema', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'mate-masie', label: 'Mate Masie', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'bese-saka', label: 'Bese Saka', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'denkyem', label: 'Denkyem', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'woforo-dua-pa-a', label: 'Woforo Dua Pa A', face: '', bg: '#1A1A2E', textColor: '#D4A017' },
    ]},
    { id: 'ghana-life', name: 'Ghana Life', icon: '\uD83C\uDDEC\uD83C\uDDED', stickers: [
      { id: 'jollof-rice', label: 'Jollof Rice', face: '\uD83C\uDF5B', bg: '#FFF3E0', textColor: '#CE1126' },
      { id: 'trotro', label: 'Trotro', face: '\uD83D\uDE8C', bg: '#E3F2FD', textColor: '#1565C0' },
      { id: 'star-beer', label: 'Star Beer', face: '\uD83C\uDF7A', bg: '#FFFDE7', textColor: '#2E7D32' },
      { id: 'fufu', label: 'Fufu', face: '\uD83C\uDF5C', bg: '#FFF8E1', textColor: '#5D4037' },
      { id: 'waakye', label: 'Waakye', face: '\uD83C\uDF5B', bg: '#F3E5F5', textColor: '#CE1126' },
      { id: 'black-stars-jersey', label: 'Black Stars', face: '\u26BD', bg: '#FFFDE7', textColor: '#1A1A2E' },
      { id: 'cedi-notes', label: 'GH\u20B5 Notes', face: '\uD83D\uDCB5', bg: '#E8F5E9', textColor: '#006B3F' },
      { id: 'kente-pattern', label: 'Kente', face: '\uD83E\uDDE3', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'akwaaba', label: 'Akwaaba', face: '\uD83D\uDC4B', bg: '#006B3F', textColor: '#D4A017' },
      { id: 'highlife-guitar', label: 'Highlife Vibes', face: '\uD83C\uDFB8', bg: '#D4A017', textColor: '#1A1A2E' },
      { id: 'cedi-loading', label: 'GH\u20B5 Loading...', face: '\uD83D\uDCB8', bg: '#FFF3E0', textColor: '#CE1126' },
      { id: 'chop-bar-open', label: 'Chop Bar OPEN', face: '\uD83C\uDF7D\uFE0F', bg: '#4E342E', textColor: '#D4A017' },
      { id: 'black-stars', label: 'Black Stars', face: '\u2B50', bg: '#1A1A2E', textColor: '#D4A017' },
      { id: 'dumsor-candle', label: 'Dumsor', face: '\uD83D\uDD6F\uFE0F', bg: '#263238', textColor: '#FFD54F' },
      { id: 'friday-wear', label: 'Friday Wear', face: '\uD83D\uDC54', bg: '#D4A017', textColor: '#1A1A2E' },
    ]},
  ];

  let stickerPickerOpen = false;
  let activeStickerPack = STICKER_PACKS[0];

  const stickerPanel = h('div', {
    style: {
      display: 'none',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'var(--surface-1, #1a1a1a)',
      maxHeight: '260px',
      overflow: 'hidden',
      flexDirection: 'column',
    },
  });

  function buildStickerPanel() {
    stickerPanel.innerHTML = '';

    // Tabs row
    const tabsRow = h('div', {
      style: {
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 4px', flexShrink: '0',
      },
    });

    STICKER_PACKS.forEach(pack => {
      const isActive = pack.id === activeStickerPack.id;
      const tab = h('button', {
        style: {
          flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '4px', padding: '10px 4px', background: 'none', border: 'none',
          borderBottom: isActive ? '2px solid #D4A017' : '2px solid transparent',
          cursor: 'pointer', opacity: isActive ? '1' : '0.5',
        },
      },
        h('span', { style: { fontSize: '14px' } }, pack.icon),
        h('span', {
          style: {
            fontSize: '10px', fontWeight: isActive ? '700' : '500',
            color: isActive ? '#D4A017' : 'rgba(255,255,255,0.5)',
          },
        }, pack.name),
      );
      tab.addEventListener('click', () => {
        activeStickerPack = pack;
        buildStickerPanel();
      });
      tabsRow.appendChild(tab);
    });

    // Close button
    const closeBtn = h('button', {
      style: {
        padding: '8px', background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: '0',
        fontSize: '14px',
      },
    }, '\u2715');
    closeBtn.addEventListener('click', () => closeStickerPicker());
    tabsRow.appendChild(closeBtn);

    // Grid
    const grid = h('div', {
      style: {
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4px', padding: '8px', overflowY: 'auto', flex: '1',
      },
    });

    activeStickerPack.stickers.forEach(sticker => {
      const size = 52;
      const isAdinkra = activeStickerPack.id === 'adinkra-vibes';

      const stickerEl = h('button', {
        style: {
          width: `${size}px`, height: `${size}px`,
          borderRadius: isAdinkra ? '50%' : (activeStickerPack.id === 'ghana-expressions' ? '50%' : '10px'),
          background: sticker.bg, border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1px', padding: '2px', overflow: 'hidden',
          transition: 'transform 0.12s ease',
        },
      });

      if (sticker.face) {
        stickerEl.appendChild(h('span', { style: { fontSize: isAdinkra ? '10px' : '16px', lineHeight: '1' } }, sticker.face));
      }
      stickerEl.appendChild(h('span', {
        style: {
          fontSize: isAdinkra ? '7px' : '8px', fontWeight: '800',
          color: sticker.textColor, textAlign: 'center',
          lineHeight: '1.1', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: `${size - 4}px`,
          textTransform: isAdinkra ? 'uppercase' : 'none',
          letterSpacing: isAdinkra ? '0.03em' : 'normal',
        },
      }, sticker.label));

      stickerEl.addEventListener('click', () => {
        if (options.onSendSticker) {
          options.onSendSticker(activeStickerPack.id, sticker.id, sticker.label);
        }
        closeStickerPicker();
      });

      // Touch feedback
      stickerEl.addEventListener('touchstart', () => { stickerEl.style.transform = 'scale(1.1)'; }, { passive: true });
      stickerEl.addEventListener('touchend', () => { stickerEl.style.transform = 'scale(1)'; }, { passive: true });

      grid.appendChild(stickerEl);
    });

    stickerPanel.appendChild(tabsRow);
    stickerPanel.appendChild(grid);
  }

  function toggleStickerPicker() {
    if (stickerPickerOpen) {
      closeStickerPicker();
    } else {
      closeEmojiPicker();
      stickerPickerOpen = true;
      stickerPanel.style.display = 'flex';
      buildStickerPanel();
    }
  }

  function closeStickerPicker() {
    stickerPickerOpen = false;
    stickerPanel.style.display = 'none';
  }

  // Sticker button (GH flag emoji)
  const stickerBtn = h('button', {
    style: {
      background: 'none', border: 'none',
      color: 'rgba(255,255,255,0.6)', fontSize: '18px',
      cursor: 'pointer', padding: '0',
      minWidth: '44px', minHeight: '44px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: '0', alignSelf: 'flex-end', marginBottom: '2px',
    },
  }, '\uD83C\uDDEC\uD83C\uDDED');
  stickerBtn.className = 'chat-input-sticker';
  stickerBtn.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    toggleStickerPicker();
  });

  // Close sticker picker on outside click
  document.addEventListener('click', (e: Event) => {
    if (!stickerPickerOpen) return;
    const target = e.target as Node;
    if (!stickerPanel.contains(target) && target !== stickerBtn && !stickerBtn.contains(target)) {
      closeStickerPicker();
    }
  });

  // Close sticker picker when typing
  textarea.addEventListener('focus', () => closeStickerPicker());

  const capsule = h('div', { className: 'chat-input-field-wrap' },
    emojiBtn,
    textarea,
    stickerBtn,
    cameraBtn,
    momoBtn,
    attachBtn,
  );

  // Style the buttons with new classes
  attachBtn.className = 'chat-input-attach';
  sendBtn.className = 'chat-input-send';
  voiceBtn.className = 'chat-input-voice';

  const mainBar = h('div', { className: 'chat-input-main' },
    capsule, sendBtn, voiceBtn,
  );

  /* ================================================================ */
  /*  Outer wrapper                                                    */
  /* ================================================================ */

  const wrapper = h('div', {
    className: 'chat-input-container',
  }, emojiPanel, momoPanel, stickerPanel, replyBar, filePreviewBar, mainBar, fileInput, recordingBar) as ChatInputElement;

  /* ================================================================ */
  /*  Public API (attached to the element)                             */
  /* ================================================================ */

  wrapper.setReply = (sender: string, body: string, eventId: string) => {
    replyEventId = eventId;
    replySender.textContent = sender;
    replyBody.textContent = body;
    showReplyBar();
    textarea.focus();
  };

  wrapper.clearReply = () => {
    replyEventId = null;
    hideReplyBar();
  };

  wrapper.getReplyEventId = () => replyEventId;

  // Initialize button state
  updateActionButton();

  return wrapper;
}
