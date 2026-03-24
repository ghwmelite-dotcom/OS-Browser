import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

interface DictEntry {
  english: string;
  twi: string;
  pronunciation: string;
  category: string;
  example?: string;
}

const FAVORITES_KEY = 'os_mobile_twi_favorites';

const DATABASE: DictEntry[] = [
  // Greetings
  { english: 'Hello', twi: 'Agoo', pronunciation: 'ah-GOO', category: 'Greetings', example: 'Agoo! Mepɛ sɛ mehu wo.' },
  { english: 'Good morning', twi: 'Maakye', pronunciation: 'mah-CHAY', category: 'Greetings', example: 'Maakye, wo ho te sɛn?' },
  { english: 'Good afternoon', twi: 'Maaha', pronunciation: 'mah-AH-ha', category: 'Greetings' },
  { english: 'Good evening', twi: 'Maadwo', pronunciation: 'mah-JO', category: 'Greetings' },
  { english: 'How are you?', twi: 'Wo ho te sɛn?', pronunciation: 'woh hoh teh SEN', category: 'Greetings', example: 'Maakye! Wo ho te sɛn?' },
  { english: 'I am fine', twi: 'Me ho yɛ', pronunciation: 'meh hoh YEH', category: 'Greetings', example: 'Me ho yɛ, medaase.' },
  { english: 'Thank you', twi: 'Medaase', pronunciation: 'meh-DAH-seh', category: 'Greetings', example: 'Medaase paa!' },
  { english: 'Please', twi: 'Mepawokyɛw', pronunciation: 'meh-pa-woh-CHEW', category: 'Greetings' },
  { english: 'Welcome', twi: 'Akwaaba', pronunciation: 'ah-KWAH-bah', category: 'Greetings', example: 'Akwaaba! Bra mu.' },
  { english: 'Goodbye', twi: 'Nante yie', pronunciation: 'nan-teh YEH', category: 'Greetings', example: 'Nante yie, yɛbɛhyia bio.' },

  // Numbers
  { english: 'One', twi: 'Baako', pronunciation: 'BAH-koh', category: 'Numbers' },
  { english: 'Two', twi: 'Mmienu', pronunciation: 'mmee-EH-noo', category: 'Numbers' },
  { english: 'Three', twi: 'Mmiɛnsa', pronunciation: 'mmee-EN-sah', category: 'Numbers' },
  { english: 'Four', twi: 'Ɛnan', pronunciation: 'eh-NAN', category: 'Numbers' },
  { english: 'Five', twi: 'Enum', pronunciation: 'eh-NOOM', category: 'Numbers' },
  { english: 'Six', twi: 'Nsia', pronunciation: 'n-SEE-ah', category: 'Numbers' },
  { english: 'Seven', twi: 'Nson', pronunciation: 'n-SON', category: 'Numbers' },
  { english: 'Eight', twi: 'Nwɔtwe', pronunciation: 'n-WOH-chweh', category: 'Numbers' },
  { english: 'Nine', twi: 'Nkron', pronunciation: 'n-KRON', category: 'Numbers' },
  { english: 'Ten', twi: 'Edu', pronunciation: 'eh-DOO', category: 'Numbers' },
  { english: 'Hundred', twi: 'Ɔha', pronunciation: 'oh-HA', category: 'Numbers' },
  { english: 'Thousand', twi: 'Apem', pronunciation: 'ah-PEM', category: 'Numbers' },

  // Government
  { english: 'Government', twi: 'Aban', pronunciation: 'ah-BAN', category: 'Government', example: 'Aban no adi nkɔmmɔ.' },
  { english: 'President', twi: 'Ɔmanpanyin', pronunciation: 'oh-man-PAN-yin', category: 'Government' },
  { english: 'Minister', twi: 'Ɔsomafoɔ', pronunciation: 'oh-soh-mah-FOH', category: 'Government' },
  { english: 'Parliament', twi: 'Ahyiamu', pronunciation: 'ah-HYA-moo', category: 'Government' },
  { english: 'Law', twi: 'Mmara', pronunciation: 'mm-MAH-rah', category: 'Government', example: 'Mmara no bɔ ɔman no ho ban.' },
  { english: 'Court', twi: 'Asennibea', pronunciation: 'ah-seh-nee-BEH-ah', category: 'Government' },
  { english: 'Police', twi: 'Polisi', pronunciation: 'poh-LEE-see', category: 'Government' },
  { english: 'Tax', twi: 'Ɛtuo', pronunciation: 'eh-TOO-oh', category: 'Government' },
  { english: 'Vote', twi: 'Ato', pronunciation: 'ah-TOH', category: 'Government', example: 'Yɛbɛto aba ɔkyena.' },
  { english: 'Constitution', twi: 'Ahyɛde', pronunciation: 'ah-HYEH-deh', category: 'Government' },

  // Daily Life
  { english: 'Water', twi: 'Nsuo', pronunciation: 'n-SOO-oh', category: 'Daily Life', example: 'Merehia nsuo.' },
  { english: 'Food', twi: 'Aduane', pronunciation: 'ah-doo-AH-neh', category: 'Daily Life', example: 'Aduane no yɛ dɛ.' },
  { english: 'House', twi: 'Efie', pronunciation: 'eh-FEE-eh', category: 'Daily Life' },
  { english: 'Car', twi: 'Kaa', pronunciation: 'KAH', category: 'Daily Life' },
  { english: 'Money', twi: 'Sika', pronunciation: 'SEE-kah', category: 'Daily Life', example: 'Sika yɛ mogya.' },
  { english: 'Market', twi: 'Dwom', pronunciation: 'JWOM', category: 'Daily Life' },
  { english: 'School', twi: 'Sukuu', pronunciation: 'soo-KOO', category: 'Daily Life', example: 'Abofra no kɔ sukuu.' },
  { english: 'Hospital', twi: 'Ayaresabea', pronunciation: 'ah-yah-reh-sah-BEH-ah', category: 'Daily Life' },
  { english: 'Church', twi: 'Asɔredan', pronunciation: 'ah-SOH-reh-dan', category: 'Daily Life' },
  { english: 'Road', twi: 'Ɛkwan', pronunciation: 'eh-KWAN', category: 'Daily Life' },

  // Family
  { english: 'Father', twi: 'Agya / Papa', pronunciation: 'ah-JAH / PAH-pah', category: 'Family' },
  { english: 'Mother', twi: 'Ɛna / Maame', pronunciation: 'eh-NAH / MAH-meh', category: 'Family' },
  { english: 'Child', twi: 'Abofra', pronunciation: 'ah-boh-FRAH', category: 'Family', example: 'Abofra no resua ade.' },
  { english: 'Brother', twi: 'Onua barima', pronunciation: 'oh-NOO-ah bah-REE-mah', category: 'Family' },
  { english: 'Sister', twi: 'Onua baa', pronunciation: 'oh-NOO-ah BAH', category: 'Family' },
  { english: 'Husband', twi: 'Okunu', pronunciation: 'oh-KOO-noo', category: 'Family' },
  { english: 'Wife', twi: 'Oyere', pronunciation: 'oh-YEH-reh', category: 'Family' },
  { english: 'Grandmother', twi: 'Nana baa', pronunciation: 'NAH-nah BAH', category: 'Family' },
  { english: 'Grandfather', twi: 'Nana barima', pronunciation: 'NAH-nah bah-REE-mah', category: 'Family' },
  { english: 'Family', twi: 'Abusua', pronunciation: 'ah-boo-SOO-ah', category: 'Family', example: 'Abusua yɛ ɔdomankoma.' },

  // Work
  { english: 'Work', twi: 'Adwuma', pronunciation: 'ah-JOO-mah', category: 'Work', example: 'Merekɔ adwuma.' },
  { english: 'Office', twi: 'Adwumabea', pronunciation: 'ah-joo-mah-BEH-ah', category: 'Work' },
  { english: 'Meeting', twi: 'Nhyiam', pronunciation: 'n-HYAM', category: 'Work', example: 'Yɛwɔ nhyiam ɛnnɛ.' },
  { english: 'Computer', twi: 'Kɔmputa', pronunciation: 'kom-POO-tah', category: 'Work' },
  { english: 'Phone', twi: 'Ahomatrofoɔ', pronunciation: 'ah-hoh-mah-troh-FOH', category: 'Work' },
  { english: 'Letter', twi: 'Krataa', pronunciation: 'krah-TAH', category: 'Work' },
  { english: 'Pen', twi: 'Kyerɛwpen', pronunciation: 'cheh-REW-pen', category: 'Work' },
  { english: 'Book', twi: 'Nhoma', pronunciation: 'n-HOH-mah', category: 'Work', example: 'Merekɔ nhoma no.' },
  { english: 'Teacher', twi: 'Ɔkyerɛkyerɛfoɔ', pronunciation: 'oh-cheh-reh-cheh-reh-FOH', category: 'Work' },
  { english: 'Doctor', twi: 'Dɔkota', pronunciation: 'doh-KOH-tah', category: 'Work' },

  // Time
  { english: 'Today', twi: 'Ɛnnɛ', pronunciation: 'en-NEH', category: 'Time', example: 'Ɛnnɛ yɛ da pa.' },
  { english: 'Tomorrow', twi: 'Ɔkyena', pronunciation: 'oh-CHEH-nah', category: 'Time' },
  { english: 'Yesterday', twi: 'Ɛnnora', pronunciation: 'en-NOH-rah', category: 'Time' },
  { english: 'Morning', twi: 'Anɔpa', pronunciation: 'ah-NOH-pah', category: 'Time' },
  { english: 'Afternoon', twi: 'Awia', pronunciation: 'ah-WEE-ah', category: 'Time' },
  { english: 'Evening', twi: 'Anwummere', pronunciation: 'an-WOOM-meh-reh', category: 'Time' },
  { english: 'Week', twi: 'Dapɛn', pronunciation: 'dah-PEN', category: 'Time' },
  { english: 'Month', twi: 'Bosome', pronunciation: 'boh-SOH-meh', category: 'Time' },
  { english: 'Year', twi: 'Afe', pronunciation: 'ah-FEH', category: 'Time' },
  { english: 'Now', twi: 'Seisei', pronunciation: 'SEH-seh', category: 'Time' },

  // Common Phrases
  { english: 'Yes', twi: 'Aane', pronunciation: 'AH-neh', category: 'Common Phrases' },
  { english: 'No', twi: 'Daabi', pronunciation: 'DAH-bee', category: 'Common Phrases' },
  { english: "I don't understand", twi: 'Mente aseɛ', pronunciation: 'men-teh ah-SEH', category: 'Common Phrases' },
  { english: 'What is your name?', twi: 'Wo din de sɛn?', pronunciation: 'woh din deh SEN', category: 'Common Phrases', example: 'Wo din de sɛn? Me din de Kofi.' },
  { english: 'My name is...', twi: 'Me din de...', pronunciation: 'meh din deh...', category: 'Common Phrases' },
  { english: 'How much?', twi: 'Ɛyɛ sɛn?', pronunciation: 'eh-yeh SEN', category: 'Common Phrases', example: 'Ɛyɛ sɛn? Sidi anum.' },
  { english: 'Where is...?', twi: '...wɔ he?', pronunciation: '...woh HEH', category: 'Common Phrases', example: 'Sukuu no wɔ he?' },
  { english: 'I need help', twi: 'Mehia mmoa', pronunciation: 'meh-HEE-ah mm-MOH-ah', category: 'Common Phrases' },
  { english: 'God bless you', twi: 'Onyankopɔn nhyira wo', pronunciation: 'oh-nyan-koh-PON n-HYEE-rah woh', category: 'Common Phrases' },
  { english: 'Peace', twi: 'Asomdwoe', pronunciation: 'ah-som-JWEH', category: 'Common Phrases', example: 'Asomdwoe nka wo.' },
];

