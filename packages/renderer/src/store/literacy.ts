import { create } from 'zustand';
import { useNavigationStore } from './navigation';
import { useTabsStore } from './tabs';

export type LiteracyTab = 'explainer' | 'formguide' | 'phishing';

export type RiskLevel = 'safe' | 'caution' | 'warning';

export interface PageAnalysis {
  url: string;
  title: string;
  isSecure: boolean;
  isGovSite: boolean;
  riskLevel: RiskLevel;
  explanation: {
    whatIs: string;
    isSafe: string;
    whatCanDo: string;
  };
  govBadge?: string;
}

/** Pre-built explanations for common Ghana government sites */
const GOV_SITE_EXPLANATIONS: Record<string, { whatIs: string; isSafe: string; whatCanDo: string; badge: string }> = {
  'ghana.gov.gh': {
    whatIs: 'This is the official portal of the Government of Ghana. It provides access to all government services, information, and digital payments for citizens and civil servants.',
    isSafe: 'This is a verified official government website. Your connection is secure and your data is protected by government cybersecurity protocols.',
    whatCanDo: 'You can access government services, make payments for permits and licenses, find ministry contacts, and read official announcements.',
    badge: 'Official Government Portal',
  },
  'gra.gov.gh': {
    whatIs: 'This is the Ghana Revenue Authority (GRA) website. It handles tax administration, customs operations, and revenue collection for the Government of Ghana.',
    isSafe: 'This is a verified official government website operated by the Ghana Revenue Authority. Your tax information is handled securely.',
    whatCanDo: 'You can file tax returns, check your TIN status, make tax payments, access taxpayer services, and download tax forms.',
    badge: 'Ghana Revenue Authority',
  },
  'ssnit.org.gh': {
    whatIs: 'This is the Social Security and National Insurance Trust (SSNIT) website. It manages the national pension scheme for workers in Ghana.',
    isSafe: 'This is the official SSNIT website. Your pension and social security information is handled with strict confidentiality.',
    whatCanDo: 'You can check your pension contributions, register for SSNIT, view your statement, apply for benefits, and update your personal information.',
    badge: 'Social Security & National Insurance Trust',
  },
  'nhis.gov.gh': {
    whatIs: 'This is the National Health Insurance Scheme (NHIS) website. It provides health insurance coverage to residents of Ghana.',
    isSafe: 'This is a verified official government health website. Your health insurance data is protected.',
    whatCanDo: 'You can register for NHIS, renew your membership, check your status, find accredited health facilities, and make premium payments.',
    badge: 'National Health Insurance Scheme',
  },
  'cagd.gov.gh': {
    whatIs: 'This is the Controller and Accountant General\'s Department (CAGD) website. It manages government payroll, accounting, and financial reporting.',
    isSafe: 'This is a verified official government financial website. Payroll and accounting data is handled securely.',
    whatCanDo: 'You can access payslip information, check salary details, view financial reports, and access government accounting services.',
    badge: 'Controller & Accountant General\'s Department',
  },
};

/** Suspicious URL patterns that may indicate phishing */
const SUSPICIOUS_PATTERNS = [
  /g0v\.gh/i,       // Zero instead of 'o'
  /gov-gh\./i,      // Hyphenated fake domain
  /govgh\./i,       // Missing dot
  /gov\.gh\./i,     // Extra dot after .gh
  /login.*\.xyz/i,  // Login on sketchy TLD
  /secure.*\.tk/i,  // 'Secure' on free TLD
  /\.ru\//i,        // Russian TLD
  /\.cn\//i,        // Chinese TLD
  /bit\.ly/i,       // URL shortener
  /tinyurl/i,       // URL shortener
  /@/,              // @ sign in URL (credential injection)
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // Raw IP address
];

interface LiteracyState {
  activeTab: LiteracyTab;
  pageAnalysis: PageAnalysis | null;
  setActiveTab: (tab: LiteracyTab) => void;
  analyzePage: () => void;
}

export const useLiteracyStore = create<LiteracyState>((set) => ({
  activeTab: 'explainer',
  pageAnalysis: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  analyzePage: () => {
    const { currentUrl, isSecure } = useNavigationStore.getState();
    const { tabs, activeTabId } = useTabsStore.getState();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const title = activeTab?.title || 'Unknown Page';

    if (!currentUrl || currentUrl.startsWith('os-browser://')) {
      set({
        pageAnalysis: {
          url: currentUrl || '',
          title,
          isSecure: true,
          isGovSite: false,
          riskLevel: 'safe',
          explanation: {
            whatIs: 'This is a built-in OS Browser page. It is part of your browser application.',
            isSafe: 'This page runs locally on your computer and is completely safe.',
            whatCanDo: 'You can use the features provided on this page as part of your browser.',
          },
        },
      });
      return;
    }

    let hostname = '';
    try {
      hostname = new URL(currentUrl).hostname.toLowerCase();
    } catch {
      hostname = currentUrl;
    }

    // Check if it's a known .gov.gh site
    const isGovGh = hostname.endsWith('.gov.gh') || hostname.endsWith('.mil.gh') || hostname.endsWith('.edu.gh');
    const isKnownGovSite = Object.keys(GOV_SITE_EXPLANATIONS).some((domain) => hostname.includes(domain));

    // Check for suspicious patterns
    const hasSuspiciousPatterns = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(currentUrl));

    // Determine risk level
    let riskLevel: RiskLevel = 'caution';
    if (isGovGh && isSecure && !hasSuspiciousPatterns) {
      riskLevel = 'safe';
    } else if (isSecure && !hasSuspiciousPatterns) {
      riskLevel = 'caution';
    } else if (hasSuspiciousPatterns || !isSecure) {
      riskLevel = 'warning';
    }

    // Build explanation
    const matchedDomain = Object.keys(GOV_SITE_EXPLANATIONS).find((domain) => hostname.includes(domain));
    const knownExplanation = matchedDomain ? GOV_SITE_EXPLANATIONS[matchedDomain] : null;

    const explanation = knownExplanation
      ? {
          whatIs: knownExplanation.whatIs,
          isSafe: knownExplanation.isSafe,
          whatCanDo: knownExplanation.whatCanDo,
        }
      : {
          whatIs: `This is a webpage at ${hostname}. ${isGovGh ? 'It appears to be an official Ghana government website.' : 'It is not a government website.'}`,
          isSafe: isSecure
            ? hasSuspiciousPatterns
              ? 'This site uses HTTPS but has some suspicious URL patterns. Please verify the URL carefully before entering any personal information.'
              : 'This site uses HTTPS encryption, which means your connection is secured. However, always verify you are on the correct website.'
            : 'WARNING: This site does NOT use HTTPS. Your connection is not encrypted. Do not enter passwords or personal information on this page.',
          whatCanDo: 'Review the page content carefully. If you are unsure about this website, ask a colleague or your IT department for guidance.',
        };

    set({
      pageAnalysis: {
        url: currentUrl,
        title,
        isSecure,
        isGovSite: isGovGh,
        riskLevel,
        explanation,
        govBadge: knownExplanation?.badge,
      },
    });
  },
}));
