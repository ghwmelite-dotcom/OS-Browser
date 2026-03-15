import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Stamp, Download, Printer } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useSettingsStore } from '@/store/settings';

export interface ReportData {
  screenshotDataUrl: string;
  url: string;
  title: string;
  timestamp: number;
}

type ReportType = 'Incident Report' | 'Compliance Report' | 'Site Inspection' | 'Evidence Capture' | 'General Report';
type StampType = 'APPROVED' | 'REVIEWED' | 'DRAFT' | 'CONFIDENTIAL' | 'FOR REFERENCE' | null;

const REPORT_TYPES: ReportType[] = [
  'Incident Report',
  'Compliance Report',
  'Site Inspection',
  'Evidence Capture',
  'General Report',
];

const STAMPS: { label: StampType; color: string }[] = [
  { label: 'APPROVED', color: '#006B3F' },
  { label: 'REVIEWED', color: '#2563eb' },
  { label: 'DRAFT', color: '#6b7280' },
  { label: 'CONFIDENTIAL', color: '#CE1126' },
  { label: 'FOR REFERENCE', color: '#D4A017' },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function ReportGenerator({ data, onClose }: { data: ReportData; onClose: () => void }) {
  const { settings } = useSettingsStore();

  const [reportTitle, setReportTitle] = useState(data.title || 'Untitled Report');
  const [reportType, setReportType] = useState<ReportType>('General Report');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [stamp, setStamp] = useState<StampType>(null);
  const [generating, setGenerating] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // Try to pre-fill department from GhanaCard identity
  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const s = await window.osBrowser.settings.get();
        if ((s as any)?.ghana_card_data) {
          const cardData = JSON.parse((s as any).ghana_card_data);
          if (cardData.department) setDepartment(cardData.department);
          else if (cardData.ministry) setDepartment(cardData.ministry);
        }
      } catch {}
    };
    loadIdentity();
  }, []);

  // Hide web views while modal is open
  useEffect(() => {
    window.osBrowser?.hideWebViews?.();
    return () => {
      window.osBrowser?.showWebViews?.();
    };
  }, []);

  const officerName = settings?.display_name && settings.display_name !== 'User'
    ? settings.display_name
    : 'Civil Servant';

  const generateReportHTML = (): string => {
    const stampHtml = stamp
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);
          font-size:64px;font-weight:900;letter-spacing:8px;opacity:0.12;
          color:${STAMPS.find(s => s.label === stamp)?.color || '#888'};
          border:6px solid ${STAMPS.find(s => s.label === stamp)?.color || '#888'};
          border-radius:16px;padding:16px 40px;pointer-events:none;
          font-family:'Georgia',serif;text-transform:uppercase;white-space:nowrap;">
          ${stamp}
        </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} - OS Browser Report</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      line-height: 1.6;
      background: #fff;
    }
    .report-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 40px;
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .coat-of-arms {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .republic-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .department-name {
      font-size: 14px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .report-type-badge {
      display: inline-block;
      background: #CE1126;
      color: #fff;
      padding: 6px 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      border-radius: 4px;
      margin-top: 12px;
    }
    .ghana-stripe {
      height: 4px;
      background: linear-gradient(90deg, #CE1126 33%, #D4A017 33% 66%, #006B3F 66%);
      margin: 24px 0;
      border-radius: 2px;
    }
    .report-title-section {
      text-align: center;
      margin-bottom: 28px;
    }
    .report-title-section h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .screenshot-container {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 28px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .screenshot-container img {
      width: 100%;
      display: block;
    }
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 13px;
    }
    .metadata-table th,
    .metadata-table td {
      border: 1px solid #ddd;
      padding: 10px 16px;
      text-align: left;
    }
    .metadata-table th {
      background: #f5f5f5;
      font-weight: 700;
      width: 140px;
      color: #333;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
    }
    .metadata-table td {
      color: #1a1a1a;
    }
    .notes-section {
      margin-bottom: 32px;
    }
    .notes-section h3 {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #333;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    .notes-section p {
      font-size: 13px;
      color: #333;
      white-space: pre-wrap;
      line-height: 1.8;
    }
    .footer {
      border-top: 2px solid #1a1a1a;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-top: 40px;
    }
    .footer strong {
      color: #555;
    }
    @media print {
      body { background: white; }
      .report-container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${stampHtml}
    <div class="header">
      <div class="coat-of-arms">\u{1F1EC}\u{1F1ED}</div>
      <div class="republic-title">Republic of Ghana</div>
      <div class="department-name">${department || 'Government of Ghana'}</div>
      <div class="report-type-badge">${reportType}</div>
    </div>
    <div class="ghana-stripe"></div>
    <div class="report-title-section">
      <h1>${reportTitle}</h1>
    </div>
    <div class="screenshot-container">
      <img src="${data.screenshotDataUrl}" alt="Screenshot evidence" />
    </div>
    <table class="metadata-table">
      <tr><th>Date</th><td>${formatDate(data.timestamp)}</td></tr>
      <tr><th>Time</th><td>${formatTime(data.timestamp)}</td></tr>
      <tr><th>URL</th><td style="word-break:break-all;">${data.url}</td></tr>
      <tr><th>Department</th><td>${department || 'Not specified'}</td></tr>
      <tr><th>Officer</th><td>${officerName}</td></tr>
      ${stamp ? `<tr><th>Status</th><td><strong>${stamp}</strong></td></tr>` : ''}
    </table>
    ${notes ? `
    <div class="notes-section">
      <h3>Notes &amp; Observations</h3>
      <p>${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    ` : ''}
    <div class="ghana-stripe"></div>
    <div class="footer">
      <strong>Generated by OS Browser</strong> \u2014 Official Digital Report<br />
      Document generated on ${formatDate(Date.now())} at ${formatTime(Date.now())}
    </div>
  </div>
</body>
</html>`;
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const html = generateReportHTML();
      // Open in a new window for print/save
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Trigger print dialog after a brief delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        // Fallback: download as HTML file
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportTitle.replace(/[^a-zA-Z0-9 ]/g, '')}_Report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const selectedStampConfig = STAMPS.find((s) => s.label === stamp);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-[680px] max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #CE1126, #D4A017)' }}
          >
            <FileText size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-bold text-text-primary">Generate Report</h2>
            <p className="text-[11px] text-text-muted">Create an official PDF-style report from your screenshot</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-6">
            {/* Left: Screenshot preview */}
            <div className="w-[240px] shrink-0">
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Preview</p>
              <div
                ref={previewRef}
                className="relative rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border-1)' }}
              >
                <img
                  src={data.screenshotDataUrl}
                  alt="Screenshot preview"
                  className="w-full block"
                  style={{ maxHeight: 320, objectFit: 'cover' }}
                />
                {/* Stamp overlay */}
                {stamp && selectedStampConfig && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <span
                      className="font-bold text-[24px] tracking-[4px] border-[3px] rounded-lg px-4 py-2 opacity-25"
                      style={{
                        color: selectedStampConfig.color,
                        borderColor: selectedStampConfig.color,
                        transform: 'rotate(-18deg)',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {stamp}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-2 text-center">
                {formatDate(data.timestamp)} at {formatTime(data.timestamp)}
              </p>
            </div>

            {/* Right: Form */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Report title */}
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none border transition-colors focus:ring-2 focus:ring-ghana-gold/30"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border-1)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Enter report title"
                />
              </div>

              {/* Report type */}
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none border appearance-none cursor-pointer transition-colors focus:ring-2 focus:ring-ghana-gold/30"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border-1)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
                  Department / Ministry
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none border transition-colors focus:ring-2 focus:ring-ghana-gold/30"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border-1)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="e.g. Ministry of Finance"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
                  Notes / Observations
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none border resize-none transition-colors focus:ring-2 focus:ring-ghana-gold/30"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border-1)',
                    color: 'var(--color-text-primary)',
                    scrollbarWidth: 'thin',
                  }}
                  placeholder="Add any notes, observations, or context for this report..."
                />
              </div>

              {/* Stamp selector */}
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2 block">
                  <span className="flex items-center gap-1.5">
                    <Stamp size={12} />
                    Status Stamp (optional)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {STAMPS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setStamp(stamp === s.label ? null : s.label)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider border-2 transition-all duration-150 hover:scale-105"
                      style={{
                        borderColor: stamp === s.label ? s.color : 'var(--color-border-1)',
                        background: stamp === s.label ? `${s.color}15` : 'transparent',
                        color: stamp === s.label ? s.color : 'var(--color-text-muted)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-colors hover:bg-surface-2"
            style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating || !reportTitle.trim()}
            className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #CE1126, #D4A017)' }}
          >
            <Printer size={15} />
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
