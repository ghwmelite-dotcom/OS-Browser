import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

// ── Types ──

interface MomoAccount {
  id: string;
  provider: 'MTN' | 'Vodafone' | 'AirtelTigo';
  phoneNumber: string;
  accountName: string;
  isPrimary: boolean;
}

interface UssdAction {
  label: string;
  code: string;
}

interface Transaction {
  icon: string;
  description: string;
  amount: number;
  date: string;
  type: 'credit' | 'debit';
}

interface QuickContact {
  name: string;
  initials: string;
  color: string;
}

// ── Constants ──

const STORAGE_KEY = 'os_mobile_momo_accounts';

const PROVIDER_COLORS: Record<string, string> = {
  MTN: '#FFCC00',
  Vodafone: '#E60000',
  AirtelTigo: '#0066CC',
};

const PROVIDER_ICONS: Record<string, string> = {
  MTN: '🟡',
  Vodafone: '🔴',
  AirtelTigo: '🔵',
};

const PROVIDER_TEXT_COLORS: Record<string, string> = {
  MTN: '#000',
  Vodafone: '#fff',
  AirtelTigo: '#fff',
};

const USSD_ACTIONS: Record<string, UssdAction[]> = {
  MTN: [
    { label: 'Balance', code: '*170#' },
    { label: 'Send Money', code: '*170*1#' },
    { label: 'Buy Airtime', code: '*170*3#' },
    { label: 'Statements', code: '*170*6#' },
  ],
  Vodafone: [
    { label: 'Balance', code: '*110#' },
    { label: 'Send Money', code: '*110*1#' },
    { label: 'Buy Airtime', code: '*110*2#' },
  ],
  AirtelTigo: [
    { label: 'Balance', code: '*500#' },
    { label: 'Send Money', code: '*500*1#' },
  ],
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { icon: '💰', description: 'Salary Credit', amount: 3850.00, date: 'Mar 15', type: 'credit' },
  { icon: '⚡', description: 'ECG Electricity Bill', amount: 245.50, date: 'Mar 14', type: 'debit' },
  { icon: '💧', description: 'GWCL Water Bill', amount: 89.00, date: 'Mar 12', type: 'debit' },
  { icon: '🛒', description: 'Makola Market Purchase', amount: 156.75, date: 'Mar 10', type: 'debit' },
  { icon: '📱', description: 'Airtime Top-Up', amount: 20.00, date: 'Mar 8', type: 'debit' },
  { icon: '🏥', description: 'NHIS Premium', amount: 48.00, date: 'Mar 5', type: 'debit' },
];

const QUICK_CONTACTS: QuickContact[] = [
  { name: 'Ama K.', initials: 'AK', color: '#006B3F' },
  { name: 'Kofi M.', initials: 'KM', color: '#D4A017' },
  { name: 'Abena S.', initials: 'AS', color: '#CE1126' },
  { name: 'Yaw P.', initials: 'YP', color: '#0066CC' },
];

// ── Helpers ──

function loadAccounts(): MomoAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: MomoAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 3) + '••••' + phone.slice(-3);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => showToast(`Copied ${text}! Dial in your phone app`, 'success'),
      () => showToast(`Copied ${text}! Dial in your phone app`, 'success'),
    );
  } else {
    showToast(`Copied ${text}! Dial in your phone app`, 'success');
  }
}

function sectionTitle(text: string): HTMLElement {
  return h('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(15px, 4vw, 17px)',
      fontWeight: '700',
      color: '#fff',
      padding: '0 0 10px',
    },
  }, text);
}

// ── Components ──

