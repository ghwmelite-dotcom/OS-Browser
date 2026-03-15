import React, { useState } from 'react';
import { X, BookOpen, Search, ArrowLeftRight } from 'lucide-react';

// Common English-Twi translations for civil service use
const DICTIONARY: Array<{ en: string; tw: string; category: string }> = [
  // Greetings
  { en: 'Welcome', tw: 'Akwaaba', category: 'Greetings' },
  { en: 'Good morning', tw: 'Maakye', category: 'Greetings' },
  { en: 'Good afternoon', tw: 'Maaha', category: 'Greetings' },
  { en: 'Good evening', tw: 'Maadwo', category: 'Greetings' },
  { en: 'Thank you', tw: 'Medaase', category: 'Greetings' },
  { en: 'Please', tw: 'Mepawokyɛw', category: 'Greetings' },
  { en: 'How are you?', tw: 'Wo ho te sɛn?', category: 'Greetings' },
  { en: 'I am fine', tw: 'Me ho yɛ', category: 'Greetings' },
  { en: 'Goodbye', tw: 'Nante yie', category: 'Greetings' },
  { en: 'Yes', tw: 'Aane', category: 'Greetings' },
  { en: 'No', tw: 'Daabi', category: 'Greetings' },
  // Government & Official
  { en: 'Government', tw: 'Aban', category: 'Government' },
  { en: 'President', tw: 'Ɔmanhyɛfo', category: 'Government' },
  { en: 'Minister', tw: 'Ɔsomafo', category: 'Government' },
  { en: 'Office', tw: 'Adwumayɛbea', category: 'Government' },
  { en: 'Meeting', tw: 'Nhyiam', category: 'Government' },
  { en: 'Report', tw: 'Amanneɛbɔ', category: 'Government' },
  { en: 'Letter', tw: 'Nkrataa', category: 'Government' },
  { en: 'Document', tw: 'Nkrataa', category: 'Government' },
  { en: 'Permission', tw: 'Kwan', category: 'Government' },
  { en: 'Approval', tw: 'Ɛpene so', category: 'Government' },
  { en: 'Decision', tw: 'Gyinaeɛ', category: 'Government' },
  { en: 'Policy', tw: 'Nhyehyɛeɛ', category: 'Government' },
  { en: 'Law', tw: 'Mmara', category: 'Government' },
  { en: 'Public', tw: 'Ɔman', category: 'Government' },
  { en: 'Service', tw: 'Adwuma', category: 'Government' },
  // Numbers
  { en: 'One', tw: 'Baako', category: 'Numbers' },
  { en: 'Two', tw: 'Mmienu', category: 'Numbers' },
  { en: 'Three', tw: 'Mmiɛnsa', category: 'Numbers' },
  { en: 'Four', tw: 'Ɛnan', category: 'Numbers' },
  { en: 'Five', tw: 'Enum', category: 'Numbers' },
  { en: 'Ten', tw: 'Edu', category: 'Numbers' },
  { en: 'Hundred', tw: 'Ɔha', category: 'Numbers' },
  { en: 'Thousand', tw: 'Apem', category: 'Numbers' },
  // Common Words
  { en: 'Money', tw: 'Sika', category: 'Common' },
  { en: 'Water', tw: 'Nsuo', category: 'Common' },
  { en: 'Food', tw: 'Aduane', category: 'Common' },
  { en: 'House', tw: 'Efie', category: 'Common' },
  { en: 'Road', tw: 'Ɛkwan', category: 'Common' },
  { en: 'Car', tw: 'Kaa', category: 'Common' },
  { en: 'School', tw: 'Sukuu', category: 'Common' },
  { en: 'Hospital', tw: 'Ayaresabea', category: 'Common' },
  { en: 'Market', tw: 'Dwom', category: 'Common' },
  { en: 'Church', tw: 'Asɔre', category: 'Common' },
  { en: 'Work', tw: 'Adwuma', category: 'Common' },
  { en: 'Help', tw: 'Boa', category: 'Common' },
  { en: 'Today', tw: 'Ɛnnɛ', category: 'Common' },
  { en: 'Tomorrow', tw: 'Ɔkyena', category: 'Common' },
  { en: 'Yesterday', tw: 'Ɛnnora', category: 'Common' },
  // Phrases
  { en: 'What is your name?', tw: 'Wo din de sɛn?', category: 'Phrases' },
  { en: 'My name is', tw: 'Me din de', category: 'Phrases' },
  { en: 'Where are you from?', tw: 'Wofiri he?', category: 'Phrases' },
  { en: 'I am from Ghana', tw: 'Mefiri Ghana', category: 'Phrases' },
  { en: 'I need help', tw: 'Mepɛ mmoa', category: 'Phrases' },
  { en: 'How much?', tw: 'Ɛyɛ sɛn?', category: 'Phrases' },
  { en: 'God bless you', tw: 'Onyankopɔn nhyira wo', category: 'Phrases' },
];

export function TwiDictionary({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<'en-tw' | 'tw-en'>('en-tw');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(DICTIONARY.map(d => d.category))];

  const filteredResults = DICTIONARY.filter(entry => {
    const matchesCategory = !selectedCategory || entry.category === selectedCategory;
    if (!query.trim()) return matchesCategory;
    const lower = query.toLowerCase();
    if (direction === 'en-tw') {
      return matchesCategory && entry.en.toLowerCase().includes(lower);
    } else {
      return matchesCategory && entry.tw.toLowerCase().includes(lower);
    }
  });

  return (
    <div className="w-[340px] border-l flex flex-col h-full animate-slide-in-right"
      style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[14px] font-bold text-text-primary">Twi Dictionary</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            {DICTIONARY.length} words
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2">
          <X size={14} className="text-text-muted" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
          <Search size={14} className="text-text-muted" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={direction === 'en-tw' ? 'Search in English...' : 'Search in Twi...'}
            className="flex-1 bg-transparent text-[13px] outline-none text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* Direction toggle */}
        <button onClick={() => setDirection(d => d === 'en-tw' ? 'tw-en' : 'en-tw')}
          className="w-full flex items-center justify-center gap-2 mt-2 py-1.5 rounded-lg text-[11px] font-medium hover:bg-surface-2 transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeftRight size={12} />
          {direction === 'en-tw' ? 'English → Twi' : 'Twi → English'}
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <button onClick={() => setSelectedCategory(null)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${!selectedCategory ? '' : 'hover:bg-surface-2'}`}
          style={!selectedCategory ? { background: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-text-muted)' }}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? '' : 'hover:bg-surface-2'}`}
            style={selectedCategory === cat ? { background: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-text-muted)' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {filteredResults.length === 0 && (
          <div className="px-4 py-8 text-center text-text-muted text-[13px]">
            No matches found for "{query}"
          </div>
        )}
        {filteredResults.map((entry, i) => (
          <div key={i} className="px-4 py-3 border-b hover:bg-surface-2/50 transition-colors"
            style={{ borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-text-primary">
                  {direction === 'en-tw' ? entry.en : entry.tw}
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-accent)' }}>
                  {direction === 'en-tw' ? entry.tw : entry.en}
                </p>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {entry.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t text-center" style={{ borderColor: 'var(--color-border-1)' }}>
        <p className="text-[10px] text-text-muted">
          Twi (Akan) — Ghana's most widely spoken local language
        </p>
      </div>
    </div>
  );
}
