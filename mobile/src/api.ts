const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev/api/v1';
const MATRIX_BASE = 'https://govchat.askozzy.work';

function getToken(): string | null {
  return localStorage.getItem('os_mobile_token');
}

function getMatrixToken(): string | null {
  return localStorage.getItem('os_mobile_matrix_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function matrixFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated with Matrix');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${MATRIX_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`Matrix ${res.status}`);
  return res.json();
}

/** Helper to get current user ID from stored credentials */
function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      return creds.userId || creds.user_id || '';
    }
  } catch { /* ignore */ }
  return '';
}

// Auth
export async function login(staffId: string, displayName?: string) {
  return apiFetch('/govchat/auth/login', {
    method: 'POST',
    body: JSON.stringify({ staffId, displayName }),
  });
}

export async function redeemInvite(code: string, staffId: string, displayName: string) {
  return apiFetch('/govchat/auth/redeem-invite', {
    method: 'POST',
    body: JSON.stringify({ code, staffId, displayName }),
  });
}

export async function getMe() {
  return apiFetch('/govchat/auth/me');
}

export async function publicSignup(displayName: string, email: string) {
  return apiFetch('/govchat/auth/public-signup', {
    method: 'POST',
    body: JSON.stringify({ displayName, email }),
  });
}

// AI
export async function aiChat(message: string, model?: string, history?: any[]) {
  return apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, model, conversation_history: history || [] }),
  });
}

export async function aiChatStream(message: string, model?: string, onChunk?: (text: string) => void) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, model, conversation_history: [] }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let full = '';
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk?.(full);
    }
  }
  return full;
}

export async function aiTranslate(text: string, targetLang: string = 'ak') {
  return apiFetch('/ai/translate', {
    method: 'POST',
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
}

export async function aiSummarize(url: string, pageText: string) {
  return apiFetch('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ url, page_text: pageText }),
  });
}

// Matrix — Core
export async function matrixSync(since?: string) {
  const params = since ? `?since=${since}&timeout=30000` : '?timeout=0';
  return matrixFetch(`/_matrix/client/v3/sync${params}`);
}

export async function matrixSendMessage(roomId: string, body: string) {
  const txnId = `m${Date.now()}`;
  return matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    body: JSON.stringify({ msgtype: 'm.text', body }),
  });
}

/** Send a custom event (e.g. MoMo request/receipt) with arbitrary content */
export async function matrixSendCustomEvent(roomId: string, content: Record<string, unknown>) {
  const txnId = `m${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  return matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    body: JSON.stringify(content),
  });
}

export async function matrixGetMessages(roomId: string, limit: number = 30) {
  return matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=${limit}`);
}

export async function matrixJoinedRooms() {
  return matrixFetch('/_matrix/client/v3/joined_rooms');
}

// Matrix — Media

/** Convert mxc:// URL to downloadable HTTPS URL */
export function mxcToHttp(mxcUrl: string): string {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) return mxcUrl;
  const parts = mxcUrl.replace('mxc://', '').split('/');
  const server = parts[0];
  const mediaId = parts.slice(1).join('/');
  return `${MATRIX_BASE}/_matrix/media/v3/download/${server}/${mediaId}`;
}

/** Upload file/blob to Matrix media store */
export async function matrixUploadMedia(file: File | Blob, filename?: string): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const name = filename || (file instanceof File ? file.name : 'upload');
  const res = await fetch(`${MATRIX_BASE}/_matrix/media/v3/upload?filename=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  return data.content_uri; // mxc:// URL
}

/** Send a file/image message to a Matrix room */
export async function matrixSendFile(roomId: string, mxcUrl: string, filename: string, mimetype: string, size: number): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const isImage = mimetype.startsWith('image/');
  const txnId = `m${Date.now()}`;
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: isImage ? 'm.image' : 'm.file',
      body: filename,
      url: mxcUrl,
      info: { mimetype, size },
    }),
  });
  if (!res.ok) throw new Error(`Send file failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

/** Send a voice note message */
export async function matrixSendVoiceNote(roomId: string, mxcUrl: string, duration: number, waveform: number[], mimetype: string, size: number): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const txnId = `m${Date.now()}`;
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'm.audio',
      body: 'Voice message',
      url: mxcUrl,
      info: { mimetype, size, duration: duration * 1000 },
      'org.matrix.msc3245.voice': {},
      'org.matrix.msc1767.audio': {
        duration: duration * 1000,
        waveform: waveform.map(v => Math.round(v * 1024)),
      },
    }),
  });
  if (!res.ok) throw new Error(`Send voice failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

// Matrix — Rich messaging

/** Send a reply message */
export async function matrixSendReply(roomId: string, text: string, replyToEventId: string, replyToSender: string, replyToBody: string): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const txnId = `m${Date.now()}`;
  const fallbackBody = `> <${replyToSender}> ${replyToBody.slice(0, 80)}\n\n${text}`;
  const fallbackHtml = `<mx-reply><blockquote><a href="https://matrix.to/#/${encodeURIComponent(roomId)}/${encodeURIComponent(replyToEventId)}">In reply to</a> <a href="https://matrix.to/#/${encodeURIComponent(replyToSender)}">${replyToSender}</a><br>${replyToBody.slice(0, 80)}</blockquote></mx-reply>${text}`;
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'm.text',
      body: fallbackBody,
      format: 'org.matrix.custom.html',
      formatted_body: fallbackHtml,
      'm.relates_to': { 'm.in_reply_to': { event_id: replyToEventId } },
    }),
  });
  if (!res.ok) throw new Error(`Send reply failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

/** Add a reaction to a message */
export async function matrixAddReaction(roomId: string, eventId: string, emoji: string): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const txnId = `m${Date.now()}`;
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.reaction/${txnId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'm.relates_to': { rel_type: 'm.annotation', event_id: eventId, key: emoji },
    }),
  });
  if (!res.ok) throw new Error(`Reaction failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

/** Edit a message (m.replace) */
export async function matrixEditMessage(roomId: string, eventId: string, newBody: string) {
  const txnId = `m${Date.now()}`;
  return matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`, {
    method: 'PUT',
    body: JSON.stringify({
      msgtype: 'm.text',
      body: `* ${newBody}`,
      'm.new_content': {
        msgtype: 'm.text',
        body: newBody,
      },
      'm.relates_to': {
        rel_type: 'm.replace',
        event_id: eventId,
      },
    }),
  });
}