function buildAccountCard(account: MomoAccount, onDelete: (id: string) => void): HTMLElement {
  const providerColor = PROVIDER_COLORS[account.provider];
  const textColor = PROVIDER_TEXT_COLORS[account.provider];

  return h('div', {
    style: {
      minWidth: '260px',
      maxWidth: '300px',
      background: `linear-gradient(135deg, ${providerColor}, ${providerColor}cc)`,
      borderRadius: '16px',
      padding: '20px',
      color: textColor,
      position: 'relative',
      boxShadow: `0 8px 24px ${providerColor}40`,
      flexShrink: '0',
    },
  },
    // Provider badge
    h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      },
    },
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
      },
        h('span', { style: { fontSize: '20px' } }, PROVIDER_ICONS[account.provider]),
        h('span', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(14px, 3.6vw, 16px)',
            fontWeight: '700',
          },
        }, account.provider),
        account.isPrimary
          ? h('span', {
              style: {
                fontSize: '10px',
                background: 'rgba(255,255,255,0.3)',
                padding: '2px 8px',
                borderRadius: '8px',
                fontWeight: '600',
              },
            }, 'PRIMARY')
          : document.createTextNode('') as unknown as HTMLElement,
      ),
      // Delete button
      h('button', {
        onClick: (e: Event) => {
          e.stopPropagation();
          onDelete(account.id);
        },
        style: {
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          color: textColor,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }, '✕'),
    ),
    // Phone number
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(22px, 5.5vw, 26px)',
        fontWeight: '700',
        letterSpacing: '2px',
        marginBottom: '4px',
      },
    }, maskPhone(account.phoneNumber)),
    // Account name
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 14px)',
        opacity: '0.85',
      },
    }, account.accountName),
  );
}

function buildAddAccountButton(onClick: () => void): HTMLElement {
  return h('div', {
    onClick,
    style: {
      minWidth: '260px',
      maxWidth: '300px',
      background: 'var(--surface, #141414)',
      border: '2px dashed rgba(255,255,255,0.15)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      cursor: 'pointer',
      flexShrink: '0',
      minHeight: '120px',
    },
  },
    h('div', {
      style: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(212,160,23,0.15)',
        color: '#D4A017',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        fontWeight: '700',
      },
    }, '+'),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
      },
    }, 'Add Account'),
  );
}

function buildUssdSection(accounts: MomoAccount[]): HTMLElement {
  // Determine which providers to show — all linked, or all if none linked
  const providers = accounts.length > 0
    ? [...new Set(accounts.map(a => a.provider))]
    : ['MTN', 'Vodafone', 'AirtelTigo'];

  const providerSections = providers.map(provider => {
    const actions = USSD_ACTIONS[provider] || [];
    const color = PROVIDER_COLORS[provider];

    return h('div', {
      style: { marginBottom: '16px' },
    },
      // Provider label
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          fontWeight: '600',
          color: color,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        },
      },
        h('span', {}, PROVIDER_ICONS[provider]),
        h('span', {}, provider),
      ),
      // Action grid
      h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        },
      },
        ...actions.map(action =>
          h('button', {
            onClick: () => copyToClipboard(action.code),
            style: {
              background: 'var(--surface, #141414)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              minHeight: '44px',
            },
          },
            h('span', {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(11px, 2.8vw, 12px)',
                color: 'rgba(255,255,255,0.5)',
              },
            }, action.label),
            h('span', {
              style: {
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.6vw, 16px)',
                fontWeight: '700',
                color: '#fff',
              },
            }, action.code),
          ),
        ),
      ),
    );
  });

  return h('div', {},
    sectionTitle('USSD Quick Actions'),
    ...providerSections,
  );
}

function buildTransactionsSection(): HTMLElement {
  const rows = MOCK_TRANSACTIONS.map(tx => {
    const isCredit = tx.type === 'credit';
    const amountColor = isCredit ? '#00c853' : '#ff5252';
    const amountPrefix = isCredit ? '+' : '-';

    return h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: '12px',
      },
    },
      // Icon
      h('div', {
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: '0',
        },
      }, tx.icon),
      // Description + date
      h('div', {
        style: {
          flex: '1',
          minWidth: '0',
        },
      },
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(13px, 3.4vw, 14px)',
            fontWeight: '600',
            color: '#fff',
          },
        }, tx.description),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '2px',
          },
        }, tx.date),
      ),
      // Amount
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(14px, 3.6vw, 15px)',
          fontWeight: '700',
          color: amountColor,
          flexShrink: '0',
        },
      }, `${amountPrefix}GH₵${tx.amount.toFixed(2)}`),
    );
  });

  return h('div', {},
    sectionTitle('Recent Transactions'),
    h('div', {
      style: {
        background: 'var(--surface, #141414)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '4px 16px',
      },
    }, ...rows),
    // Disclaimer
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(10px, 2.6vw, 11px)',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        marginTop: '8px',
        fontStyle: 'italic',
      },
    }, 'This is sample data for demonstration purposes'),
  );
}

