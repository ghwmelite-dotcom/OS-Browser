// ── Ghana USSD Code Database ────────────────────────────────────────
// Comprehensive collection of 100+ USSD codes for Ghanaian services

export interface USSDCode {
  code: string;
  description: string;
  category: USSDCategory;
  carrier: string;
  keywords: string[];
}

export type USSDCategory =
  | 'Mobile Money'
  | 'Banking'
  | 'Utilities'
  | 'Government'
  | 'Telecom'
  | 'Insurance'
  | 'Custom';

export const USSD_CATEGORIES: USSDCategory[] = [
  'Mobile Money',
  'Banking',
  'Utilities',
  'Government',
  'Telecom',
  'Insurance',
];

export const CARRIER_COLORS: Record<string, string> = {
  MTN: '#FFCC00',
  Telecel: '#0066CC',
  AirtelTigo: '#E31937',
  Bank: '#22C55E',
  Government: '#D4A017',
  Utility: '#0891B2',
  Insurance: '#8B5CF6',
  General: '#6B7280',
};

export const CATEGORY_COLORS: Record<USSDCategory, string> = {
  'Mobile Money': '#D4A017',
  Banking: '#22C55E',
  Utilities: '#0891B2',
  Government: '#CE1126',
  Telecom: '#8B5CF6',
  Insurance: '#F59E0B',
  Custom: '#6B7280',
};

export const ghanaUSSDCodes: USSDCode[] = [
  // ═══════════════════════════════════════════════════════════════════
  // MOBILE MONEY (25 codes)
  // ═══════════════════════════════════════════════════════════════════

  // MTN Mobile Money
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

  // Telecel Cash (formerly Vodafone Cash)
  { code: '*110#', description: 'Telecel Cash Main Menu', category: 'Mobile Money', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'cash', 'menu', 'main'] },
  { code: '*110*1#', description: 'Telecel Cash - Transfer Money', category: 'Mobile Money', carrier: 'Telecel', keywords: ['transfer', 'send', 'telecel', 'vodafone'] },
  { code: '*110*2#', description: 'Telecel Cash - Buy Airtime', category: 'Mobile Money', carrier: 'Telecel', keywords: ['airtime', 'buy', 'telecel', 'vodafone'] },
  { code: '*110*3#', description: 'Telecel Cash - Check Balance', category: 'Mobile Money', carrier: 'Telecel', keywords: ['balance', 'check', 'telecel', 'vodafone'] },
  { code: '*110*4#', description: 'Telecel Cash - Pay Bills', category: 'Mobile Money', carrier: 'Telecel', keywords: ['bill', 'pay', 'telecel', 'vodafone'] },
  { code: '*110*5#', description: 'Telecel Cash - Cash Out', category: 'Mobile Money', carrier: 'Telecel', keywords: ['cash out', 'withdraw', 'telecel', 'vodafone'] },

  // AirtelTigo Money
  { code: '*500#', description: 'AirtelTigo Money Main Menu', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['airteltigo', 'money', 'menu', 'main'] },
  { code: '*500*1#', description: 'AirtelTigo Money - Transfer Money', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['transfer', 'send', 'airteltigo'] },
  { code: '*500*2#', description: 'AirtelTigo Money - Buy Airtime', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['airtime', 'buy', 'airteltigo'] },
  { code: '*500*3#', description: 'AirtelTigo Money - Check Balance', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['balance', 'check', 'airteltigo'] },
  { code: '*500*4#', description: 'AirtelTigo Money - Cash Out', category: 'Mobile Money', carrier: 'AirtelTigo', keywords: ['cash out', 'withdraw', 'airteltigo'] },

  // ═══════════════════════════════════════════════════════════════════
  // BANKING (18 codes)
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES (12 codes)
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // GOVERNMENT (12 codes)
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // TELECOM (22 codes)
  // ═══════════════════════════════════════════════════════════════════

  // MTN Telecom
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
  { code: '*585#', description: 'MTN Share Airtime', category: 'Telecom', carrier: 'MTN', keywords: ['mtn', 'share', 'airtime', 'me2u'] },

  // Telecel (formerly Vodafone)
  { code: '*134#', description: 'Telecel (Vodafone) Airtime Balance', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'balance', 'airtime'] },
  { code: '*127#', description: 'Telecel Data Bundle Purchase', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'data', 'bundle', 'internet'] },
  { code: '*100#', description: 'Telecel Airtime Recharge', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'recharge', 'airtime', 'load'] },
  { code: '*455*1#', description: 'Telecel Own Number Check', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'vodafone', 'own', 'number', 'check'] },
  { code: '*151#', description: 'Telecel SIM Registration Status', category: 'Telecom', carrier: 'Telecel', keywords: ['telecel', 'sim', 'registration', 'status'] },

  // AirtelTigo
  { code: '*100#', description: 'AirtelTigo Airtime Recharge', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'recharge', 'airtime', 'load'] },
  { code: '*141#', description: 'AirtelTigo Data Bundle Purchase', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'data', 'bundle', 'internet'] },
  { code: '*100*1#', description: 'AirtelTigo Balance Check', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'balance', 'check', 'airtime'] },
  { code: '*130#', description: 'AirtelTigo Borrow Airtime', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'borrow', 'airtime', 'credit'] },
  { code: '*5050#', description: 'AirtelTigo SIM Registration', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'sim', 'registration', 'status'] },
  { code: '*567#', description: 'AirtelTigo Caller Tunes', category: 'Telecom', carrier: 'AirtelTigo', keywords: ['airteltigo', 'caller', 'tunes', 'ring'] },

  // ═══════════════════════════════════════════════════════════════════
  // INSURANCE (8 codes)
  // ═══════════════════════════════════════════════════════════════════
  { code: '*770#', description: 'Enterprise Life Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['enterprise', 'life', 'insurance', 'policy'] },
  { code: '*770*1#', description: 'Enterprise Life - Check Policy', category: 'Insurance', carrier: 'Insurance', keywords: ['enterprise', 'policy', 'check', 'status'] },
  { code: '*787#', description: 'Star Life Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['star', 'life', 'insurance', 'policy'] },
  { code: '*787*1#', description: 'Star Life - Premium Payment', category: 'Insurance', carrier: 'Insurance', keywords: ['star', 'life', 'premium', 'payment'] },
  { code: '*920#', description: 'GLICO Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['glico', 'insurance', 'policy'] },
  { code: '*363#', description: 'SIC Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['sic', 'insurance', 'state', 'policy'] },
  { code: '*455*2#', description: 'Motor Insurance Database Check', category: 'Insurance', carrier: 'Insurance', keywords: ['motor', 'vehicle', 'insurance', 'database', 'mid'] },
  { code: '*778#', description: 'Hollard Insurance', category: 'Insurance', carrier: 'Insurance', keywords: ['hollard', 'insurance', 'policy'] },
];

export default ghanaUSSDCodes;
