import { create } from 'zustand';

interface GovService {
  id: string;
  name: string;
  shortName: string;
  description: string;
  url: string;
  category: string;
  requiresAuth: boolean;
  ministry?: string;
  tags: string[];
  isPinned: boolean;
  visitCount: number;
  lastVisited: number | null;
  health: 'online' | 'slow' | 'down' | 'unknown';
}

interface GovHubState {
  services: GovService[];
  searchQuery: string;
  selectedCategory: string | null;

  loadServices: () => void;
  togglePin: (id: string) => void;
  recordVisit: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setCategory: (cat: string | null) => void;
}

const DEFAULT_SERVICES: Omit<GovService, 'isPinned' | 'visitCount' | 'lastVisited' | 'health'>[] = [
  { id: 'ghana-gov', name: 'Ghana.gov', shortName: 'Ghana.gov', description: 'Official Government of Ghana portal for payments and services', url: 'https://ghana.gov.gh', category: 'General', requiresAuth: false, ministry: 'Office of the President', tags: ['payments', 'services', 'portal'] },
  { id: 'gifmis', name: 'GIFMIS', shortName: 'GIFMIS', description: 'Ghana Integrated Financial Management Information System', url: 'https://gifmis.finance.gov.gh', category: 'Finance', requiresAuth: true, ministry: 'Ministry of Finance', tags: ['finance', 'budget', 'accounting'] },
  { id: 'cagd', name: 'CAGD Payroll', shortName: 'CAGD', description: "Controller and Accountant General's Department — Payroll services", url: 'https://cagd.gov.gh', category: 'Finance', requiresAuth: true, ministry: 'Ministry of Finance', tags: ['payroll', 'salary', 'payment'] },
  { id: 'gra', name: 'Ghana Revenue Authority', shortName: 'GRA', description: 'Tax filing, TIN registration, and revenue services', url: 'https://gra.gov.gh', category: 'Finance', requiresAuth: true, tags: ['tax', 'revenue', 'TIN'] },
  { id: 'ssnit', name: 'SSNIT', shortName: 'SSNIT', description: 'Social Security and National Insurance Trust — Pensions and benefits', url: 'https://ssnit.org.gh', category: 'Finance', requiresAuth: true, tags: ['pension', 'social security', 'insurance'] },
  { id: 'ohcs', name: 'OHCS Platform', shortName: 'OHCS', description: 'Office of the Head of Civil Service — HR and administration', url: 'https://ohcs.gov.gh', category: 'HR', requiresAuth: false, ministry: 'OHCS', tags: ['civil service', 'HR', 'administration'] },
  { id: 'espar', name: 'E-SPAR Portal', shortName: 'E-SPAR', description: 'Staff Performance Appraisal and Review system', url: 'https://ohcsgh.web.app', category: 'HR', requiresAuth: true, ministry: 'OHCS', tags: ['appraisal', 'performance', 'review'] },
  { id: 'psc', name: 'Public Services Commission', shortName: 'PSC', description: 'Recruitment, promotions, and public service regulation', url: 'https://psc.gov.gh', category: 'HR', requiresAuth: false, tags: ['recruitment', 'promotion', 'regulation'] },
  { id: 'ghs', name: 'Ghana Health Service', shortName: 'GHS', description: 'Health service delivery and management', url: 'https://ghs.gov.gh', category: 'Health', requiresAuth: false, ministry: 'Ministry of Health', tags: ['health', 'hospitals', 'medical'] },
  { id: 'nhia', name: 'NHIA', shortName: 'NHIA', description: 'National Health Insurance Authority — Registration and claims', url: 'https://nhis.gov.gh', category: 'Health', requiresAuth: true, tags: ['insurance', 'health', 'NHIS'] },
  { id: 'mof', name: 'Ministry of Finance', shortName: 'MOF', description: 'Budget, economic policy, and financial management', url: 'https://mofep.gov.gh', category: 'Finance', requiresAuth: false, ministry: 'Ministry of Finance', tags: ['budget', 'economy', 'policy'] },
  { id: 'nia', name: 'National Identification Authority', shortName: 'NIA', description: 'GhanaCard registration and services', url: 'https://nia.gov.gh', category: 'Identity', requiresAuth: false, tags: ['GhanaCard', 'national ID', 'identity'] },
  { id: 'rgd', name: 'Registrar General', shortName: 'RGD', description: 'Business registration, marriage certificates, and records', url: 'https://rgd.gov.gh', category: 'Legal', requiresAuth: true, tags: ['business', 'registration', 'certificates'] },
  { id: 'lc', name: 'Lands Commission', shortName: 'LC', description: 'Land registration, title deeds, and property records', url: 'https://lc.gov.gh', category: 'Land', requiresAuth: true, tags: ['land', 'property', 'title'] },
  { id: 'ghanapost', name: 'GhanaPostGPS', shortName: 'GhanaPost', description: 'Digital addressing system for Ghana', url: 'https://ghanapostgps.com', category: 'Utilities', requiresAuth: false, tags: ['address', 'GPS', 'postal'] },
  { id: 'ecg', name: 'ECG', shortName: 'ECG', description: 'Electricity Company of Ghana — Bill payment and services', url: 'https://ecg.com.gh', category: 'Utilities', requiresAuth: true, tags: ['electricity', 'bills', 'power'] },
  { id: 'gwcl', name: 'GWCL', shortName: 'GWCL', description: 'Ghana Water Company — Water bills and services', url: 'https://gwcl.com.gh', category: 'Utilities', requiresAuth: true, tags: ['water', 'bills', 'utilities'] },
  { id: 'bog', name: 'Bank of Ghana', shortName: 'BOG', description: 'Central Bank — Monetary policy and financial regulation', url: 'https://bog.gov.gh', category: 'Finance', requiresAuth: false, tags: ['banking', 'monetary', 'regulation'] },
  { id: 'parliament', name: 'Parliament of Ghana', shortName: 'Parliament', description: 'Legislative assembly — Bills, Hansard, and committee reports', url: 'https://parliament.gh', category: 'General', requiresAuth: false, tags: ['parliament', 'legislation', 'bills'] },
  { id: 'judicial', name: 'Judicial Service', shortName: 'Courts', description: 'Court services, case tracking, and legal information', url: 'https://judicial.gov.gh', category: 'Legal', requiresAuth: false, tags: ['courts', 'judiciary', 'legal'] },
  { id: 'ppa', name: 'Public Procurement Authority', shortName: 'PPA', description: 'Government procurement and tender management', url: 'https://ppa.gov.gh', category: 'Procurement', requiresAuth: true, tags: ['procurement', 'tenders', 'contracts'] },
  { id: 'nca', name: 'National Communications Authority', shortName: 'NCA', description: 'Telecoms regulation and licensing', url: 'https://nca.org.gh', category: 'Communication', requiresAuth: false, tags: ['telecom', 'communications', 'regulation'] },
  { id: 'fda', name: 'Food and Drugs Authority', shortName: 'FDA', description: 'Safety regulation of food, drugs, and health products', url: 'https://fdaghana.gov.gh', category: 'Health', requiresAuth: false, tags: ['food', 'drugs', 'safety'] },
  { id: 'nadmo', name: 'NADMO', shortName: 'NADMO', description: 'National Disaster Management Organisation', url: 'https://nadmo.gov.gh', category: 'General', requiresAuth: false, tags: ['disaster', 'emergency', 'relief'] },
  { id: 'cocobod', name: 'COCOBOD', shortName: 'COCOBOD', description: 'Ghana Cocoa Board — Cocoa industry regulation', url: 'https://cocobod.gh', category: 'General', requiresAuth: false, tags: ['cocoa', 'agriculture', 'exports'] },
];

export const useGovHubStore = create<GovHubState>((set) => ({
  services: DEFAULT_SERVICES.map(s => ({
    ...s,
    isPinned: false,
    visitCount: 0,
    lastVisited: null,
    health: 'unknown' as const,
  })),
  searchQuery: '',
  selectedCategory: null,

  loadServices: () => {
    // Load pinned/visit data from settings in future
  },

  togglePin: (id) => set(s => ({
    services: s.services.map(svc =>
      svc.id === id ? { ...svc, isPinned: !svc.isPinned } : svc
    ),
  })),

  recordVisit: (id) => set(s => ({
    services: s.services.map(svc =>
      svc.id === id
        ? { ...svc, visitCount: svc.visitCount + 1, lastVisited: Date.now() }
        : svc
    ),
  })),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategory: (cat) => set({ selectedCategory: cat }),
}));