function buildQuickSendSection(): HTMLElement {
  const contacts = QUICK_CONTACTS.map(contact =>
    h('div', {
      onClick: () => showToast('Opening MoMo app...', 'info'),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
      },
    },
      h('div', {
        style: {
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: contact.color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(16px, 4vw, 18px)',
          fontWeight: '700',
        },
      }, contact.initials),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          color: 'rgba(255,255,255,0.6)',
          fontWeight: '500',
        },
      }, contact.name),
    ),
  );

  return h('div', {},
    sectionTitle('Quick Send'),
    h('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--surface, #141414)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '20px 12px',
      },
    }, ...contacts),
  );
}

function buildAddAccountModal(
  onSave: (account: Omit<MomoAccount, 'id'>) => void,
  onClose: () => void,
): HTMLElement {
  let selectedProvider: 'MTN' | 'Vodafone' | 'AirtelTigo' | null = null;
  let phoneValue = '';
  let nameValue = '';

  const providerBtns: HTMLElement[] = (['MTN', 'Vodafone', 'AirtelTigo'] as const).map(provider => {
    const btn = h('button', {
      onClick: () => {
        selectedProvider = provider;
        // Update visual selection
        providerBtns.forEach((b, i) => {
          const p = (['MTN', 'Vodafone', 'AirtelTigo'] as const)[i];
          if (p === provider) {
            b.style.border = `2px solid ${PROVIDER_COLORS[p]}`;
            b.style.background = `${PROVIDER_COLORS[p]}22`;
          } else {
            b.style.border = '2px solid rgba(255,255,255,0.1)';
            b.style.background = 'transparent';
          }
        });
      },
      style: {
        flex: '1',
        padding: '14px 8px',
        borderRadius: '12px',
        border: '2px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minHeight: '44px',
      },
    },
      h('span', { style: { fontSize: '20px' } }, PROVIDER_ICONS[provider]),
      h('span', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          fontWeight: '600',
          color: PROVIDER_COLORS[provider],
        },
      }, provider),
    );
    return btn;
  });

  const phoneInput = h('input', {
    type: 'tel',
    placeholder: '0XX XXX XXXX',
    maxlength: '10',
    onInput: (e: Event) => {
      phoneValue = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10);
      (e.target as HTMLInputElement).value = phoneValue;
    },
    style: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(15px, 3.8vw, 16px)',
      outline: 'none',
      boxSizing: 'border-box',
    },
  }) as HTMLElement;

  const nameInput = h('input', {
    type: 'text',
    placeholder: 'Account holder name',
    onInput: (e: Event) => {
      nameValue = (e.target as HTMLInputElement).value;
    },
    style: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(15px, 3.8vw, 16px)',
      outline: 'none',
      boxSizing: 'border-box',
    },
  }) as HTMLElement;

  const overlay = h('div', {
    onClick: (e: Event) => {
      if (e.target === overlay) onClose();
    },
    style: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  },
    h('div', {
      style: {
        width: '100%',
        maxWidth: '420px',
        background: '#1a1a1a',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
      },
    },
      // Handle bar
      h('div', {
        style: {
          width: '40px',
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.2)',
          margin: '0 auto 20px',
        },
      }),
      // Title
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 4.5vw, 20px)',
          fontWeight: '700',
          color: '#fff',
          marginBottom: '20px',
          textAlign: 'center',
        },
      }, 'Add MoMo Account'),
      // Provider selector
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '8px',
          fontWeight: '500',
        },
      }, 'Select Provider'),
      h('div', {
        style: {
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        },
      }, ...providerBtns),
      // Phone number
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '8px',
          fontWeight: '500',
        },
      }, 'Phone Number'),
      h('div', { style: { marginBottom: '16px' } }, phoneInput),
      // Account name
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '8px',
          fontWeight: '500',
        },
      }, 'Account Name'),
      h('div', { style: { marginBottom: '24px' } }, nameInput),
      // Save button
      h('button', {
        onClick: () => {
          if (!selectedProvider) {
            showToast('Please select a provider', 'error');
            return;
          }
          if (phoneValue.length !== 10 || !phoneValue.startsWith('0')) {
            showToast('Enter a valid 10-digit phone number starting with 0', 'error');
            return;
          }
          if (!nameValue.trim()) {
            showToast('Enter account holder name', 'error');
            return;
          }
          onSave({
            provider: selectedProvider,
            phoneNumber: phoneValue,
            accountName: nameValue.trim(),
            isPrimary: false,
          });
        },
        style: {
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          border: 'none',
          background: 'linear-gradient(135deg, #D4A017, #b8860b)',
          color: '#000',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 3.8vw, 16px)',
          fontWeight: '700',
          cursor: 'pointer',
          minHeight: '44px',
        },
      }, 'Save Account'),
    ),
  );

  return overlay;
}

