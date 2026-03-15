import React, { useEffect, useState } from 'react';
import {
  Brain, X, BookOpen, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Lock, Unlock, Globe, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  FileText, HelpCircle, Flag, ExternalLink, Eye, ClipboardList,
} from 'lucide-react';
import { useLiteracyStore, type LiteracyTab, type RiskLevel } from '@/store/literacy';
import { useSidebarStore } from '@/store/sidebar';

/* ─────────────────────────────────────────────
   Form Guide Tutorial Data
   ───────────────────────────────────────────── */
interface FormGuide {
  id: string;
  icon: React.ReactNode;
  title: string;
  steps: string[];
}

const FORM_GUIDES: FormGuide[] = [
  {
    id: 'gra-tax',
    icon: <FileText size={18} style={{ color: '#CE1126' }} />,
    title: 'How to fill your GRA Tax Return',
    steps: [
      'Visit gra.gov.gh and click "Taxpayer Portal" in the top menu.',
      'Log in with your TIN (Taxpayer Identification Number) and password. If you do not have an account, click "Register" first.',
      'Select "File Returns" from the dashboard menu on the left side.',
      'Choose the correct tax period (year and month) from the dropdown.',
      'Enter your income details carefully in each field. Use your payslip or income records as reference.',
      'Review all entries, then click "Submit Return". Download or print the confirmation receipt for your records.',
    ],
  },
  {
    id: 'ssnit-reg',
    icon: <ClipboardList size={18} style={{ color: '#006B3F' }} />,
    title: 'SSNIT Registration Guide',
    steps: [
      'Go to ssnit.org.gh and click "Self-Service" or "Member Portal".',
      'Click "New Registration" and select your employment type (formal/informal sector).',
      'Fill in your personal details: full name (as on GhanaCard), date of birth, GhanaCard number, and contact information.',
      'Enter your employer details including company name and SSNIT employer number. Ask your HR department if unsure.',
      'Upload a passport-size photo and a copy of your GhanaCard.',
      'Submit the form and note your temporary SSNIT number. Your permanent number will be sent via SMS within 5 working days.',
    ],
  },
  {
    id: 'nhis-renewal',
    icon: <ShieldCheck size={18} style={{ color: '#D4A017' }} />,
    title: 'NHIS Renewal Steps',
    steps: [
      'Visit nhis.gov.gh or use the NHIS mobile app.',
      'Click "Renew Membership" and enter your NHIS membership number or GhanaCard number.',
      'Verify your personal details are correct. Update any changed information (phone number, address).',
      'Select your preferred payment method: Mobile Money (MTN, Vodafone, AirtelTigo), bank transfer, or premium deduction.',
      'Complete the payment and save your confirmation receipt. Your membership is renewed immediately upon successful payment.',
    ],
  },
  {
    id: 'espar',
    icon: <Eye size={18} style={{ color: '#6366f1' }} />,
    title: 'E-SPAR Performance Appraisal',
    steps: [
      'Access the E-SPAR system through your ministry or department portal, or visit the direct URL provided by your HR unit.',
      'Log in with your staff ID and password. Contact your HR unit if you have forgotten your credentials.',
      'Navigate to "Performance Appraisal" and select the current appraisal period.',
      'Complete your self-assessment for each Key Performance Area (KPA). Rate yourself honestly and provide evidence for each rating.',
      'Add your development goals and training needs for the next period.',
      'Submit for supervisor review. You will receive a notification when your supervisor has completed their assessment.',
    ],
  },
  {
    id: 'ghana-gov-payments',
    icon: <Globe size={18} style={{ color: '#CE1126' }} />,
    title: 'Ghana.gov.gh Payments',
    steps: [
      'Go to ghana.gov.gh and click "Services" in the top navigation.',
      'Browse or search for the specific service you need (e.g., passport application, business registration, birth certificate).',
      'Click on the service and follow the on-screen instructions to fill the required form.',
      'At the payment step, choose Mobile Money or bank card. Enter your payment details.',
      'After payment, download your receipt and save the transaction reference number. You will need this for follow-up.',
    ],
  },
];

/* ─────────────────────────────────────────────
   Phishing Red Flags
   ───────────────────────────────────────────── */
