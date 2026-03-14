import React from 'react';
import { Shield, EyeOff, Cookie, FileText, Globe, Building, Wifi } from 'lucide-react';

export function PrivateTabPage() {
  return (
    <div className="min-h-full overflow-y-auto" style={{ background: '#1a1a1e' }}>
      <div className="max-w-[700px] mx-auto px-6 py-16">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="relative">
              {/* Hat */}
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <ellipse cx="32" cy="40" rx="28" ry="6" fill="rgba(255,255,255,0.15)" />
                <path d="M12 40 L32 16 L52 40" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <rect x="8" y="38" width="48" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
              </svg>
              {/* Glasses */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.35)' }} />
                <div className="w-2 h-0.5" style={{ background: 'rgba(255,255,255,0.25)' }} />
                <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.35)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[24px] font-bold text-center mb-6" style={{ color: '#e8e8ec' }}>
          You've gone Private
        </h1>

        {/* Description */}
        <p className="text-[14px] leading-relaxed text-center max-w-[600px] mx-auto mb-10" style={{ color: '#9ca0ae' }}>
          Others who use this device won't see your activity, so you can browse more privately.
          This won't change how data is collected by websites you visit and the services they use.
          Bookmarks and downloads will still be saved.
        </p>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-8 mb-10 max-w-[560px] mx-auto">
          {/* Won't save */}
          <div>
            <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#e8e8ec' }}>
              OS Browser won't save:
            </h3>
            <ul className="space-y-2.5">
              {[
                { icon: EyeOff, text: 'Your browsing history' },
                { icon: Cookie, text: 'Cookies and site data' },
                { icon: FileText, text: 'Information entered in forms' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-2.5">
                  <item.icon size={14} className="shrink-0 mt-0.5" style={{ color: '#6b7080' }} />
                  <span className="text-[13px]" style={{ color: '#9ca0ae' }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Still visible */}
          <div>
            <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#e8e8ec' }}>
              Your activity might still be visible to:
            </h3>
            <ul className="space-y-2.5">
              {[
                { icon: Globe, text: 'Websites you visit' },
                { icon: Building, text: 'Your employer or institution' },
                { icon: Wifi, text: 'Your internet service provider' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-2.5">
                  <item.icon size={14} className="shrink-0 mt-0.5" style={{ color: '#6b7080' }} />
                  <span className="text-[13px]" style={{ color: '#9ca0ae' }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Cookie blocking notice */}
        <div className="rounded-xl p-5 max-w-[560px] mx-auto" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-2">
            <Shield size={18} style={{ color: '#D4A017' }} />
            <h3 className="text-[14px] font-semibold" style={{ color: '#e8e8ec' }}>
              Third-party cookies are blocked
            </h3>
          </div>
          <p className="text-[13px] leading-relaxed pl-[30px]" style={{ color: '#7a7f8e' }}>
            When you're in Private mode, sites can't use third-party cookies to track you.
            Ads and trackers are also blocked at the network level for enhanced privacy.
          </p>
        </div>

        {/* Ghana branding */}
        <p className="text-center mt-10 text-[11px]" style={{ color: '#4a4e5a' }}>
          OS Browser Private Mode — Your data stays in Ghana. Sovereign. Private. Yours.
        </p>
      </div>
    </div>
  );
}