// ── Main Render ──

export function renderMomoPage(container: HTMLElement): void {
  let accounts = loadAccounts();

  function renderPage(): void {
    // ── Header ──
    const header = h('div', {
      style: {
        padding: '16px 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      },
    },
      h('div', {
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #D4A017, #b8860b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        },
      }, '💳'),
      h('div', {},
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(18px, 4.8vw, 22px)',
            fontWeight: '700',
            color: '#fff',
          },
        }, 'Mobile Money'),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            color: 'rgba(255,255,255,0.4)',
          },
        }, 'Manage accounts & quick actions'),
      ),
    );

    // ── Account Cards (horizontal scroll) ──
    const deleteAccount = (id: string) => {
      accounts = accounts.filter(a => a.id !== id);
      saveAccounts(accounts);
      showToast('Account removed', 'info');
      renderPage();
    };

    const openAddModal = () => {
      const modal = buildAddAccountModal(
        (data) => {
          const newAccount: MomoAccount = {
            id: generateId(),
            ...data,
            isPrimary: accounts.length === 0,
          };
          accounts.push(newAccount);
          saveAccounts(accounts);
          modal.remove();
          showToast('Account added!', 'success');
          renderPage();
        },
        () => modal.remove(),
      );
      document.body.appendChild(modal);
    };

    const cardElements = accounts.map(a => buildAccountCard(a, deleteAccount));
    cardElements.push(buildAddAccountButton(openAddModal));

    const accountsSection = h('div', {
      style: { padding: '16px 0 0' },
    },
      h('div', { style: { padding: '0 16px' } }, sectionTitle('Your Accounts')),
      h('div', {
        style: {
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          padding: '0 16px 4px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        },
      }, ...cardElements),
    );

    // ── USSD Section ──
    const ussdSection = h('div', {
      style: { padding: '20px 16px 0' },
    }, buildUssdSection(accounts));

    // ── Quick Send Section ──
    const quickSendSection = h('div', {
      style: { padding: '20px 16px 0' },
    }, buildQuickSendSection());

    // ── Transactions Section ──
    const transactionsSection = h('div', {
      style: { padding: '20px 16px 0' },
    }, buildTransactionsSection());

    // ── Bottom spacer ──
    const bottomSpacer = h('div', { style: { height: '100px' } });

    render(
      container,
      header,
      accountsSection,
      ussdSection,
      quickSendSection,
      transactionsSection,
      bottomSpacer,
    );
  }

  renderPage();
}