const PHISHING_RED_FLAGS = [
  {
    icon: <Globe size={14} />,
    text: 'Check the URL carefully \u2014 gov.gh vs g0v.gh',
    detail: 'Scammers replace letters with numbers that look similar. Always read the full URL.',
  },
  {
    icon: <Lock size={14} />,
    text: 'Government sites never ask for passwords via email',
    detail: 'If you receive an email asking you to click a link and enter your password, it is likely a scam.',
  },
  {
    icon: <ShieldCheck size={14} />,
    text: 'Look for the padlock icon in the address bar',
    detail: 'A padlock means the connection is encrypted. No padlock means the site may not be safe.',
  },
  {
    icon: <AlertTriangle size={14} />,
    text: "Don't click links in unexpected SMS messages",
    detail: 'Government agencies communicate through official channels. Be wary of unsolicited messages.',
  },
  {
    icon: <Flag size={14} />,
    text: 'Beware of urgent threats or too-good-to-be-true offers',
    detail: 'Phishing messages often create panic ("Your account will be closed!") or promise free money.',
  },
  {
    icon: <ExternalLink size={14} />,
    text: 'Hover over links before clicking to see the real URL',
    detail: 'The displayed text of a link can be different from where it actually takes you.',
  },
];

/* ─────────────────────────────────────────────
   Risk Level Helpers
   ───────────────────────────────────────────── */
function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '#006B3F';
    case 'caution': return '#D4A017';
    case 'warning': return '#CE1126';
  }
}

function getRiskBg(level: RiskLevel): string {
  switch (level) {
    case 'safe': return 'rgba(0, 107, 63, 0.08)';
    case 'caution': return 'rgba(212, 160, 23, 0.08)';
    case 'warning': return 'rgba(206, 17, 38, 0.08)';
  }
}

function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'safe': return 'Safe';
    case 'caution': return 'Caution';
    case 'warning': return 'Warning';
  }
}

function getRiskIcon(level: RiskLevel) {
  switch (level) {
    case 'safe': return <ShieldCheck size={20} />;
    case 'caution': return <ShieldAlert size={20} />;
    case 'warning': return <ShieldX size={20} />;
  }
}

/* ─────────────────────────────────────────────
   Sub Components
   ───────────────────────────────────────────── */

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-surface-2)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

/* ── Page Explainer Tab ── */
function PageExplainerTab() {
  const { pageAnalysis, analyzePage } = useLiteracyStore();

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        onClick={analyzePage}
        className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        <span className="flex items-center justify-center gap-2">
          <Eye size={16} />
          Explain This Page
        </span>
      </button>

      {pageAnalysis && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-300">
          {/* Page info card */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
          >
            <h4 className="text-[13px] font-bold text-text-primary mb-2 line-clamp-2">
              {pageAnalysis.title}
            </h4>
            <p className="text-[11px] text-text-muted break-all mb-3">{pageAnalysis.url}</p>

            {/* Security badge */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: getRiskBg(pageAnalysis.riskLevel), color: getRiskColor(pageAnalysis.riskLevel) }}
              >
                {pageAnalysis.isSecure ? <Lock size={12} /> : <Unlock size={12} />}
                {pageAnalysis.isSecure ? 'Secure Connection' : 'Not Secure'}
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: getRiskBg(pageAnalysis.riskLevel), color: getRiskColor(pageAnalysis.riskLevel) }}
              >
                {getRiskIcon(pageAnalysis.riskLevel)}
                {getRiskLabel(pageAnalysis.riskLevel)}
              </div>
            </div>
          </div>

          {/* Gov site badge */}
          {pageAnalysis.govBadge && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border"
              style={{ background: 'rgba(0, 107, 63, 0.06)', borderColor: 'rgba(0, 107, 63, 0.2)' }}
            >
              <ShieldCheck size={18} style={{ color: '#006B3F' }} />
              <div>
                <p className="text-[12px] font-bold" style={{ color: '#006B3F' }}>Official Government Site</p>
                <p className="text-[11px] text-text-muted">{pageAnalysis.govBadge}</p>
              </div>
            </div>
          )}

          {/* Non-gov warning */}
          {!pageAnalysis.isGovSite && !pageAnalysis.url.startsWith('os-browser://') && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border"
              style={{ background: 'rgba(212, 160, 23, 0.06)', borderColor: 'rgba(212, 160, 23, 0.2)' }}
            >
              <AlertTriangle size={18} style={{ color: '#D4A017' }} />
              <div>
                <p className="text-[12px] font-bold" style={{ color: '#D4A017' }}>Verify this site</p>
                <p className="text-[11px] text-text-muted">This is not a recognized government website. Verify before entering personal information.</p>
              </div>
            </div>
          )}

          {/* Explanation sections */}
          <ExplanationSection title="What is this page?" content={pageAnalysis.explanation.whatIs} icon={<HelpCircle size={14} />} />
          <ExplanationSection title="Is it safe?" content={pageAnalysis.explanation.isSafe} icon={<Shield size={14} />} />
          <ExplanationSection title="What can you do here?" content={pageAnalysis.explanation.whatCanDo} icon={<BookOpen size={14} />} />
        </div>
      )}

      {!pageAnalysis && (
        <div className="text-center py-8">
          <Globe size={40} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-[13px] text-text-muted">
            Click the button above to get a simplified explanation of the current page.
          </p>
          <p className="text-[11px] text-text-muted mt-2">
            Works best on government websites like ghana.gov.gh, gra.gov.gh, and ssnit.org.gh
          </p>
        </div>
      )}
    </div>
  );
}

