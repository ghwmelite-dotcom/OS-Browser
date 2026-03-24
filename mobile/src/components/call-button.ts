/* ================================================================
   Call header buttons — phone + video icons for chat room header
   ================================================================ */

import { h } from '../utils/dom';
import { webRTCService } from '../services/webrtc';
import { showCallView } from './call-view';

export function createCallButtons(peerId: string, peerName: string): HTMLElement {
  // Check if user is a guest — hide call buttons for guests
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      if (creds.userType === 'guest') {
        return h('div'); // empty, hidden
      }
    }
  } catch { /* proceed */ }

  const container = h('div', { className: 'call-header-btns' });

  // Store peer info on the container so chat-room can update peerName
  container.dataset.peerId = peerId;
  container.dataset.peerName = peerName;

  // Phone (audio) call button
  const phoneBtn = h('button', {
    className: 'call-header-btn',
    onClick: async () => {
      const name = container.dataset.peerName || peerName;
      const id = container.dataset.peerId || peerId;
      try {
        await webRTCService.startCall(id, name, false);
        showCallView();
      } catch (err) {
        console.error('[CallBtn] audio call failed', err);
      }
    },
    'aria-label': 'Audio call',
  });
  phoneBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.1 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`;

  // Video call button
  const videoBtn = h('button', {
    className: 'call-header-btn',
    onClick: async () => {
      const name = container.dataset.peerName || peerName;
      const id = container.dataset.peerId || peerId;
      try {
        await webRTCService.startCall(id, name, true);
        showCallView();
      } catch (err) {
        console.error('[CallBtn] video call failed', err);
      }
    },
    'aria-label': 'Video call',
  });
  videoBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;

  container.appendChild(phoneBtn);
  container.appendChild(videoBtn);

  return container;
}
