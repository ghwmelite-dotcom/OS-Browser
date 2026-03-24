import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

// ── Types ──

interface SavedPassword {
  id: string;
  site: string;
  username: string;
  password: string; // encrypted base64
  iv: string; // base64 IV for AES-GCM
  category: string; // 'government' | 'personal' | 'work' | 'financial'
  createdAt: string;
  lastUsed?: string;
}

type Category = 'government' | 'personal' | 'work' | 'financial';

const CATEGORY_COLORS: Record<Category, string> = {
  government: '#006B3F',
  personal: '#D4A017',
  work: '#3B82F6',
  financial: '#CE1126',
};

const MASTER_HASH_KEY = 'os_mobile_master_hash';
const VAULT_KEY = 'os_mobile_vault';
const SALT_KEY = 'os_mobile_vault_salt';
const LOCKOUT_KEY = 'os_mobile_vault_lockout';

// ── Crypto Helpers ──

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return new Uint8Array(JSON.parse(stored));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

async function deriveKey(masterPassword: string): Promise<CryptoKey> {
  const salt = getSalt();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(masterPassword), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPassword(plaintext: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext),
  );
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptPassword(encryptedB64: string, ivB64: string, key: CryptoKey): Promise<string> {
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// ── Vault Storage ──

function loadVault(): SavedPassword[] {
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveVault(vault: SavedPassword[]): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

// ── Password Strength ──

function calcStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score += 15;
  if (pw.length >= 12) score += 15;
  if (pw.length >= 16) score += 10;
  if (pw.length >= 24) score += 10;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[A-Z]/.test(pw)) score += 10;
  if (/[0-9]/.test(pw)) score += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 15;
  // Bonus for variety
  const unique = new Set(pw.split('')).size;
  score += Math.min(5, Math.floor(unique / 3));
  score = Math.min(100, score);

  if (score < 30) return { score, label: 'Weak', color: '#CE1126' };
  if (score < 55) return { score, label: 'Fair', color: '#D4A017' };
  if (score < 80) return { score, label: 'Strong', color: '#006B3F' };
  return { score, label: 'Very Strong', color: '#006B3F' };
}

function generatePassword(length: number, upper: boolean, lower: boolean, numbers: boolean, symbols: boolean): string {
  let chars = '';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  const arr = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

// ── Security Score ──

async function calcSecurityScore(vault: SavedPassword[], key: CryptoKey): Promise<{
  score: number; total: number; weak: number; reused: number; old: number;
}> {
  const decrypted: string[] = [];
  for (const entry of vault) {
    try {
      decrypted.push(await decryptPassword(entry.password, entry.iv, key));
    } catch {
      decrypted.push('');
    }
  }
  const total = vault.length;
  const weak = decrypted.filter((p) => p.length < 8).length;
  const seen = new Map<string, number>();
  decrypted.forEach((p) => { if (p) seen.set(p, (seen.get(p) || 0) + 1); });
  const reused = Array.from(seen.values()).filter((c) => c > 1).reduce((a, c) => a + c, 0);
  const now = Date.now();
  const old = vault.filter((e) => now - new Date(e.createdAt).getTime() > 90 * 86400000).length;

  if (total === 0) return { score: 100, total, weak, reused, old };
  let penalty = 0;
  penalty += (weak / total) * 35;
  penalty += (reused / total) * 35;
  penalty += (old / total) * 30;
  const score = Math.max(0, Math.round(100 - penalty));
  return { score, total, weak, reused, old };
}

// ── Main Render ──

export function renderPasswordsPage(container: HTMLElement): void {
  const hasMaster = !!localStorage.getItem(MASTER_HASH_KEY);

  if (!hasMaster) {
    renderSetupMaster(container);
  } else {
    renderLockScreen(container);
  }
}

// ── Setup Master Password ──

function renderSetupMaster(container: HTMLElement): void {
  let pw = '';
  let confirm = '';

  const pwInput = h('input', {
    type: 'password',
    placeholder: 'Create master password',
    style: inputStyle(),
    onInput: (e: Event) => { pw = (e.target as HTMLInputElement).value; },
  });

  const confirmInput = h('input', {
    type: 'password',
    placeholder: 'Confirm master password',
    style: inputStyle(),
    onInput: (e: Event) => { confirm = (e.target as HTMLInputElement).value; },
  });

  const saveBtn = h('button', {
    style: {
      ...btnPrimaryStyle(),
      width: '100%',
      marginTop: '8px',
    },
    onClick: async () => {
      if (pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
      if (pw !== confirm) { showToast('Passwords do not match', 'error'); return; }
      const hash = await sha256(pw);
      localStorage.setItem(MASTER_HASH_KEY, hash);
      showToast('Master password created', 'success');
      renderUnlockedVault(container, pw);
    },
  }, 'Set Master Password');

  render(container,
    h('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', padding: '32px 24px 120px', gap: '20px',
      },
    },
      h('div', { style: { fontSize: '48px', lineHeight: '1' } }, '\uD83D\uDD12'),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5.5vw, 24px)',
          fontWeight: '700', color: '#fff', textAlign: 'center',
        },
      }, 'Create Your Vault'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 14px)',
          color: '#888', textAlign: 'center', maxWidth: '280px',
        },
      }, 'Set a master password to protect your saved credentials. This password never leaves your device.'),
      h('div', { style: { width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' } },
        pwInput,
        confirmInput,
        saveBtn,
      ),
    ),
  );
}