function ExplanationSection({ title, content, icon }: { title: string; content: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-text-muted">{icon}</span>
        <h5 className="text-[12px] font-bold text-text-primary">{title}</h5>
      </div>
      <p className="text-[12px] text-text-secondary leading-relaxed">{content}</p>
    </div>
  );
}

/* ── Form Guide Tab ── */
function FormGuideTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleGuide = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div
        className="rounded-xl px-4 py-3 border"
        style={{ background: 'rgba(0, 107, 63, 0.04)', borderColor: 'rgba(0, 107, 63, 0.15)' }}
      >
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Step-by-step guides for filling common government forms online. Tap any card below to expand the instructions.
        </p>
      </div>

      {FORM_GUIDES.map((guide) => (
        <div
          key={guide.id}
          className="rounded-xl border overflow-hidden transition-all duration-200"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
        >
          {/* Card Header */}
          <button
            onClick={() => toggleGuide(guide.id)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-3/50 transition-colors duration-100"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-surface-3)' }}
            >
              {guide.icon}
            </div>
            <span className="flex-1 text-[13px] font-medium text-text-primary leading-tight">
              {guide.title}
            </span>
            {expandedId === guide.id ? (
              <ChevronUp size={16} className="text-text-muted shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-text-muted shrink-0" />
            )}
          </button>

          {/* Expandable Steps */}
          {expandedId === guide.id && (
            <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
              <ol className="flex flex-col gap-3 mt-3">
                {guide.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                      style={{ background: '#CE1126', color: '#fff' }}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-[12px] text-text-secondary leading-relaxed flex-1">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}

      {/* Ask Ozzy button */}
      <button
        onClick={() => {
          useSidebarStore.getState().openPanel('askozzy');
        }}
        className="w-full py-3 mt-1 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] border"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border-1)',
          color: 'var(--color-text-primary)',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <HelpCircle size={16} style={{ color: '#D4A017' }} />
          Need more help? Ask Ozzy
        </span>
      </button>
    </div>
  );
}

/* ── Phishing Detection Tab ── */
function PhishingDetectionTab() {
  const { pageAnalysis, analyzePage } = useLiteracyStore();

  useEffect(() => {
    if (!pageAnalysis) analyzePage();
  }, []);

  const analysis = pageAnalysis;

  // Compute detailed checks
  const url = analysis?.url || '';
  const isHttps = url.startsWith('https://') || url.startsWith('os-browser://');
  const isGovGh = (() => {
    try {
      return new URL(url).hostname.endsWith('.gov.gh');
    } catch {
      return false;
    }
  })();
  const hasSuspicious = (() => {
    const patterns = [/g0v\.gh/i, /gov-gh\./i, /govgh\./i, /gov\.gh\./i, /@/, /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/];
    return patterns.some((p) => p.test(url));
  })();

  const riskLevel = analysis?.riskLevel || (isHttps && !hasSuspicious ? 'caution' : 'warning');

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Traffic light rating */}
      <div
        className="rounded-xl p-5 border text-center"
        style={{ background: getRiskBg(riskLevel), borderColor: `${getRiskColor(riskLevel)}30` }}
      >
        <div className="flex justify-center mb-3" style={{ color: getRiskColor(riskLevel) }}>
          {getRiskIcon(riskLevel)}
        </div>
        <h4 className="text-[16px] font-bold mb-1" style={{ color: getRiskColor(riskLevel) }}>
          {getRiskLabel(riskLevel)}
        </h4>
        <p className="text-[12px] text-text-muted">
          {riskLevel === 'safe' && 'This page appears safe to use.'}
          {riskLevel === 'caution' && 'Exercise caution with this page.'}
          {riskLevel === 'warning' && 'This page may not be safe. Be very careful.'}
        </p>
      </div>

      {/* URL Analysis Checks */}
      <div
        className="rounded-xl p-4 border flex flex-col gap-2.5"
        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
      >
        <h5 className="text-[12px] font-bold text-text-primary mb-1">URL Analysis</h5>

        <CheckItem label="Uses HTTPS encryption" passed={isHttps} />
        <CheckItem label="Official .gov.gh domain" passed={isGovGh} />
        <CheckItem label="No suspicious URL patterns" passed={!hasSuspicious} />
      </div>

      {/* Red flags education */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
      >
        <h5 className="text-[12px] font-bold text-text-primary mb-3">Red Flags to Watch For</h5>
        <div className="flex flex-col gap-3">
          {PHISHING_RED_FLAGS.map((flag, idx) => (
            <RedFlagItem key={idx} icon={flag.icon} text={flag.text} detail={flag.detail} />
          ))}
        </div>
      </div>

      {/* Report button */}
      <button
        onClick={() => {
          alert('Thank you for reporting. This feature will forward suspicious sites to Ghana CERT in a future update.');
        }}
        className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{ background: '#CE1126', color: '#fff' }}
      >
        <span className="flex items-center justify-center gap-2">
          <Flag size={16} />
          Report Suspicious Site
        </span>
      </button>
    </div>
  );
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: passed ? 'rgba(0, 107, 63, 0.1)' : 'rgba(206, 17, 38, 0.1)' }}
      >
        {passed ? (
          <CheckCircle size={13} style={{ color: '#006B3F' }} />
        ) : (
          <X size={13} style={{ color: '#CE1126' }} />
        )}
      </div>
      <span className="text-[12px] text-text-secondary">{label}</span>
    </div>
  );
}

