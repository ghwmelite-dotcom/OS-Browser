import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, MessageSquare, Globe, Target, User, Sparkles, DollarSign, BookOpen } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const totalSteps = 5;

  const next = () => {
    if (step < totalSteps - 1) {
      setDirection('next');
      setStep(s => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection('prev');
      setStep(s => s - 1);
    }
  };

  const finish = async () => {
    if (profileName.trim()) {
      await window.osBrowser.settings.update({
        display_name: profileName.trim(),
        email: profileEmail.trim() || null,
      });
    }
    onComplete();
  };

  const skip = () => onComplete();

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { step === totalSteps - 1 ? finish() : next(); }
      else if (e.key === 'Escape') skip();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, profileName, profileEmail]);

  const slides = [
    // Slide 0: Welcome
    {
      icon: (
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
          <svg width="48" height="48" viewBox="0 0 512 512">
            <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
          </svg>
        </div>
      ),
      title: 'Welcome to OS Browser \u{1F1EC}\u{1F1ED}',
      desc: "Ghana's smartest browser \u2014 built for productivity, privacy, and you. Let's take a quick tour.",
    },
    // Slide 1: AI Assistant
    {
      icon: (
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #D4A017 0%, #F2C94C 100%)' }}>
          <MessageSquare size={40} className="text-white" />
        </div>
      ),
      title: 'Your AI Assistant, Built In',
      desc: 'Press Ctrl+J to open the AI sidebar. Summarize pages, translate to Twi, draft letters, and research any topic \u2014 all without leaving the browser.',
    },
    // Slide 2: Ghana Tools
    {
      icon: (
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #006B3F 0%, #10B981 100%)' }}>
          <div className="flex gap-1">
            <DollarSign size={24} className="text-white" />
            <BookOpen size={24} className="text-white" />
          </div>
        </div>
      ),
      title: 'Made for Ghana',
      desc: 'GHS currency converter, SSNIT calculator, Twi dictionary, and quick access to 10 government portals \u2014 tools no other browser has.',
    },
    // Slide 3: Productivity
    {
      icon: (
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
          <Target size={40} className="text-white" />
        </div>
      ),
      title: 'Work Smarter, Not Harder',
      desc: 'Command Palette (Ctrl+K), Split Screen, Focus Mode, Reading Mode, Screenshot Tool, and 15+ keyboard shortcuts to keep you in the flow.',
    },
    // Slide 4: Profile Setup
    {
      icon: (
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #CE1126 0%, #F43F5E 100%)' }}>
          <User size={40} className="text-white" />
        </div>
      ),
      title: 'Make It Yours',
      desc: null, // Custom content below
    },
  ];

  const currentSlide = slides[step];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>

      <div className="w-[520px] rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>

        {/* Skip button */}
        <div className="flex justify-end px-5 pt-4">
          <button onClick={skip} className="text-[12px] text-text-muted hover:text-text-secondary transition-colors">
            Skip tour
          </button>
        </div>

        {/* Slide content */}
        <div className="px-10 pb-2 pt-4 text-center" key={step}
          style={{ animation: `slideIn${direction === 'next' ? 'Right' : 'Left'} 0.3s ease-out` }}>

          {/* Icon */}
          <div className="mb-6">{currentSlide.icon}</div>

          {/* Title */}
          <h2 className="text-[22px] font-bold text-text-primary mb-3">{currentSlide.title}</h2>

          {/* Description or profile form */}
          {currentSlide.desc ? (
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-[400px] mx-auto">
              {currentSlide.desc}
            </p>
          ) : (
            <div className="text-left max-w-[360px] mx-auto">
              <p className="text-[13px] text-text-secondary text-center mb-5">
                Set up your profile to personalize your experience.
              </p>
              <div className="mb-3">
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Your Name</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                  placeholder="e.g. Ozzy" autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
              </div>
              <div className="mb-2">
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
              </div>
              <p className="text-[10px] text-text-muted text-center mt-2">
                Your profile is stored locally on your device. Free forever.
              </p>
            </div>
          )}
        </div>

        {/* Bottom bar: dots + button */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Progress dots */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > step ? 'next' : 'prev'); setStep(i); }}
                className="w-2 h-2 rounded-full transition-all duration-200"
                style={{
                  background: i === step ? 'var(--color-accent)' : 'var(--color-border-2)',
                  width: i === step ? '24px' : '8px',
                }} />
            ))}
          </div>

          {/* CTA button */}
          {step === totalSteps - 1 ? (
            <button onClick={finish}
              className="px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:brightness-110"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              Get Started
            </button>
          ) : (
            <button onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:brightness-110"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Slide animation styles */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