// ── Lock Screen ──

function renderLockScreen(container: HTMLElement): void {
  let pw = '';
  let attempts = 0;

  // Check lockout
  const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  const now = Date.now();

  if (lockoutUntil > now) {
    renderLockout(container, lockoutUntil);
    return;
  }

  const errorMsg = h('div', {
    style: {
      fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
      color: '#CE1126', textAlign: 'center', minHeight: '18px',
    },
  }, '');

  const pwInput = h('input', {
    type: 'password',
    placeholder: 'Enter master password',
    style: inputStyle(),
    onInput: (e: Event) => { pw = (e.target as HTMLInputElement).value; },
    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') unlockBtn.click(); },
  });

  const unlockBtn = h('button', {
    style: { ...btnPrimaryStyle(), width: '100%' },
    onClick: async () => {
      const hash = await sha256(pw);
      const stored = localStorage.getItem(MASTER_HASH_KEY);
      if (hash === stored) {
        renderUnlockedVault(container, pw);
      } else {
        attempts++;
        if (attempts >= 3) {
          const lockUntil = Date.now() + 30000;
          localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
          renderLockout(container, lockUntil);
        } else {
          errorMsg.textContent = `Incorrect password (${3 - attempts} attempts remaining)`;
          (pwInput as HTMLInputElement).value = '';
          pw = '';
        }
      }
    },
  }, 'Unlock Vault');

  const resetLink = h('button', {
    style: {
      background: 'none', border: 'none', color: '#888',
      fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
      cursor: 'pointer', textDecoration: 'underline', padding: '8px',
      minHeight: '44px',
    },
    onClick: () => {
      if (confirm('This will erase ALL saved passwords. Are you sure?')) {
        localStorage.removeItem(MASTER_HASH_KEY);
        localStorage.removeItem(VAULT_KEY);
        localStorage.removeItem(SALT_KEY);
        localStorage.removeItem(LOCKOUT_KEY);
        showToast('Vault reset complete', 'info');
        renderSetupMaster(container);
      }
    },
  }, 'Forgot password? Reset vault');

  render(container,
    h('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', padding: '32px 24px 120px', gap: '20px',
      },
    },
      h('div', { style: { fontSize: '48px', lineHeight: '1' } }, '\uD83D\uDEE1\uFE0F'),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5.5vw, 24px)',
          fontWeight: '700', color: '#fff', textAlign: 'center',
        },
      }, 'Password Vault'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 14px)',
          color: '#888', textAlign: 'center',
        },
      }, 'Enter your master password to access credentials'),
      h('div', { style: { width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' } },
        pwInput,
        errorMsg,
        unlockBtn,
      ),
      resetLink,
    ),
  );
}

// ── Lockout Screen ──

function renderLockout(container: HTMLElement, lockoutUntil: number): void {
  const countdownEl = h('div', {
    style: {
      fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 7vw, 36px)',
      fontWeight: '700', color: '#CE1126', textAlign: 'center',
    },
  }, '');

  const interval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
    countdownEl.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(interval);
      localStorage.removeItem(LOCKOUT_KEY);
      renderLockScreen(container);
    }
  }, 250);

  render(container,
    h('div', {
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', padding: '32px 24px 120px', gap: '16px',
      },
    },
      h('div', { style: { fontSize: '48px', lineHeight: '1' } }, '\u26A0\uFE0F'),
      h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 22px)',
          fontWeight: '700', color: '#fff', textAlign: 'center',
        },
      }, 'Too Many Attempts'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 14px)',
          color: '#888', textAlign: 'center',
        },
      }, 'Vault locked. Try again in:'),
      countdownEl,
    ),
  );
}