const CATEGORIES = ['All', ...Array.from(new Set(DATABASE.map(e => e.category)))];

function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setFavorites(favs: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function toggleFavorite(english: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(english);
  if (idx >= 0) {
    favs.splice(idx, 1);
    setFavorites(favs);
    return false;
  }
  favs.push(english);
  setFavorites(favs);
  return true;
}

function getWordOfTheDay(): DictEntry {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return DATABASE[seed % DATABASE.length];
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    showToast('Could not copy', 'error');
  });
}

export function renderDictionaryPage(container: HTMLElement): void {
  let searchQuery = '';
  let activeCategory = 'All';
  let searchDirection: 'en-twi' | 'twi-en' = 'en-twi';
  let showFavoritesOnly = false;

  function getFilteredEntries(): DictEntry[] {
    let entries = DATABASE;

    if (showFavoritesOnly) {
      const favs = getFavorites();
      entries = entries.filter(e => favs.includes(e.english));
    }

    if (activeCategory !== 'All') {
      entries = entries.filter(e => e.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      entries = entries.filter(e =>
        searchDirection === 'en-twi'
          ? e.english.toLowerCase().includes(q)
          : e.twi.toLowerCase().includes(q)
      );
    }

    return entries;
  }

  function buildPage(): void {
    const favs = getFavorites();
    const wotd = getWordOfTheDay();
    const filtered = getFilteredEntries();

    // --- Word of the Day banner ---
    const wotdBanner = h('div', {
      style: {
        background: 'linear-gradient(135deg, #006B3F 0%, #004d2e 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid rgba(212,160,23,0.3)',
        position: 'relative',
        overflow: 'hidden',
      },
    },
      h('div', { style: { position: 'absolute', top: '0', right: '0', width: '80px', height: '80px', background: 'radial-gradient(circle at top right, rgba(212,160,23,0.15), transparent)', borderRadius: '0 16px 0 0' } }),
      h('div', { style: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#D4A017', marginBottom: '8px', fontFamily: 'var(--font-body)' } }, '✦ Word of the Day'),
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' } },
        h('span', { style: { fontSize: 'clamp(20px, 5.5vw, 26px)', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-display)' } }, wotd.english),
        h('span', { style: { fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: '600', color: '#D4A017', fontFamily: 'var(--font-display)' } }, wotd.twi),
      ),
      h('div', { style: { fontSize: 'clamp(12px, 3.2vw, 14px)', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontFamily: 'var(--font-body)' } },
        `/${wotd.pronunciation}/`,
      ),
      wotd.example ? h('div', { style: { fontSize: 'clamp(12px, 3.2vw, 14px)', color: 'rgba(255,255,255,0.6)', marginTop: '8px', fontFamily: 'var(--font-body)' } },
        `"${wotd.example}"`,
      ) : h('span'),
    );

    // --- Search bar ---
    const searchInput = h('input', {
      type: 'text',
      placeholder: searchDirection === 'en-twi' ? 'Search English word...' : 'Search Twi word...',
      value: searchQuery,
      style: {
        flex: '1',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: '#fff',
        fontSize: 'clamp(14px, 3.8vw, 16px)',
        fontFamily: 'var(--font-body)',
        padding: '0',
        minWidth: '0',
      },
      onInput: (e: Event) => {
        searchQuery = (e.target as HTMLInputElement).value;
        buildPage();
      },
    });

    const directionBtn = h('button', {
      style: {
        background: 'rgba(212,160,23,0.15)',
        border: '1px solid rgba(212,160,23,0.3)',
        borderRadius: '8px',
        color: '#D4A017',
        fontSize: '11px',
        fontWeight: '700',
        padding: '6px 10px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
        minHeight: '36px',
      },
      onClick: () => {
        searchDirection = searchDirection === 'en-twi' ? 'twi-en' : 'en-twi';
        buildPage();
      },
    }, searchDirection === 'en-twi' ? 'EN→TWI' : 'TWI→EN');

    const searchBar = h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '12px',
        position: 'sticky',
        top: '0',
        zIndex: '10',
      },
    },
      h('span', { style: { fontSize: '18px', opacity: '0.5', flexShrink: '0' } }, '🔍'),
      searchInput,
      directionBtn,
    );

    // --- Category pills ---
    const favBtn = h('button', {
      style: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: showFavoritesOnly ? '1px solid #D4A017' : '1px solid var(--border)',
        background: showFavoritesOnly ? 'rgba(212,160,23,0.15)' : 'var(--surface)',
        color: showFavoritesOnly ? '#D4A017' : 'rgba(255,255,255,0.6)',
        fontSize: 'clamp(12px, 3.2vw, 13px)',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexShrink: '0',
      },
      onClick: () => {
        showFavoritesOnly = !showFavoritesOnly;
        buildPage();
      },
    }, '♥', ` ${favs.length}`);

    const categoryPills = CATEGORIES.map(cat => {
      const isActive = cat === activeCategory;
      return h('button', {
        style: {
          padding: '8px 16px',
          borderRadius: '20px',
          border: isActive ? '1px solid #D4A017' : '1px solid var(--border)',
          background: isActive ? 'rgba(212,160,23,0.15)' : 'var(--surface)',
          color: isActive ? '#D4A017' : 'rgba(255,255,255,0.6)',
          fontSize: 'clamp(12px, 3.2vw, 13px)',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-body)',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: '0',
        },
        onClick: () => {
          activeCategory = cat;
          buildPage();
        },
      }, cat);
    });

    const pillsRow = h('div', {
      style: {
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      },
    }, favBtn, ...categoryPills);

    // --- Word cards ---
    const wordCards = filtered.map(entry => {
      const isFav = favs.includes(entry.english);

      const heartBtn = h('button', {
        style: {
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: '0',
          filter: isFav ? 'none' : 'grayscale(1) opacity(0.4)',
        },
        onClick: () => {
          const added = toggleFavorite(entry.english);
          showToast(added ? `Added "${entry.english}" to favorites` : `Removed "${entry.english}"`, added ? 'success' : 'info');
          buildPage();
        },
      }, isFav ? '❤️' : '🤍');

      const copyBtn = h('button', {
        style: {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '4px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: '0',
        },
        onClick: () => copyToClipboard(`${entry.english}: ${entry.twi}`),
      }, '📋');

      const speakerBtn = h('button', {
        style: {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '4px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: '0',
        },
        onClick: () => showToast('Audio coming soon', 'info'),
      }, '🔊');

      return h('div', {
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '10px',
        },
      },
        // Top row: words + heart
        h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
          h('div', { style: { flex: '1', minWidth: '0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' } },
              h('span', { style: { fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-display)' } }, entry.english),
              h('span', { style: { fontSize: 'clamp(14px, 3.8vw, 16px)', color: 'rgba(255,255,255,0.3)' } }, '→'),
              h('span', { style: { fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: '600', color: '#D4A017', fontFamily: 'var(--font-display)' } }, entry.twi),
            ),
            h('div', { style: { fontSize: 'clamp(12px, 3.2vw, 13px)', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', fontFamily: 'var(--font-body)', marginBottom: '6px' } }, `/${entry.pronunciation}/`),
          ),
          heartBtn,
        ),
        // Category badge
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: entry.example ? '8px' : '10px' } },
          h('span', {
            style: {
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(212,160,23,0.1)',
              border: '1px solid rgba(212,160,23,0.2)',
              color: '#D4A017',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'var(--font-body)',
            },
          }, entry.category),
        ),
        // Example sentence
        entry.example ? h('div', {
          style: {
            fontSize: 'clamp(12px, 3.2vw, 13px)',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--font-body)',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
            borderLeft: '3px solid rgba(212,160,23,0.3)',
          },
        }, `"${entry.example}"`) : h('span'),
        // Action buttons row
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          copyBtn,
          speakerBtn,
        ),
      );
    });

    // --- Empty state ---
    const emptyState = filtered.length === 0 ? h('div', {
      style: {
        textAlign: 'center',
        padding: '48px 20px',
        color: 'rgba(255,255,255,0.35)',
        fontFamily: 'var(--font-body)',
      },
    },
      h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '📖'),
      h('div', { style: { fontSize: 'clamp(14px, 3.8vw, 16px)', fontWeight: '600', marginBottom: '6px', color: 'rgba(255,255,255,0.5)' } },
        showFavoritesOnly ? 'No favorites yet' : 'No words found',
      ),
      h('div', { style: { fontSize: 'clamp(12px, 3.2vw, 13px)' } },
        showFavoritesOnly ? 'Tap the heart icon to save words' : 'Try a different search or category',
      ),
    ) : null;

    // --- Stats footer ---
    const uniqueCategories = new Set(DATABASE.map(e => e.category)).size;
    const statsFooter = h('div', {
      style: {
        textAlign: 'center',
        padding: '20px 0 0',
        fontSize: 'clamp(11px, 3vw, 12px)',
        color: 'rgba(255,255,255,0.25)',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.5px',
      },
    }, `${DATABASE.length} words \u2022 ${uniqueCategories} categories \u2022 Offline ready`);

    // --- Page header ---
    const header = h('div', {
      style: {
        marginBottom: '20px',
      },
    },
      h('h1', {
        style: {
          fontSize: 'clamp(24px, 6.5vw, 30px)',
          fontWeight: '800',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          margin: '0 0 4px',
        },
      }, '📖 Twi Dictionary'),
      h('p', {
        style: {
          fontSize: 'clamp(13px, 3.4vw, 14px)',
          color: 'rgba(255,255,255,0.45)',
          fontFamily: 'var(--font-body)',
          margin: '0',
        },
      }, 'Learn Twi — Ghana\'s most spoken local language'),
    );

    // --- Assemble ---
    const elements: HTMLElement[] = [
      header,
      wotdBanner,
      searchBar,
      pillsRow,
      ...(emptyState ? [emptyState] : wordCards),
      statsFooter,
      h('div', { style: { height: '100px' } }),
    ];

    render(container, h('div', {
      style: {
        padding: '20px 16px 0',
        maxWidth: '600px',
        margin: '0 auto',
      },
    }, ...elements));

    // Focus input if user was typing
    if (searchQuery) {
      const input = container.querySelector('input');
      if (input) {
        input.focus();
        input.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    }

    // Hide scrollbar on pills row
    const style = document.getElementById('dict-scrollbar-hide');
    if (!style) {
      const s = document.createElement('style');
      s.id = 'dict-scrollbar-hide';
      s.textContent = `
        .dict-pills::-webkit-scrollbar { display: none; }
      `;
      document.head.appendChild(s);
    }
  }

  buildPage();
}
