import { create } from 'zustand';

// ── Supported Languages ──────────────────────────────────────────────
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  tw: 'Twi',
  ga: 'Ga',
  ee: 'Ewe',
  dag: 'Dagbani',
  ha: 'Hausa',
  fan: 'Fante',
};

// ── Language Badge Colors (Ghana-inspired) ───────────────────────────
export const LANGUAGE_COLORS: Record<string, string> = {
  en: '#4A90D9',   // Blue
  tw: '#CE1126',   // Ghana Red
  ga: '#D4A017',   // Ghana Gold
  ee: '#006B3F',   // Ghana Green
  dag: '#8B5CF6',  // Purple
  ha: '#E67E22',   // Orange
  fan: '#2D9CDB',  // Teal
};

// ── History Entry ────────────────────────────────────────────────────
export interface TranslationHistoryEntry {
  id: string;
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

// ── Offline Dictionary Type ──────────────────────────────────────────
// Each key is "en_<langCode>" mapping lowercase English phrase to translation
type DictionaryMap = Record<string, string>;

// ── Offline Dictionaries ─────────────────────────────────────────────
// English <-> Twi
const EN_TW: DictionaryMap = {
  // Greetings
  'hello': 'Helo',
  'welcome': 'Akwaaba',
  'good morning': 'Maakye',
  'good afternoon': 'Maaha',
  'good evening': 'Maadwo',
  'good night': 'Da yie',
  'thank you': 'Medaase',
  'please': 'Mepawoky\u025Bw',
  'sorry': 'Kosea',
  'excuse me': 'Mepawoky\u025Bw',
  'how are you?': 'Wo ho te s\u025Bn?',
  'i am fine': 'Me ho y\u025B',
  'goodbye': 'Nante yie',
  'yes': 'Aane',
  'no': 'Daabi',
  // Government terms
  'application': 'Adesre\u025B',
  'approval': '\u0190pene so',
  'certificate': 'Adansedie krataa',
  'department': '\u0190fekuo',
  'document': 'Nkrataa',
  'form': 'Krataa',
  'identification': 'Nky\u025Br\u025Bmu krataa',
  'license': 'Tumi krataa',
  'ministry': 'Asomafo adan',
  'office': 'Adwumay\u025Bbea',
  'passport': 'Passport krataa',
  'permit': 'Kwan',
  'receipt': 'Gyidie krataa',
  'registration': 'Ntoboase\u025B',
  'government': 'Aban',
  'president': '\u0186manhy\u025Bfo',
  'minister': '\u0186somafo',
  'law': 'Mmara',
  'policy': 'Nhyehy\u025Be\u025B',
  'public': '\u0186man',
  'service': 'Adwuma',
  // Common verbs
  'go': 'K\u0254',
  'come': 'Bra',
  'help': 'Boa',
  'pay': 'Tua',
  'sign': 'Bɔ sain',
  'submit': 'De ma',
  'wait': 'Twen',
  'write': 'Kyer\u025Bw',
  'read': 'Kenkan',
  'eat': 'Didi',
  'drink': 'Nom',
  'work': 'Adwuma',
  'sleep': 'Da',
  // Numbers
  'one': 'Baako',
  'two': 'Mmienu',
  'three': 'Mmi\u025Bnsa',
  'four': '\u0190nan',
  'five': 'Enum',
  'six': 'Nsia',
  'seven': 'Nson',
  'eight': 'Nw\u0254twe',
  'nine': 'Nkron',
  'ten': 'Edu',
  // Common words
  'money': 'Sika',
  'water': 'Nsuo',
  'food': 'Aduane',
  'house': 'Efie',
  'road': '\u0190kwan',
  'school': 'Sukuu',
  'hospital': 'Ayaresabea',
  'market': 'Dwom',
  'church': 'As\u0254re',
  'today': '\u0190nn\u025B',
  'tomorrow': '\u0186kyena',
  'yesterday': '\u0190nnora',
};

// English <-> Ga
const EN_GA: DictionaryMap = {
  // Greetings
  'hello': 'Oj\u025Bkoo',
  'welcome': 'Afi aba',
  'good morning': 'Oj\u025Bkoo',
  'good afternoon': 'Oj\u025Bwoo',
  'good evening': 'Oj\u025B oo',
  'good night': 'Oj\u025Bkum\u025B oo',
  'thank you': 'Oyiwaladonn',
  'please': 'Ak\u025B',
  'sorry': 'Haa',
  'excuse me': 'Ak\u025B',
  'how are you?': 'Te oy\u025B h\u025B?',
  'i am fine': 'Oy\u025B sh\u025B',
  'goodbye': 'Yaakey\u025B',
  'yes': 'H\u025B\u025B',
  'no': 'Daabi',
  // Government terms
  'application': 'Shikp\u0254\u014Bmo',
  'approval': 'Yed\u0254m\u0254',
  'certificate': 'Gbekut\u0254 krataa',
  'department': 'Gbeli',
  'document': 'Shikp\u0254n krataa',
  'form': 'Krataa',
  'identification': 'Hew\u0254le krataa',
  'license': 'Ahi krataa',
  'ministry': 'Mantse fie',
  'office': 'Ahafo',
  'passport': 'Passport krataa',
  'permit': 'Yef\u0254m\u0254',
  'receipt': 'Am\u025Bne krataa',
  'registration': 'Ny\u025Bbim\u0254',
  'government': 'Gbel\u025B',
  'president': 'Mantse',
  'minister': 'Mantse weku',
  'law': 'Bl\u025B',
  'policy': 'Saan\u025B',
  'public': 'Mashi',
  'service': 'Tsul\u025B',
  // Common verbs
  'go': 'Ba',
  'come': 'Yoo',
  'help': 'Kp\u025B',
  'pay': 'Tsu',
  'sign': 'Sa',
  'submit': 'Ha',
  'wait': 'Y\u025B',
  'write': 'Ŋmaa',
  'read': 'Kaane',
  'eat': 'Am\u025B',
  'drink': 'Nu',
  'work': 'Tsul\u025B',
  'sleep': 'Mi',
  // Numbers
  'one': 'Ek\u0254me',
  'two': 'Eny\u0254',
  'three': 'Et\u025B',
  'four': 'Ejwe',
  'five': 'Enum\u0254',
  'six': 'Ekp\u00e3',
  'seven': 'Ekpa\u0259wo',
  'eight': 'Ekpaany\u0254',
  'nine': 'Neen\u025B',
  'ten': 'Nyong\u014Bma',
  // Common words
  'money': 'Shika',
  'water': 'Nu',
  'food': 'Nii',
  'house': 'We',
  'road': 'Ablon',
  'school': 'Sukuu',
  'hospital': 'Hagbee',
  'market': 'Kl\u0254we\u014B',
  'church': 'Gb\u025B tsui',
  'today': '\u014Bshom\u025B',
  'tomorrow': 'Okp\u025B',
  'yesterday': 'Higb\u025B',
};

// English <-> Ewe
const EN_EE: DictionaryMap = {
  // Greetings
  'hello': '\u0190fo',
  'welcome': 'W\u0254ez\u0254',
  'good morning': '\u014Bdi',
  'good afternoon': '\u014Bd\u0254',
  'good evening': 'Fi\u025Byi',
  'good night': 'D\u0254 agbe',
  'thank you': 'Akpe',
  'please': 'Medam\u025Bwoe',
  'sorry': 'Akp\u025B',
  'excuse me': 'Taflatse',
  'how are you?': 'Ef\u0254a?',
  'i am fine': 'Meli nyuie',
  'goodbye': 'H\u025Bde nyuie',
  'yes': '\u0190\u025B',
  'no': 'Ao',
  // Government terms
  'application': 'Bia n\u025Bnu',
  'approval': 'De dzi',
  'certificate': 'Agbalẽ',
  'department': 'Akpa',
  'document': 'Agbalẽ',
  'form': 'Agbalẽ',
  'identification': 'Dzesi agbalẽ',
  'license': 'M\u0254nu agbalẽ',
  'ministry': 'D\u0254w\u0254fe',
  'office': 'D\u0254w\u0254fe',
  'passport': 'Passport agbalẽ',
  'permit': 'M\u0254nu',
  'receipt': 'Agbalẽ',
  'registration': 'Ŋl\u0254 ŋku',
  'government': 'Dukplala',
  'president': 'Duk\u0254tonu',
  'minister': 'Dukplala',
  'law': 'S\u025B',
  'policy': 'Dodo',
  'public': 'Duk\u0254',
  'service': 'Subosubo',
  // Common verbs
  'go': 'Yi',
  'come': 'Va',
  'help': 'Kpe \u0256e',
  'pay': 'Xe',
  'sign': 'D\u0254 asi',
  'submit': 'Ts\u0254',
  'wait': 'Li anyi',
  'write': 'Ŋl\u0254',
  'read': 'Xl\u025B',
  'eat': '\u0110u nu',
  'drink': 'No',
  'work': 'D\u0254 dz\u0254dzrw',
  'sleep': 'D\u0254',
  // Numbers
  'one': '\u0110eka',
  'two': 'Eve',
  'three': 'Et\u0254',
  'four': 'Ene',
  'five': 'At\u0254',
  'six': 'Ade',
  'seven': 'Adre',
  'eight': 'Enyi',
  'nine': 'Asieke',
  'ten': 'Ewo',
  // Common words
  'money': 'Ga',
  'water': 'Tsi',
  'food': 'Nu\u0256u\u0256u',
  'house': 'Xo',
  'road': 'Mo',
  'school': 'Sukuu',
  'hospital': 'Atike we',
  'market': 'Asi',
  'church': 'Xome',
  'today': 'Egbe',
  'tomorrow': 'Ets\u0254',
  'yesterday': 'Ets\u0254',
};

// English <-> Dagbani
const EN_DAG: DictionaryMap = {
  // Greetings
  'hello': 'Desba',
  'welcome': 'Antire',
  'good morning': 'Dasuba',
  'good afternoon': 'Antire',
  'good evening': 'Aniwula',
  'good night': 'Yun\u025B dahin\u025B',
  'thank you': 'Nawuni p\u025Bhim bu',
  'please': 'Sabini',
  'sorry': 'Tima ma',
  'excuse me': 'Sabini',
  'how are you?': 'A sheli alaafee?',
  'i am fine': 'Naa',
  'goodbye': 'N ta wuhi yi',
  'yes': 'Ayi',
  'no': 'Ayi',
  // Government terms
  'application': 'Suhi',
  'approval': 'S\u0254\u014Bdi',
  'certificate': 'Galikunda',
  'department': 'Tihi',
  'document': 'Galikunda',
  'form': 'Galikunda',
  'identification': 'B\u025Bhigu galikunda',
  'license': 'Nayili galikunda',
  'ministry': 'Nayili yili',
  'office': 'Tooni yili',
  'passport': 'Passport galikunda',
  'permit': 'Nayili',
  'receipt': 'Labi galikunda',
  'registration': 'Sabbu ŋaha',
  'government': 'N-naan\u025B',
  'president': 'Naa',
  'minister': 'Naa wahi',
  'law': 'Alaahi',
  'policy': 'Tumbu',
  'public': 'Niriba',
  'service': 'Tuhi',
  // Common verbs
  'go': 'Gahi',
  'come': 'Kpe',
  'help': 'Sombi',
  'pay': 'Yihi',
  'sign': 'Sabbu',
  'submit': 'Ti',
  'wait': 'G\u0254hi',
  'write': 'Sabbu',
  'read': 'K\u0254ri',
  'eat': 'Di',
  'drink': 'Nyu',
  'work': 'Tuhi',
  'sleep': 'G\u0254\u014B',
  // Numbers
  'one': 'Yini',
  'two': 'Ayi',
  'three': 'Ata',
  'four': 'Anahi',
  'five': 'Anu',
  'six': 'Ayobu',
  'seven': 'Ayopoin',
  'eight': 'Anini',
  'nine': 'Awai',
  'ten': 'Pihi',
  // Common words
  'money': 'Ligiri',
  'water': 'K\u0254m',
  'food': 'Diri',
  'house': 'Yili',
  'road': 'Sohi',
  'school': 'Sukuu',
  'hospital': 'Dagbandoo',
  'market': 'Daa',
  'church': 'Lihi yili',
  'today': 'Dinsi',
  'tomorrow': 'Suba',
  'yesterday': 'Zaa',
};

// English <-> Hausa
const EN_HA: DictionaryMap = {
  // Greetings
  'hello': 'Sannu',
  'welcome': 'Maraba',
  'good morning': 'Ina kwana',
  'good afternoon': 'Ina wuni',
  'good evening': 'Ina yini',
  'good night': 'Mu kwana lafiya',
  'thank you': 'Na gode',
  'please': 'Don Allah',
  'sorry': 'Yi hakuri',
  'excuse me': 'Don Allah',
  'how are you?': 'Ina kwana?',
  'i am fine': 'Lafiya lau',
  'goodbye': 'Sai anjima',
  'yes': 'Ii / Na\'am',
  'no': 'A\'a',
  // Government terms
  'application': 'Takarda neman',
  'approval': 'Amincewa',
  'certificate': 'Takarda sheida',
  'department': 'Sashe',
  'document': 'Takarda',
  'form': 'Fom',
  'identification': 'Takarda shaida',
  'license': 'Lasisi',
  'ministry': 'Ma\'aikatar',
  'office': 'Ofis',
  'passport': 'Fasfo',
  'permit': 'Izini',
  'receipt': 'Rasidi',
  'registration': 'Rajista',
  'government': 'Gwamnati',
  'president': 'Shugaba',
  'minister': 'Minista',
  'law': 'Doka',
  'policy': 'Manufa',
  'public': 'Jama\'a',
  'service': 'Hidima',
  // Common verbs
  'go': 'Tafi',
  'come': 'Zo',
  'help': 'Taimaka',
  'pay': 'Biya',
  'sign': 'Sa hannu',
  'submit': 'Mi\u0137a',
  'wait': 'Jira',
  'write': 'Rubuta',
  'read': 'Karanta',
  'eat': 'Ci',
  'drink': 'Sha',
  'work': 'Aiki',
  'sleep': 'Barci',
  // Numbers
  'one': 'Daya',
  'two': 'Biyu',
  'three': 'Uku',
  'four': 'Hudu',
  'five': 'Biyar',
  'six': 'Shida',
  'seven': 'Bakwai',
  'eight': 'Takwas',
  'nine': 'Tara',
  'ten': 'Goma',
  // Common words
  'money': 'Kudi',
  'water': 'Ruwa',
  'food': 'Abinci',
  'house': 'Gida',
  'road': 'Hanya',
  'school': 'Makaranta',
  'hospital': 'Asibiti',
  'market': 'Kasuwa',
  'church': 'Coci',
  'today': 'Yau',
  'tomorrow': 'Gobe',
  'yesterday': 'Jiya',
};

// English <-> Fante
const EN_FAN: DictionaryMap = {
  // Greetings
  'hello': 'Hello',
  'welcome': 'Akwaaba',
  'good morning': 'Maakye',
  'good afternoon': 'Maaha',
  'good evening': 'Maadwo',
  'good night': 'Da yie',
  'thank you': 'Medaase',
  'please': 'Mepawoky\u025Bw',
  'sorry': 'Kafra',
  'excuse me': 'Mepawoky\u025Bw',
  'how are you?': 'Wo ho te s\u025Bn?',
  'i am fine': 'Me ho y\u025B',
  'goodbye': 'Nante yie',
  'yes': 'Aane',
  'no': 'Daabi',
  // Government terms
  'application': 'Ky\u025Br\u025Bw',
  'approval': 'P\u025Bn mu',
  'certificate': 'Adansedie krataa',
  'department': '\u0190fekuo',
  'document': 'Krataa',
  'form': 'Krataa',
  'identification': 'Nky\u025Br\u025Bmu krataa',
  'license': 'Tumi krataa',
  'ministry': 'Asomafe\u025B dan',
  'office': 'Adwumay\u025Bbea',
  'passport': 'Passport krataa',
  'permit': 'Kwan',
  'receipt': 'Gyedie krataa',
  'registration': 'Ntoboase\u025B',
  'government': 'Aban',
  'president': '\u0186manhy\u025Bfo',
  'minister': '\u0186somafe\u025B',
  'law': 'Mmara',
  'policy': 'Nhyehy\u025Be\u025B',
  'public': '\u0186man',
  'service': 'Adwuma',
  // Common verbs
  'go': 'K\u0254',
  'come': 'Bra',
  'help': 'Boa',
  'pay': 'Tua',
  'sign': 'B\u0254 sain',
  'submit': 'De ma',
  'wait': 'Tw\u025Bn',
  'write': 'Kyerew',
  'read': 'Kenkan',
  'eat': 'Didi',
  'drink': 'Nom',
  'work': 'Adwuma',
  'sleep': 'Da',
  // Numbers
  'one': 'Eku',
  'two': 'Abien',
  'three': 'Abiasa',
  'four': 'Anan',
  'five': 'Anum',
  'six': 'Esia',
  'seven': 'Ason',
  'eight': 'Ew\u0254twe',
  'nine': 'Akron',
  'ten': 'Edu',
  // Common words
  'money': 'Sika',
  'water': 'Nsuo',
  'food': 'Aduane',
  'house': 'Efie',
  'road': '\u0190kwan',
  'school': 'Sukuu',
  'hospital': 'Ayaresabea',
  'market': 'Eguafo',
  'church': 'As\u0254re',
  'today': '\u0190nn\u025B',
  'tomorrow': '\u0186kyena',
  'yesterday': '\u0190nnora',
};

// ── All Dictionaries Indexed ─────────────────────────────────────────
const DICTIONARIES: Record<string, DictionaryMap> = {
  en_tw: EN_TW,
  en_ga: EN_GA,
  en_ee: EN_EE,
  en_dag: EN_DAG,
  en_ha: EN_HA,
  en_fan: EN_FAN,
};

/**
 * Look up a phrase in the offline dictionary.
 * Supports en->target, target->en, and target->target (via English pivot).
 */
function offlineTranslate(text: string, fromLang: string, toLang: string): string | null {
  const query = text.toLowerCase().trim();
  if (!query) return null;

  // Direct en -> target
  if (fromLang === 'en') {
    const dict = DICTIONARIES[`en_${toLang}`];
    if (dict && dict[query]) return dict[query];
    // Try partial/closest match
    if (dict) {
      const keys = Object.keys(dict);
      const match = keys.find(k => k.includes(query) || query.includes(k));
      if (match) return dict[match];
    }
    return null;
  }

  // Target -> en (reverse lookup)
  if (toLang === 'en') {
    const dict = DICTIONARIES[`en_${fromLang}`];
    if (dict) {
      const entry = Object.entries(dict).find(
        ([, v]) => v.toLowerCase() === query
      );
      if (entry) return entry[0].charAt(0).toUpperCase() + entry[0].slice(1);
      // Partial match
      const partial = Object.entries(dict).find(
        ([, v]) => v.toLowerCase().includes(query) || query.includes(v.toLowerCase())
      );
      if (partial) return partial[0].charAt(0).toUpperCase() + partial[0].slice(1);
    }
    return null;
  }

  // Target -> target (pivot through English)
  const dictFrom = DICTIONARIES[`en_${fromLang}`];
  const dictTo = DICTIONARIES[`en_${toLang}`];
  if (dictFrom && dictTo) {
    // First find English equivalent
    const enEntry = Object.entries(dictFrom).find(
      ([, v]) => v.toLowerCase() === query
    );
    if (enEntry) {
      const enWord = enEntry[0];
      if (dictTo[enWord]) return dictTo[enWord];
    }
  }
  return null;
}

/** Count phrases available for a language pair */
export function getDictionaryCount(langCode: string): number {
  const dict = DICTIONARIES[`en_${langCode}`];
  return dict ? Object.keys(dict).length : 0;
}

// ── Store ────────────────────────────────────────────────────────────
interface TranslationState {
  sourceLanguage: string;
  targetLanguage: string;
  inputText: string;
  translatedText: string;
  isTranslating: boolean;
  history: TranslationHistoryEntry[];

  setSourceLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setInputText: (text: string) => void;
  translate: () => void;
  swapLanguages: () => void;
  clearHistory: () => void;
  reTranslate: (entry: TranslationHistoryEntry) => void;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  sourceLanguage: 'en',
  targetLanguage: 'tw',
  inputText: '',
  translatedText: '',
  isTranslating: false,
  history: [],

  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setInputText: (text) => set({ inputText: text }),

  translate: () => {
    const { inputText, sourceLanguage, targetLanguage, history } = get();
    if (!inputText.trim()) return;

    set({ isTranslating: true });

    // Simulate brief delay for UX
    setTimeout(() => {
      const result = offlineTranslate(inputText, sourceLanguage, targetLanguage);

      const translatedText = result
        ? result
        : `[Offline] No match found for "${inputText}". Full translation requires internet connection. Try AskOzzy for AI translation.`;

      const entry: TranslationHistoryEntry = {
        id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: inputText,
        target: result || '',
        sourceLang: sourceLanguage,
        targetLang: targetLanguage,
        timestamp: Date.now(),
      };

      set({
        translatedText,
        isTranslating: false,
        history: [entry, ...history].slice(0, 20),
      });
    }, 300);
  },

  swapLanguages: () => {
    const { sourceLanguage, targetLanguage } = get();
    set({
      sourceLanguage: targetLanguage,
      targetLanguage: sourceLanguage,
      inputText: '',
      translatedText: '',
    });
  },

  clearHistory: () => set({ history: [] }),

  reTranslate: (entry) => {
    set({
      sourceLanguage: entry.sourceLang,
      targetLanguage: entry.targetLang,
      inputText: entry.source,
    });
    // Trigger translate after state update
    setTimeout(() => get().translate(), 0);
  },
}));