function RedFlagItem({ icon, text, detail }: { icon: React.ReactNode; text: string; detail: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="text-left w-full"
    >
      <div className="flex items-start gap-2.5">
        <span className="text-text-muted mt-0.5 shrink-0">{icon}</span>
        <div className="flex-1">
          <p className="text-[12px] font-medium text-text-primary leading-snug">{text}</p>
          {expanded && (
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{detail}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={12} className="text-text-muted shrink-0 mt-1" />
        ) : (
          <ChevronDown size={12} className="text-text-muted shrink-0 mt-1" />
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export function LiteracyAssistant({ onClose }: { onClose: () => void }) {
  const { activeTab, setActiveTab, analyzePage } = useLiteracyStore();

  // Run initial analysis on mount
  useEffect(() => {
    analyzePage();
  }, []);

  // Hide web views when panel is open
  useEffect(() => {
    window.osBrowser?.hideWebViews?.();
    return () => {
      window.osBrowser?.showWebViews?.();
    };
  }, []);

  const TAB_CONFIG: { key: LiteracyTab; label: string }[] = [
    { key: 'explainer', label: 'Page Explainer' },
    { key: 'formguide', label: 'Form Guide' },
    { key: 'phishing', label: 'Phishing' },
  ];

  return (
    <div
      className="w-[340px] shrink-0 flex flex-col border-l h-full"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #006B3F, #D4A017)' }}
        >
          <Brain size={18} className="text-white" />
        </div>
        <h3 className="text-[14px] font-bold text-text-primary flex-1">Digital Assistant</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Close Digital Assistant"
        >
          <X size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border-1)' }}>
        {TAB_CONFIG.map((tab) => (
          <TabPill
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {activeTab === 'explainer' && <PageExplainerTab />}
        {activeTab === 'formguide' && <FormGuideTab />}
        {activeTab === 'phishing' && <PhishingDetectionTab />}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 border-t shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <p className="text-[10px] text-text-muted text-center">
          OS Browser Digital Literacy Assistant \u2014 Helping Ghana civil servants stay safe online
        </p>
      </div>
    </div>
  );
}
