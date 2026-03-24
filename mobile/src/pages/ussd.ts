import { h, render } from '../utils/dom';
import { navigate } from '../router';

// ── Types ───────────────────────────────────────────────────────────
type USSDCategory = 'All' | 'Mobile Money' | 'Banking' | 'Utilities' | 'Government' | 'Telecom' | 'Insurance';

interface USSDCode {
  code: string;
  description: string;
  category: Exclude<USSDCategory, 'All'>;
  carrier: string;
  keywords: string[];
}

// ── Color maps ──────────────────────────────────────────────────────
const CARRIER_COLORS: Record<string, string> = {
  MTN: '#FFCC00',
  Telecel: '#0066CC',
  AirtelTigo: '#E31937',
  Bank: '#22C55E',
  Government: '#D4A017',
  Utility: '#0891B2',
  Insurance: '#8B5CF6',
  General: '#6B7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Mobile Money': '#D4A017',
  Banking: '#22C55E',
  Utilities: '#0891B2',
  Government: '#CE1126',
  Telecom: '#8B5CF6',
  Insurance: '#F59E0B',
};

const CATEGORIES: USSDCategory[] = ['All', 'Mobile Money', 'Banking', 'Utilities', 'Government', 'Telecom', 'Insurance'];

// ── Ghana USSD Codes (100+) ─────────────────────────────────────────
const ghanaUSSDCodes: USSDCode[] = [
  // Mobile Money — MTN (14)
  { code: '*170#', description: 'MTN MoMo Main Menu', category: 'Mobile Money', carrier: 'MTN', keywords: ['momo', 'mobile money', 'mtn', 'menu', 'main'] },
  { code: '*170*1#', description: 'MTN MoMo - Transfer Money', category: 'Mobile Money', carrier: 'MTN', keywords: ['transfer', 'send', 'money', 'momo', 'mtn'] },
  { code: '*170*2#', description: 'MTN MoMo - Buy Airtime for Self', category: 'Mobile Money', carrier: 'MTN', keywords: ['airtime', 'buy', 'self', 'momo', 'mtn', 'recharge'] },
  { code: '*170*3#', description: 'MTN MoMo - Check Balance', category: 'Mobile Money', carrier: 'MTN', keywords: ['balance', 'check', 'momo', 'mtn', 'wallet'] },
  { code: '*170*4#', description: 'MTN MoMo - Mini Statement', category: 'Mobile Money', carrier: 'MTN', keywords: ['statement', 'mini', 'history', 'transactions', 'mtn'] },
  { code: '*170*5#', description: 'MTN MoMo - Pay Bill (ECG, DSTV, etc.)', category: 'Mobile Money', carrier: 'MTN', keywords: ['bill', 'pay', 'ecg', 'dstv', 'utility', 'mtn'] },
  { code: '*170*6#', description: 'MTN MoMo - Cash Out / Withdraw', category: 'Mobile Money', carrier: 'MTN', keywords: ['cash out', 'withdraw', 'agent', 'mtn'] },
  { code: '*170*7#', description: 'MTN MoMo - Buy Airtime for Others', category: 'Mobile Money', carrier: 'MTN', keywords: ['airtime', 'others', 'share', 'gift', 'mtn'] },
  { code: '*170*1*1#', description: 'MTN MoMo - Transfer to MoMo Wallet', category: 'Mobile Money', carrier: 'MTN', keywords: ['transfer', 'wallet', 'momo', 'mtn'] },
  { code: '*170*1*2#', description: 'MTN MoMo - Transfer to Bank', category: 'Mobile Money', carrier: 'MTN', keywords: ['bank', 'transfer', 'momo', 'mtn'] },
  { code: '*170*1*3#', description: 'MTN MoMo - Merchant Payment', category: 'Mobile Money', carrier: 'MTN', keywords: ['merchant', 'payment', 'pay', 'mtn', 'shop'] },
  { code: '*170*2*6#', description: 'MTN MoMo - Buy Data Bundle', category: 'Mobile Money', carrier: 'MTN', keywords: ['data', 'bundle', 'internet', 'mtn', 'momo'] },
  { code: '*565*8#', description: 'MTN MoMo - MoMo Pay (Scan & Pay)', category: 'Mobile Money', carrier: 'MTN', keywords: ['scan', 'pay', 'merchant', 'qr', 'mtn'] },
  { code: '*170*9#', description: 'MTN MoMo - My Approvals', category: 'Mobile Money', carrier: 'MTN', keywords: ['approvals', 'approve', 'pending', 'mtn'] },
  // Mobile Money — Telecel (6)
  { code: '*110#', description: 'Telecel Cash Main Menu', category: 'Mobile Money', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'cash', 'menu', 'main'] },
  { code: '*110*1#', description: 'Telecel Cash - Transfer Money', category: 'Mobile Money', carrier: 'Telecel', keywords: ['transfer', 'send', 'telecel', 'vodafone'] },
  { code: '*110*2#', description: 'Telecel Cash - Buy Airtime', category: 'Mobile Money', carrier: 'Telecel', keywords: ['airtime', 'buy', 'telecel', 'vodafone'] },
  { code: '*110*3#', description: 'Telecel Cash - Check Balance', category: 'Mobile Money', carrier: 'Telecel', keywords: ['balance', 'check', 'telecel', 'vodafone'] },
  { code: '*110*4#', description: 'Telecel Cash - Pay Bills', category: 'Mobile Money', carrier: 'Telecel', keywords: ['bill', 'pay', 'telecel', 'vodafone'] },
  { code: '*110*5#', description: 'Telecel Cash - Cash Out', category: 'Mobile Money', carrier: 'Telecel', keywords: ['cash out', 'withdraw', 'telecel', 'vodafone'] },
  // Mobile Money — AirtelTigo (5)
  { code: '*500#', description: 'AirtelTigo Money Main Menu', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['airteltigo', 'money', 'menu', 'main'] },
  { code: '*500*1#', description: 'AirtelTigo Money - Transfer Money', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['transfer', 'send', 'airteltigo'] },
  { code: '*500*2#', description: 'AirtelTigo Money - Buy Airtime', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['airtime', 'buy', 'airteltigo'] },
  { code: '*500*3#', description: 'AirtelTigo Money - Check Balance', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['balance', 'check', 'airteltigo'] },
  { code: '*500*4#', description: 'AirtelTigo Money - Cash Out', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['cash out', 'withdraw', 'airteltigo'] },
  // Banking (18)
  { code: '*422#', description: 'GCB Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['gcb', 'bank', 'mobile', 'banking'] },
  { code: '*422*1#', description: 'GCB Bank - Check Balance', category: 'Banking', carrier: 'Bank', keywords: ['gcb', 'balance', 'check'] },
  { code: '*422*2#', description: 'GCB Bank - Mini Statement', category: 'Banking', carrier: 'Bank', keywords: ['gcb', 'statement', 'mini', 'history'] },
  { code: '*326#', description: 'Ecobank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['ecobank', 'mobile', 'banking'] },
  { code: '*326*1#', description: 'Ecobank - Check Balance', category: 'Banking', carrier: 'Bank', keywords: ['ecobank', 'balance', 'check'] },
  { code: '*380#', description: 'Fidelity Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['fidelity', 'bank', 'mobile', 'banking'] },
  { code: '*380*1#', description: 'Fidelity Bank - Balance Enquiry', category: 'Banking', carrier: 'Bank', keywords: ['fidelity', 'balance', 'enquiry'] },
  { code: '*222#', description: 'Stanbic Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['stanbic', 'bank', 'mobile', 'banking'] },
  { code: '*771#', description: 'CalBank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['calbank', 'cal', 'bank', 'mobile'] },
  { code: '*919#', description: 'UBA Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['uba', 'bank', 'mobile', 'banking'] },
  { code: '*901#', description: 'Access Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['access', 'bank', 'mobile', 'banking'] },
  { code: '*389#', description: 'Absa Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['absa', 'barclays', 'bank', 'mobile'] },
  { code: '*966#', description: 'Zenith Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['zenith', 'bank', 'mobile', 'banking'] },
  { code: '*444#', description: 'Republic Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['republic', 'bank', 'mobile', 'banking'] },
  { code: '*945#', description: 'Standard Chartered Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['standard', 'chartered', 'bank', 'mobile'] },
  { code: '*985#', description: 'Societe Generale Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['societe', 'generale', 'sg', 'bank'] },
  { code: '*733#', description: 'ADB (Agricultural Development Bank)', category: 'Banking', carrier: 'Bank', keywords: ['adb', 'agricultural', 'development', 'bank'] },
  { code: '*585#', description: 'Prudential Bank Mobile Banking', category: 'Banking', carrier: 'Bank', keywords: ['prudential', 'bank', 'mobile'] },
  // Utilities (12)
  { code: '*711#', description: 'ECG Prepaid - Buy Electricity', category: 'Utilities', carrier: 'Utility', keywords: ['ecg', 'electricity', 'prepaid', 'power', 'light'] },
  { code: '*226#', description: 'ECG Postpaid - Pay Bill', category: 'Utilities', carrier: 'Utility', keywords: ['ecg', 'postpaid', 'bill', 'electricity', 'power'] },
  { code: '*200#', description: 'Ghana Water Company', category: 'Utilities', carrier: 'Utility', keywords: ['water', 'ghana', 'company', 'bill'] },
  { code: '*124#', description: 'MTN Airtime Balance Check', category: 'Utilities', carrier: 'MTN', keywords: ['mtn', 'balance', 'airtime', 'check'] },
  { code: '*124*3#', description: 'MTN Data Balance Check', category: 'Utilities', carrier: 'MTN', keywords: ['mtn', 'data', 'balance', 'internet'] },
  { code: '*124*1#', description: 'MTN SMS Bundle Balance', category: 'Utilities', carrier: 'MTN', keywords: ['mtn', 'sms', 'bundle', 'balance'] },
  { code: '*700#', description: 'Telecel (Vodafone) Balance Check', category: 'Utilities', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'balance', 'airtime'] },
  { code: '*124*5#', description: 'AirtelTigo Airtime Balance', category: 'Utilities', carrier: 'AirtelTigo', keywords: ['airteltigo', 'balance', 'airtime'] },
  { code: '*571#', description: 'DSTV Subscription Payment', category: 'Utilities', carrier: 'General', keywords: ['dstv', 'subscription', 'tv', 'multichoice'] },
  { code: '*887#', description: 'GOtv Subscription Payment', category: 'Utilities', carrier: 'General', keywords: ['gotv', 'subscription', 'tv'] },
  { code: '*713#', description: 'NEDCo Prepaid - Northern Electricity', category: 'Utilities', carrier: 'Utility', keywords: ['nedco', 'northern', 'electricity', 'prepaid'] },
  { code: '*311#', description: 'Ghana Post GPS - Digital Address', category: 'Utilities', carrier: 'General', keywords: ['ghana post', 'gps', 'digital', 'address'] },
  // Government (12)
  { code: '*929#', description: 'NHIS - National Health Insurance Renewal', category: 'Government', carrier: 'Government', keywords: ['nhis', 'health', 'insurance', 'renewal', 'national'] },
  { code: '*929*1#', description: 'NHIS - Check Membership Status', category: 'Government', carrier: 'Government', keywords: ['nhis', 'membership', 'status', 'check'] },
  { code: '*929*2#', description: 'NHIS - Renew Policy', category: 'Government', carrier: 'Government', keywords: ['nhis', 'renew', 'policy'] },
  { code: '*425#', description: 'Ghana Card (NIA) - Check Status', category: 'Government', carrier: 'Government', keywords: ['ghana card', 'nia', 'national', 'identity', 'status'] },
  { code: '*352#', description: 'SSNIT - Social Security Enquiry', category: 'Government', carrier: 'Government', keywords: ['ssnit', 'social', 'security', 'pension', 'enquiry'] },
  { code: '*222*1#', description: 'SSNIT - Check Contributions', category: 'Government', carrier: 'Government', keywords: ['ssnit', 'contributions', 'check', 'pension'] },
  { code: '*214#', description: 'GRA - Ghana Revenue Authority', category: 'Government', carrier: 'Government', keywords: ['gra', 'tax', 'revenue', 'authority', 'ghana'] },
  { code: '*214*1#', description: 'GRA - TIN (Tax ID) Verification', category: 'Government', carrier: 'Government', keywords: ['gra', 'tin', 'tax', 'id', 'verification'] },
  { code: '*713*1#', description: 'DVLA - Driver License Check', category: 'Government', carrier: 'Government', keywords: ['dvla', 'driver', 'license', 'check'] },
  { code: '*460#', description: 'Passport Application Status', category: 'Government', carrier: 'Government', keywords: ['passport', 'application', 'status', 'foreign affairs'] },
  { code: '*889#', description: 'Electoral Commission - Voter Status', category: 'Government', carrier: 'Government', keywords: ['ec', 'electoral', 'voter', 'election', 'registration'] },
  { code: '*455#', description: 'Birth & Death Registry', category: 'Government', carrier: 'Government', keywords: ['birth', 'death', 'registry', 'certificate'] },
  // Telecom — MTN (11)
  { code: '*100#', description: 'MTN Airtime Recharge (Load Credit)', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'airtime', 'recharge', 'load', 'credit'] },
  { code: '*138#', description: 'MTN Data Bundle Purchase', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'data', 'bundle', 'internet', 'buy'] },
  { code: '*138*1#', description: 'MTN Data - Pay As You Go', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'data', 'payg', 'pay as you go'] },
  { code: '*138*2#', description: 'MTN Data - Daily/Weekly Bundles', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'data', 'daily', 'weekly', 'bundle'] },
  { code: '*138*3#', description: 'MTN Data - Monthly Bundles', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'data', 'monthly', 'bundle'] },
  { code: '*567#', description: 'MTN Caller Tunes (Ring Back Tone)', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'caller', 'tunes', 'ring', 'tone'] },
  { code: '*156#', description: 'MTN Own Number Check', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'own', 'number', 'check', 'my number'] },
  { code: '*400#', description: 'MTN Call Forwarding', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'call', 'forwarding', 'divert'] },
  { code: '*5050#', description: 'MTN SIM Registration Status', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'sim', 'registration', 'status'] },
  { code: '*550#', description: 'MTN Extra Time (Borrow Airtime)', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'borrow', 'airtime', 'extra time', 'credit'] },
  { code: '*585*0#', description: 'MTN Share Airtime', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'share', 'airtime', 'me2u'] },
  // Telecom — Telecel (5)
  { code: '*134#', description: 'Telecel (Vodafone) Airtime Balance', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'balance', 'airtime'] },
  { code: '*127#', description: 'Telecel Data Bundle Purchase', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'data', 'bundle', 'internet'] },
  { code: '*455*1#', description: 'Telecel Own Number Check', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'own', 'number', 'check'] },
  { code: '*151#', description: 'Telecel SIM Registration Status', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'sim', 'registration', 'status'] },
  { code: '*100*0#', description: 'Telecel Airtime Recharge', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'recharge', 'airtime', 'load'] },
  // Telecom — AirtelTigo (6)
  { code: '*100*1#', description: 'AirtelTigo Balance Check', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'balance', 'check', 'airtime'] },
  { code: '*141#', description: 'AirtelTigo Data Bundle Purchase', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'data', 'bundle', 'internet'] },
  { code: '*130#', description: 'AirtelTigo Borrow Airtime', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'borrow', 'airtime', 'credit'] },
  { code: '*5050*0#', description: 'AirtelTigo SIM Registration', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'sim', 'registration', 'status'] },
  { code: '*567*0#', description: 'AirtelTigo Caller Tunes', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'caller', 'tunes', 'ring'] },
  { code: '*100*2#', description: 'AirtelTigo Airtime Recharge', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'recharge', 'airtime', 'load'] },
  // Insurance (8)
  { code: '*770#', description: 'Enterprise Life Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['enterprise', 'life', 'insurance', 'policy'] },
  { code: '*770*1#', description: 'Enterprise Life - Check Policy', category: 'Insurance', carrier: 'Insurance', keywords: ['enterprise', 'policy', 'check', 'status'] },
  { code: '*787#', description: 'Star Life Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['star', 'life', 'insurance', 'policy'] },
  { code: '*787*1#', description: 'Star Life - Premium Payment', category: 'Insurance', carrier: 'Insurance', keywords: ['star', 'life', 'premium', 'payment'] },
  { code: '*920#', description: 'GLICO Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['glico', 'insurance', 'policy'] },
  { code: '*363#', description: 'SIC Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['sic', 'insurance', 'state', 'policy'] },
  { code: '*455*2#', description: 'Motor Insurance Database Check', category: 'Insurance', carrier: 'Insurance', keywords: ['motor', 'vehicle', 'insurance', 'database', 'mid'] },
  { code: '*778#', description: 'Hollard Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['hollard', 'insurance', 'policy'] },
];

// ── Helpers ──────────────────────────────────────────────────────────

function showToast(message: string): void {
  const existing = document.querySelector('.ussd-toast');
  if (existing) existing.remove();

  const toast = h('div', {
    className: 'ussd-toast',
    style: {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,46,0.95)',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '999',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
    },
  }, message);

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function fuzzyMatch(query: string, code: USSDCode): boolean {
  const q = query.toLowerCase();
  if (code.code.toLowerCase().includes(q)) return true;
  if (code.description.toLowerCase().includes(q)) return true;
  if (code.carrier.toLowerCase().includes(q)) return true;
  return code.keywords.some(kw => kw.includes(q));
}

// ── Page Renderer ───────────────────────────────────────────────────

export function renderUSSDPage(container: HTMLElement): void {
  let activeCategory: USSDCategory = 'All';
  let searchQuery = '';

  const page = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      animation: 'fadeIn 0.35s ease-out',
    },
  });

  // ── Header ──
  const header = h('div', {
    style: {
      padding: '20px 20px 0',
      paddingTop: 'calc(env(safe-area-inset-top, 20px) + 16px)',
    },
  },
    h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      },
    },
      h('button', {
        style: {
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '8px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
        },
        onClick: () => navigate('/'),
      }, '\u2190'),
      h('div', {},
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 5vw, 24px)',
            fontWeight: '700',
            letterSpacing: '-0.01em',
          },
        }, 'USSD Codes'),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3vw, 13px)',
            color: 'var(--text-tertiary)',
          },
        }, `${ghanaUSSDCodes.length} Ghana service codes`),
      ),
    ),
  );

  // ── Search Bar ──
  const searchInput = h('input', {
    type: 'text',
    placeholder: 'Search codes, services, banks...',
    style: {
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '12px 16px 12px 40px',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      color: 'var(--text-primary)',
      outline: 'none',
      transition: 'border-color 0.2s ease',
    },
  }) as HTMLInputElement;

  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = 'var(--gold)'; });
  searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'var(--border)'; });
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderList();
  });

  const searchWrapper = h('div', {
    style: {
      position: 'relative',
      margin: '0 20px 12px',
    },
  },
    h('span', {
      style: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '16px',
        color: 'var(--text-tertiary)',
        pointerEvents: 'none',
      },
    }, '\uD83D\uDD0D'),
    searchInput,
  );

  // ── Category Tabs ──
  const tabsRow = h('div', {
    style: {
      display: 'flex',
      gap: '6px',
      padding: '0 20px 12px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
      flexShrink: '0',
    },
  });

  const tabButtons: HTMLElement[] = [];

  function renderTabs() {
    tabsRow.innerHTML = '';
    tabButtons.length = 0;
    for (const cat of CATEGORIES) {
      const isActive = cat === activeCategory;
      const color = cat === 'All' ? '#D4A017' : (CATEGORY_COLORS[cat] || '#D4A017');
      const btn = h('button', {
        style: {
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          background: isActive ? `${color}20` : 'var(--surface)',
          color: isActive ? color : 'var(--text-secondary)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          fontWeight: '700',
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: '0',
          transition: 'all 0.15s ease',
          outline: isActive ? `1.5px solid ${color}` : 'none',
        },
        onClick: () => {
          activeCategory = cat;
          renderTabs();
          renderList();
        },
      }, cat);
      tabButtons.push(btn);
      tabsRow.appendChild(btn);
    }
  }

  // ── List Container ──
  const listContainer = h('div', {
    style: {
      padding: '0 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
  });

  function renderList() {
    listContainer.innerHTML = '';

    let filtered = ghanaUSSDCodes;

    // Filter by category
    if (activeCategory !== 'All') {
      filtered = filtered.filter(c => c.category === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(c => fuzzyMatch(searchQuery, c));
    }

    if (filtered.length === 0) {
      listContainer.appendChild(
        h('div', {
          style: {
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
          },
        },
          h('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '\uD83D\uDD0D'),
          'No codes found',
        ),
      );
      return;
    }

    // Count label
    listContainer.appendChild(
      h('div', {
        style: {
          fontSize: 'clamp(10px, 2.6vw, 11px)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-body)',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '4px',
        },
      }, `${filtered.length} code${filtered.length !== 1 ? 's' : ''}`),
    );

    for (const code of filtered) {
      const carrierColor = CARRIER_COLORS[code.carrier] || '#6B7280';

      const card = h('button', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--surface)',
          borderRadius: '14px',
          padding: '14px 16px',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          width: '100%',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          WebkitTapHighlightColor: 'transparent',
        },
        onClick: () => {
          navigator.clipboard?.writeText(code.code).then(() => {
            showToast(`Copied ${code.code}`);
          }).catch(() => {
            showToast(code.code);
          });
        },
      },
        // Code badge
        h('div', {
          style: {
            minWidth: '72px',
            padding: '6px 10px',
            borderRadius: '10px',
            background: 'rgba(212,160,23,0.08)',
            textAlign: 'center',
            flexShrink: '0',
          },
        },
          h('div', {
            style: {
              fontFamily: 'monospace',
              fontSize: 'clamp(14px, 3.6vw, 16px)',
              fontWeight: '800',
              color: '#D4A017',
              lineHeight: '1.2',
            },
          }, code.code),
        ),
        // Info
        h('div', {
          style: {
            flex: '1',
            minWidth: '0',
          },
        },
          h('div', {
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(13px, 3.2vw, 14px)',
              fontWeight: '500',
              lineHeight: '1.3',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, code.description),
          h('span', {
            style: {
              display: 'inline-block',
              fontSize: 'clamp(9px, 2.4vw, 10px)',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '99px',
              color: carrierColor,
              background: `${carrierColor}18`,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            },
          }, code.carrier),
        ),
        // Copy icon
        h('div', {
          style: {
            fontSize: '16px',
            color: 'var(--text-tertiary)',
            flexShrink: '0',
          },
        }, '\uD83D\uDCCB'),
      );

      card.addEventListener('pointerdown', () => { card.style.transform = 'scale(0.97)'; });
      card.addEventListener('pointerup', () => { card.style.transform = 'scale(1)'; });
      card.addEventListener('pointerleave', () => { card.style.transform = 'scale(1)'; });

      listContainer.appendChild(card);
    }
  }

  // ── Assemble ──
  page.appendChild(header);
  page.appendChild(searchWrapper);
  page.appendChild(tabsRow);
  page.appendChild(listContainer);

  renderTabs();
  renderList();

  render(container, page);
}