/** Redact (remove) an event */
export async function matrixRedact(roomId: string, eventId: string): Promise<void> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const txnId = `m${Date.now()}`;
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/redact/${encodeURIComponent(eventId)}/${txnId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Redact failed: ${res.status}`);
}

// Matrix — Presence & receipts

/** Send typing indicator */
export async function matrixSendTyping(roomId: string, typing: boolean): Promise<void> {
  const token = getMatrixToken();
  if (!token) return;
  const userId = getCurrentUserId();
  if (!userId) return;
  await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/typing/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ typing, timeout: 30000 }),
  }).catch(() => {});
}

/** Send read receipt */
export async function matrixSendReadReceipt(roomId: string, eventId: string): Promise<void> {
  const token = getMatrixToken();
  if (!token) return;
  await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/receipt/m.read/${encodeURIComponent(eventId)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
}

// Matrix — Room management

/** Create a direct message room */
export async function matrixCreateDMRoom(userId: string): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/createRoom`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      is_direct: true,
      invite: [userId],
      preset: 'private_chat',
      initial_state: [{ type: 'm.room.history_visibility', state_key: '', content: { history_visibility: 'shared' } }],
    }),
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  const data = await res.json();
  return data.room_id;
}

/** Create a group room */
export async function matrixCreateGroupRoom(name: string, inviteUserIds: string[]): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/createRoom`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      invite: inviteUserIds,
      preset: 'private_chat',
      initial_state: [{ type: 'm.room.history_visibility', state_key: '', content: { history_visibility: 'shared' } }],
    }),
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  const data = await res.json();
  return data.room_id;
}

/** Get joined members of a room */
export async function matrixGetRoomMembers(roomId: string): Promise<any[]> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Get members failed: ${res.status}`);
  const data = await res.json();
  return Object.entries(data.joined || {}).map(([id, info]: [string, any]) => ({
    userId: id,
    displayName: info.display_name || id.split(':')[0].replace('@', ''),
    avatarUrl: info.avatar_url,
  }));
}

/** Get ALL members of a room including invited/left (from room state) */
export async function matrixGetAllRoomMembers(roomId: string): Promise<any[]> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/members`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Get all members failed: ${res.status}`);
  const data = await res.json();
  return (data.chunk || []).map((ev: any) => ({
    userId: ev.state_key,
    displayName: ev.content?.displayname || ev.state_key?.split(':')[0]?.replace('@', ''),
    membership: ev.content?.membership,
  }));
}

/** Set the authenticated user's avatar URL on the Matrix homeserver */
export async function matrixSetAvatar(mxcUrl: string): Promise<void> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const userId = getCurrentUserId();
  if (!userId) throw new Error('No user ID');
  const res = await fetch(`${MATRIX_BASE}/_matrix/client/v3/profile/${encodeURIComponent(userId)}/avatar_url`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar_url: mxcUrl }),
  });
  if (!res.ok) throw new Error(`Set avatar failed: ${res.status}`);
}

/** Send a poll to a Matrix room */
export async function matrixSendPoll(
  roomId: string,
  question: string,
  options: string[],
): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const userId = getCurrentUserId();
  const pollId = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pollPayload = JSON.stringify({ question, options, pollId, createdBy: userId });
  const txnId = `m${Date.now()}`;
  const res = await fetch(
    `${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'm.poll',
        body: `[poll]${pollPayload}`,
        poll: { question, options, pollId, createdBy: userId },
      }),
    },
  );
  if (!res.ok) throw new Error(`Send poll failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

/** Vote on a poll */
export async function matrixSendPollVote(
  roomId: string,
  pollId: string,
  optionIndex: number,
  optionText: string,
): Promise<string> {
  const token = getMatrixToken();
  if (!token) throw new Error('Not authenticated');
  const txnId = `m${Date.now()}`;
  const res = await fetch(
    `${MATRIX_BASE}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'm.poll.response',
        body: `[poll-vote]{${pollId}}:${optionIndex}`,
        pollId,
        selectedOptions: [optionIndex],
        'org.ozzysurf.poll_vote': `[poll-vote]{${pollId}}:${optionIndex}`,
      }),
    },
  );
  if (!res.ok) throw new Error(`Vote failed: ${res.status}`);
  const data = await res.json();
  return data.event_id;
}

export { API_BASE, MATRIX_BASE };