// ── Unlocked Vault ──

async function renderUnlockedVault(container: HTMLElement, masterPassword: string): Promise<void> {
  const key = await deriveKey(masterPassword);
  let vault = loadVault();
  let searchQuery = '';
  let expandedId: string | null = null;

  async function rerender(): Promise<void> {
    vault = loadVault();
    await buildUI();
  }

  async function buildUI(): Promise<void> {
    // ── Security Score ──
    const stats = await calcSecurityScore(vault, key);
    const scoreColor = stats.score >= 80 ? '#006B3F' : stats.score >= 50 ? '#D4A017' : '#CE1126';
    const scoreGlow = stats.score >= 80 ? '0 0 20px rgba(0,107,63,0.4)' : 'none';

    const scoreSection = h('div', {
      style: {
        background: 'var(--surface, #141414)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px', padding: '20px', margin: '16px',
        display: 'flex', alignItems: 'center', gap: '20px',
      },
    },
      // Circular gauge
      h('div', {
        style: {
          position: 'relative', width: '72px', height: '72px', flexShrink: '0',
        },
      },
        h('svg', {
          innerHTML: `
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke="${scoreColor}" stroke-width="6"
              stroke-dasharray="${(stats.score / 100) * 188.5} 188.5"
              stroke-linecap="round" transform="rotate(-90 36 36)"
              style="filter: drop-shadow(${scoreGlow})"/>
          `,
          style: { width: '72px', height: '72px' },
          viewBox: '0 0 72 72',
        }),
        h('div', {
          style: {
            position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 4.2vw, 20px)',
            fontWeight: '700', color: scoreColor,
          },
        }, String(stats.score)),
      ),
      // Stats
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1' } },
        h('div', {
          style: {
            fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 16px)',
            fontWeight: '700', color: '#fff',
          },
        }, 'Security Score'),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: '#888', display: 'flex', gap: '12px', flexWrap: 'wrap',
          },
        },
          h('span', {}, `${stats.total} saved`),
          stats.weak > 0 ? h('span', { style: { color: '#CE1126' } }, `${stats.weak} weak`) : h('span', {}),
          stats.reused > 0 ? h('span', { style: { color: '#D4A017' } }, `${stats.reused} reused`) : h('span', {}),
        ),
      ),
    );

    // ── Search + Add ──
    const searchBar = h('div', {
      style: {
        display: 'flex', gap: '8px', padding: '0 16px', margin: '8px 0',
      },
    },
      h('input', {
        type: 'text',
        placeholder: '\uD83D\uDD0D Search passwords...',
        value: searchQuery,
        style: {
          ...inputStyle(),
          flex: '1',
          margin: '0',
        },
        onInput: (e: Event) => {
          searchQuery = (e.target as HTMLInputElement).value;
          updateList();
        },
      }),
      h('button', {
        style: {
          width: '48px', height: '48px', borderRadius: '12px', border: 'none',
          background: '#D4A017', color: '#fff', fontSize: '24px', fontWeight: '700',
          cursor: 'pointer', flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        onClick: () => renderAddEditForm(container, key, null, masterPassword),
      }, '+'),
    );

    // ── Password List ──
    const listContainer = h('div', {
      style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    });

    async function updateList(): Promise<void> {
      listContainer.innerHTML = '';
      const filtered = vault.filter((entry) => {
        const q = searchQuery.toLowerCase();
        return !q || entry.site.toLowerCase().includes(q) || entry.username.toLowerCase().includes(q) || entry.category.toLowerCase().includes(q);
      });

      if (filtered.length === 0) {
        listContainer.appendChild(
          h('div', {
            style: {
              textAlign: 'center', padding: '40px 16px',
              fontFamily: 'var(--font-body)', fontSize: 'clamp(13px, 3.4vw, 14px)', color: '#888',
            },
          },
            vault.length === 0 ? 'No passwords saved yet. Tap + to add one.' : 'No results found.',
          ),
        );
        return;
      }

      for (const entry of filtered) {
        const isExpanded = expandedId === entry.id;
        const initial = entry.site.charAt(0).toUpperCase();
        const catColor = CATEGORY_COLORS[entry.category as Category] || '#888';

        let decryptedPw = '';
        let pwVisible = false;

        // Card header
        const pwDisplay = h('span', {
          style: {
            fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 3.6vw, 15px)',
            color: '#fff', letterSpacing: '2px',
          },
        }, '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');

        const expandedContent = h('div', {
          style: {
            display: isExpanded ? 'flex' : 'none',
            flexDirection: 'column', gap: '12px',
            paddingTop: '12px', borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
          },
        },
          // Password row
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('div', {
              style: {
                fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)',
                color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', width: '70px', flexShrink: '0',
              },
            }, 'Password'),
            pwDisplay,
            h('button', {
              style: smallBtnStyle(),
              onClick: async () => {
                if (!pwVisible) {
                  try {
                    decryptedPw = await decryptPassword(entry.password, entry.iv, key);
                    pwDisplay.textContent = decryptedPw;
                    pwVisible = true;
                  } catch {
                    showToast('Failed to decrypt', 'error');
                  }
                } else {
                  pwDisplay.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
                  pwVisible = false;
                }
              },
            }, '\uD83D\uDC41'),
          ),
          // Action buttons
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('button', {
              style: actionBtnStyle('#006B3F'),
              onClick: async () => {
                try {
                  await navigator.clipboard.writeText(entry.username);
                  showToast('Username copied', 'success');
                } catch {
                  showToast('Copy failed', 'error');
                }
              },
            }, 'Copy Username'),
            h('button', {
              style: actionBtnStyle('#D4A017'),
              onClick: async () => {
                try {
                  if (!decryptedPw) decryptedPw = await decryptPassword(entry.password, entry.iv, key);
                  await navigator.clipboard.writeText(decryptedPw);
                  showToast('Password copied', 'success');
                  // Update lastUsed
                  entry.lastUsed = new Date().toISOString();
                  saveVault(vault);
                } catch {
                  showToast('Copy failed', 'error');
                }
              },
            }, 'Copy Password'),
            h('button', {
              style: actionBtnStyle('#3B82F6'),
              onClick: () => renderAddEditForm(container, key, entry, masterPassword),
            }, 'Edit'),
            h('button', {
              style: actionBtnStyle('#CE1126'),
              onClick: async () => {
                if (confirm(`Delete credentials for ${entry.site}?`)) {
                  vault = vault.filter((e) => e.id !== entry.id);
                  saveVault(vault);
                  expandedId = null;
                  showToast('Deleted', 'info');
                  await rerender();
                }
              },
            }, 'Delete'),
          ),
        );

        const card = h('div', {
          style: {
            background: 'var(--surface, #141414)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: '16px', padding: '14px 16px',
            cursor: 'pointer', transition: 'border-color 200ms ease',
          },
        },
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: '12px' },
            onClick: () => {
              expandedId = expandedId === entry.id ? null : entry.id;
              updateList();
            },
          },
            // Favicon circle
            h('div', {
              style: {
                width: '40px', height: '40px', borderRadius: '50%',
                background: catColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700',
                flexShrink: '0',
              },
            }, initial),
            // Info
            h('div', { style: { flex: '1', minWidth: '0' } },
              h('div', {
                style: {
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 15px)',
                  fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                },
              }, entry.site),
              h('div', {
                style: {
                  fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
                  color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                },
              }, entry.username),
            ),
            // Category badge
            h('span', {
              style: {
                fontSize: 'clamp(10px, 2.6vw, 11px)', fontFamily: 'var(--font-body)',
                fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
                padding: '3px 8px', borderRadius: '6px',
                background: catColor + '22', color: catColor,
                flexShrink: '0',
              },
            }, entry.category),
            // Chevron
            h('span', {
              style: {
                color: '#555', fontSize: '14px', transition: 'transform 200ms ease',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              },
            }, '\u25B6'),
          ),
          expandedContent,
        );

        listContainer.appendChild(card);
      }
    }

    // ── Generator Section ──
    const generatorSection = buildGeneratorSection();

    // ── Export / Import ──
    const exportImportSection = h('div', {
      style: {
        padding: '0 16px', margin: '16px 0', display: 'flex', gap: '8px',
      },
    },
      h('button', {
        style: { ...actionBtnStyle('#3B82F6'), flex: '1', justifyContent: 'center' },
        onClick: () => {
          const data = JSON.stringify({ vault: loadVault(), salt: localStorage.getItem(SALT_KEY) });
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `os-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Vault exported', 'success');
        },
      }, '\uD83D\uDCE4 Export'),
      h('button', {
        style: { ...actionBtnStyle('#006B3F'), flex: '1', justifyContent: 'center' },
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              const data = JSON.parse(text);
              if (data.vault && Array.isArray(data.vault)) {
                saveVault(data.vault);
                if (data.salt) localStorage.setItem(SALT_KEY, data.salt);
                showToast(`Imported ${data.vault.length} passwords`, 'success');
                await rerender();
              } else {
                showToast('Invalid vault file', 'error');
              }
            } catch {
              showToast('Import failed', 'error');
            }
          };
          input.click();
        },
      }, '\uD83D\uDCE5 Import'),
    );

    // ── Section headers ──
    function sectionLabel(text: string): HTMLElement {
      return h('div', {
        style: {
          fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 3.2vw, 14px)',
          fontWeight: '700', textTransform: 'uppercase', color: '#888',
          letterSpacing: '1px', padding: '16px 16px 8px',
        },
      }, text);
    }

    // ── Lock button ──
    const lockBtn = h('button', {
      style: {
        position: 'absolute', top: '16px', right: '16px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: '13px', color: '#888',
        display: 'flex', alignItems: 'center', gap: '4px',
        minHeight: '44px',
      },
      onClick: () => {
        showToast('Vault locked', 'info');
        renderLockScreen(container);
      },
    }, '\uD83D\uDD12 Lock');

    render(container,
      h('div', {
        style: {
          position: 'relative', paddingBottom: '100px', overflowY: 'auto', height: '100%',
        },
      },
        // Header
        h('div', {
          style: {
            padding: '20px 16px 8px', display: 'flex', alignItems: 'center', gap: '12px',
          },
        },
          h('div', { style: { fontSize: '28px' } }, '\uD83D\uDEE1\uFE0F'),
          h('div', {
            style: {
              fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5.5vw, 24px)',
              fontWeight: '700', color: '#fff',
            },
          }, 'Password Vault'),
        ),
        lockBtn,

        scoreSection,

        sectionLabel('Your Passwords'),
        searchBar,
        listContainer,

        sectionLabel('Password Generator'),
        generatorSection,

        sectionLabel('Backup'),
        exportImportSection,
      ),
    );

    await updateList();
  }

  buildUI();
}

// ── Password Generator Component ──

function buildGeneratorSection(): HTMLElement {
  let length = 16;
  let useUpper = true;
  let useLower = true;
  let useNumbers = true;
  let useSymbols = true;
  let generated = generatePassword(length, useUpper, useLower, useNumbers, useSymbols);

  const pwText = h('div', {
    style: {
      fontFamily: 'monospace', fontSize: 'clamp(14px, 3.6vw, 16px)',
      color: '#fff', wordBreak: 'break-all', flex: '1', lineHeight: '1.4',
    },
  }, generated);

  const strengthBar = h('div', { style: { height: '4px', borderRadius: '2px', transition: 'all 300ms ease' } });
  const strengthLabel = h('span', {
    style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)' },
  });

  const lengthDisplay = h('span', {
    style: {
      fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 16px)',
      fontWeight: '700', color: '#D4A017', minWidth: '28px', textAlign: 'center',
    },
  }, String(length));

  function updateStrength(): void {
    const s = calcStrength(generated);
    strengthBar.style.width = s.score + '%';
    strengthBar.style.background = s.color;
    if (s.label === 'Very Strong') strengthBar.style.boxShadow = `0 0 8px ${s.color}`;
    else strengthBar.style.boxShadow = 'none';
    strengthLabel.textContent = s.label;
    strengthLabel.style.color = s.color;
  }

  function regen(): void {
    generated = generatePassword(length, useUpper, useLower, useNumbers, useSymbols);
    pwText.textContent = generated;
    updateStrength();
  }

  updateStrength();

  function togglePill(label: string, active: boolean, onChange: (v: boolean) => void): HTMLElement {
    const pill = h('button', {
      style: {
        padding: '8px 14px', borderRadius: '20px', border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '600',
        cursor: 'pointer', transition: 'all 150ms ease',
        background: active ? '#D4A017' : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : '#888',
        minHeight: '44px',
      },
      onClick: () => {
        active = !active;
        pill.style.background = active ? '#D4A017' : 'rgba(255,255,255,0.06)';
        pill.style.color = active ? '#fff' : '#888';
        onChange(active);
        regen();
      },
    }, label);
    return pill;
  }

  return h('div', {
    style: {
      background: 'var(--surface, #141414)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: '16px', padding: '16px', margin: '0 16px',
      display: 'flex', flexDirection: 'column', gap: '14px',
    },
  },
    // Generated password display
    h('div', {
      style: {
        background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
      },
    },
      pwText,
      h('button', {
        style: smallBtnStyle(),
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(generated);
            showToast('Copied to clipboard', 'success');
          } catch {
            showToast('Copy failed', 'error');
          }
        },
      }, '\uD83D\uDCCB'),
      h('button', {
        style: smallBtnStyle(),
        onClick: regen,
      }, '\uD83C\uDFB2'),
    ),
    // Strength meter
    h('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '4px' },
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', {
          style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 2.8vw, 12px)', color: '#888' },
        }, 'Strength'),
        strengthLabel,
      ),
      h('div', {
        style: { height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' },
      }, strengthBar),
    ),
    // Length slider
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
      h('span', {
        style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: '#888' },
      }, 'Length'),
      h('input', {
        type: 'range',
        min: '8',
        max: '64',
        value: String(length),
        style: { flex: '1', accentColor: '#D4A017', height: '44px' },
        onInput: (e: Event) => {
          length = parseInt((e.target as HTMLInputElement).value, 10);
          lengthDisplay.textContent = String(length);
          regen();
        },
      }),
      lengthDisplay,
    ),
    // Toggle options
    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      togglePill('ABC', useUpper, (v) => { useUpper = v; }),
      togglePill('abc', useLower, (v) => { useLower = v; }),
      togglePill('123', useNumbers, (v) => { useNumbers = v; }),
      togglePill('#$%', useSymbols, (v) => { useSymbols = v; }),
    ),
  );
}

// ── Add / Edit Form ──

async function renderAddEditForm(
  container: HTMLElement,
  key: CryptoKey,
  existing: SavedPassword | null,
  masterPassword: string,
): Promise<void> {
  const isEdit = !!existing;
  let site = existing?.site || '';
  let username = existing?.username || '';
  let password = '';
  let category: Category = (existing?.category as Category) || 'personal';

  if (existing) {
    try {
      password = await decryptPassword(existing.password, existing.iv, key);
    } catch {
      password = '';
    }
  }

  let pwVisible = false;

  const siteInput = h('input', {
    type: 'text',
    placeholder: 'Site name (e.g. Ghana.gov)',
    value: site,
    style: inputStyle(),
    onInput: (e: Event) => { site = (e.target as HTMLInputElement).value; },
  });

  const usernameInput = h('input', {
    type: 'text',
    placeholder: 'Username or email',
    value: username,
    style: inputStyle(),
    onInput: (e: Event) => { username = (e.target as HTMLInputElement).value; },
  });

  const pwInput = h('input', {
    type: 'password',
    placeholder: 'Password',
    value: password,
    style: { ...inputStyle(), flex: '1' },
    onInput: (e: Event) => {
      password = (e.target as HTMLInputElement).value;
      updatePwStrength();
    },
  });

  const pwStrengthBar = h('div', { style: { height: '3px', borderRadius: '2px', transition: 'all 200ms ease' } });
  const pwStrengthContainer = h('div', {
    style: { height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' },
  }, pwStrengthBar);

  function updatePwStrength(): void {
    const s = calcStrength(password);
    pwStrengthBar.style.width = s.score + '%';
    pwStrengthBar.style.background = s.color;
  }
  updatePwStrength();

  // Category pills
  const categories: Category[] = ['government', 'personal', 'work', 'financial'];
  const catPills: HTMLElement[] = [];

  function updateCatPills(): void {
    catPills.forEach((pill, i) => {
      const cat = categories[i];
      const active = category === cat;
      pill.style.background = active ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.06)';
      pill.style.color = active ? '#fff' : '#888';
    });
  }

  categories.forEach((cat) => {
    const pill = h('button', {
      style: {
        padding: '8px 14px', borderRadius: '20px', border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '600',
        cursor: 'pointer', textTransform: 'capitalize', transition: 'all 150ms ease',
        background: category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.06)',
        color: category === cat ? '#fff' : '#888',
        minHeight: '44px',
      },
      onClick: () => {
        category = cat;
        updateCatPills();
      },
    }, cat);
    catPills.push(pill);
  });

  const saveBtn = h('button', {
    style: { ...btnPrimaryStyle(), width: '100%' },
    onClick: async () => {
      if (!site.trim()) { showToast('Enter a site name', 'error'); return; }
      if (!username.trim()) { showToast('Enter a username', 'error'); return; }
      if (!password) { showToast('Enter a password', 'error'); return; }

      try {
        const { encrypted, iv } = await encryptPassword(password, key);
        const vault = loadVault();

        if (isEdit && existing) {
          const idx = vault.findIndex((e) => e.id === existing.id);
          if (idx >= 0) {
            vault[idx] = { ...vault[idx], site: site.trim(), username: username.trim(), password: encrypted, iv, category };
          }
        } else {
          vault.push({
            id: crypto.randomUUID(),
            site: site.trim(),
            username: username.trim(),
            password: encrypted,
            iv,
            category,
            createdAt: new Date().toISOString(),
          });
        }

        saveVault(vault);
        showToast(isEdit ? 'Password updated' : 'Password saved', 'success');
        await renderUnlockedVault(container, masterPassword);
      } catch {
        showToast('Encryption failed', 'error');
      }
    },
  }, isEdit ? 'Update Password' : 'Save Password');

  const cancelBtn = h('button', {
    style: {
      width: '100%', padding: '14px', border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: '12px', background: 'transparent', color: '#888',
      fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '600',
      cursor: 'pointer', minHeight: '48px',
    },
    onClick: async () => {
      await renderUnlockedVault(container, masterPassword);
    },
  }, 'Cancel');

  // Inline mini-generator
  const generateBtn = h('button', {
    style: {
      ...smallBtnStyle(),
      fontSize: '13px',
      padding: '8px 12px',
    },
    onClick: () => {
      password = generatePassword(16, true, true, true, true);
      (pwInput as HTMLInputElement).value = password;
      (pwInput as HTMLInputElement).type = 'text';
      pwVisible = true;
      updatePwStrength();
    },
  }, '\uD83C\uDFB2 Generate');

  const toggleVisBtn = h('button', {
    style: smallBtnStyle(),
    onClick: () => {
      pwVisible = !pwVisible;
      (pwInput as HTMLInputElement).type = pwVisible ? 'text' : 'password';
    },
  }, '\uD83D\uDC41');

  render(container,
    h('div', {
      style: {
        padding: '20px 16px 120px', overflowY: 'auto', height: '100%',
        display: 'flex', flexDirection: 'column', gap: '16px',
      },
    },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } },
        h('div', { style: { fontSize: '24px' } }, isEdit ? '\u270F\uFE0F' : '\u2795'),
        h('div', {
          style: {
            fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5.5vw, 24px)',
            fontWeight: '700', color: '#fff',
          },
        }, isEdit ? 'Edit Credential' : 'Add Credential'),
      ),
      // Form fields
      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
          color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
      }, 'Site'),
      siteInput,

      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
          color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
      }, 'Username / Email'),
      usernameInput,

      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
          color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
      }, 'Password'),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
        pwInput,
        toggleVisBtn,
        generateBtn,
      ),
      pwStrengthContainer,

      h('div', {
        style: {
          fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)',
          color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
      }, 'Category'),
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ...catPills),

      h('div', { style: { marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' } },
        saveBtn,
        cancelBtn,
      ),
    ),
  );
}

// ── Shared Styles ──

function inputStyle(): Record<string, string> {
  return {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    borderRadius: '12px',
    background: 'var(--surface, #141414)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 'clamp(15px, 3.8vw, 16px)',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '48px',
  };
}

function btnPrimaryStyle(): Record<string, string> {
  return {
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    background: '#D4A017',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(15px, 3.8vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
    minHeight: '48px',
  };
}

function smallBtnStyle(): Record<string, string> {
  return {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#fff',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function actionBtnStyle(color: string): Record<string, string> {
  return {
    padding: '8px 14px',
    border: 'none',
    borderRadius: '8px',
    background: color + '18',
    color,
    fontFamily: 'var(--font-body)',
    fontSize: 'clamp(12px, 3vw, 13px)',
    fontWeight: '600',
    cursor: 'pointer',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
  };
}
