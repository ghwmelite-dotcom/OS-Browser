// ── Word Bank for Word Scramble ──────────────────────────────────────

export interface WordEntry {
  word: string;
  category: string;
  hint?: string;
  meaning?: string;
}

export const wordBank: WordEntry[] = [
  // ── English Common (50) ────────────────────────────────────────────
  { word: 'government', category: 'English Common', hint: 'The ruling body of a nation' },
  { word: 'parliament', category: 'English Common', hint: 'Legislative assembly' },
  { word: 'democracy', category: 'English Common', hint: 'Rule by the people' },
  { word: 'education', category: 'English Common', hint: 'The process of learning' },
  { word: 'agriculture', category: 'English Common', hint: 'Farming and cultivation' },
  { word: 'technology', category: 'English Common', hint: 'Application of science' },
  { word: 'development', category: 'English Common', hint: 'Growth and progress' },
  { word: 'constitution', category: 'English Common', hint: 'Supreme law of the land' },
  { word: 'infrastructure', category: 'English Common', hint: 'Roads, bridges, and systems' },
  { word: 'procurement', category: 'English Common', hint: 'Buying goods and services' },
  { word: 'community', category: 'English Common', hint: 'A group of people living together' },
  { word: 'republic', category: 'English Common', hint: 'A form of government' },
  { word: 'election', category: 'English Common', hint: 'Choosing leaders by voting' },
  { word: 'leadership', category: 'English Common', hint: 'Guiding and directing others' },
  { word: 'administration', category: 'English Common', hint: 'Managing an organization' },
  { word: 'welfare', category: 'English Common', hint: 'Health and happiness of people' },
  { word: 'security', category: 'English Common', hint: 'Protection from danger' },
  { word: 'economy', category: 'English Common', hint: 'System of production and trade' },
  { word: 'industry', category: 'English Common', hint: 'Manufacturing sector' },
  { word: 'transport', category: 'English Common', hint: 'Moving people and goods' },
  { word: 'legislation', category: 'English Common', hint: 'Laws enacted by a legislature' },
  { word: 'judiciary', category: 'English Common', hint: 'Court system' },
  { word: 'executive', category: 'English Common', hint: 'Branch that enforces laws' },
  { word: 'commission', category: 'English Common', hint: 'An official group given authority' },
  { word: 'regulation', category: 'English Common', hint: 'Rules imposed by authority' },
  { word: 'diplomacy', category: 'English Common', hint: 'International relations' },
  { word: 'revenue', category: 'English Common', hint: 'Income, especially of a government' },
  { word: 'investment', category: 'English Common', hint: 'Putting money into assets' },
  { word: 'healthcare', category: 'English Common', hint: 'Medical services' },
  { word: 'environment', category: 'English Common', hint: 'Natural surroundings' },
  { word: 'sanitation', category: 'English Common', hint: 'Maintaining clean conditions' },
  { word: 'transparency', category: 'English Common', hint: 'Openness in government' },
  { word: 'accountability', category: 'English Common', hint: 'Being responsible for actions' },
  { word: 'sovereignty', category: 'English Common', hint: 'Supreme power of a state' },
  { word: 'citizenship', category: 'English Common', hint: 'Being a member of a nation' },
  { word: 'immigration', category: 'English Common', hint: 'Moving to another country' },
  { word: 'employment', category: 'English Common', hint: 'Having a paid job' },
  { word: 'agriculture', category: 'English Common', hint: 'Science of farming' },
  { word: 'population', category: 'English Common', hint: 'Total number of people' },
  { word: 'legislation', category: 'English Common', hint: 'Written laws' },
  { word: 'enterprise', category: 'English Common', hint: 'A business or company' },
  { word: 'convention', category: 'English Common', hint: 'A formal agreement' },
  { word: 'federation', category: 'English Common', hint: 'Union of states' },
  { word: 'department', category: 'English Common', hint: 'A division of an organization' },
  { word: 'bureaucracy', category: 'English Common', hint: 'Administrative system' },
  { word: 'amendment', category: 'English Common', hint: 'A change to a law' },
  { word: 'manifesto', category: 'English Common', hint: 'A public declaration of policy' },
  { word: 'candidate', category: 'English Common', hint: 'Person seeking office' },
  { word: 'coalition', category: 'English Common', hint: 'Alliance of parties' },
  { word: 'advocate', category: 'English Common', hint: 'One who supports a cause' },

  // ── Twi Words (30) ────────────────────────────────────────────────
  { word: 'akwaaba', category: 'Twi', meaning: 'Welcome', hint: 'Greeting for visitors' },
  { word: 'medaase', category: 'Twi', meaning: 'Thank you', hint: 'Expression of gratitude' },
  { word: 'adwuma', category: 'Twi', meaning: 'Work', hint: 'Daily labor' },
  { word: 'aduane', category: 'Twi', meaning: 'Food', hint: 'What we eat' },
  { word: 'efie', category: 'Twi', meaning: 'Home', hint: 'Where you live' },
  { word: 'sukuu', category: 'Twi', meaning: 'School', hint: 'Place of learning' },
  { word: 'maame', category: 'Twi', meaning: 'Mother', hint: 'Female parent' },
  { word: 'agya', category: 'Twi', meaning: 'Father', hint: 'Male parent' },
  { word: 'nkrabea', category: 'Twi', meaning: 'Destiny', hint: 'Your fate' },
  { word: 'nyame', category: 'Twi', meaning: 'God', hint: 'Supreme being' },
  { word: 'oman', category: 'Twi', meaning: 'Nation', hint: 'A country' },
  { word: 'ahemfo', category: 'Twi', meaning: 'Chiefs', hint: 'Traditional leaders' },
  { word: 'afahye', category: 'Twi', meaning: 'Festival', hint: 'Cultural celebration' },
  { word: 'odo', category: 'Twi', meaning: 'Love', hint: 'Deep affection' },
  { word: 'asomdwoe', category: 'Twi', meaning: 'Peace', hint: 'Absence of conflict' },
  { word: 'nimdefo', category: 'Twi', meaning: 'Wise person', hint: 'One with great knowledge' },
  { word: 'abusua', category: 'Twi', meaning: 'Family', hint: 'Related people' },
  { word: 'adinkra', category: 'Twi', meaning: 'Symbols', hint: 'Visual representation' },
  { word: 'kente', category: 'Twi', meaning: 'Cloth', hint: 'Traditional woven fabric' },
  { word: 'sankofa', category: 'Twi', meaning: 'Go back and get it', hint: 'Learn from the past' },
  { word: 'aseda', category: 'Twi', meaning: 'Thanksgiving', hint: 'Giving thanks' },
  { word: 'kokroko', category: 'Twi', meaning: 'Greatness', hint: 'Being great' },
  { word: 'ahoofeden', category: 'Twi', meaning: 'Bravery', hint: 'Courage' },
  { word: 'akokoduru', category: 'Twi', meaning: 'Courage', hint: 'Heart of a hen (brave)' },
  { word: 'fawohodie', category: 'Twi', meaning: 'Independence', hint: 'Freedom' },
  { word: 'nkonsonkonson', category: 'Twi', meaning: 'Unity', hint: 'Chain link symbol' },
  { word: 'dwennimmen', category: 'Twi', meaning: 'Humility with strength', hint: 'Ram horns symbol' },
  { word: 'denkyem', category: 'Twi', meaning: 'Adaptability', hint: 'Crocodile symbol' },
  { word: 'ananse', category: 'Twi', meaning: 'Spider', hint: 'Wisdom in folklore' },
  { word: 'obrempong', category: 'Twi', meaning: 'Great person', hint: 'Title of honor' },

  // ── Ghana Geography (30) ──────────────────────────────────────────
  { word: 'kumasi', category: 'Ghana Geography', hint: 'Capital of Ashanti Region' },
  { word: 'tamale', category: 'Ghana Geography', hint: 'Capital of Northern Region' },
  { word: 'accra', category: 'Ghana Geography', hint: 'Capital city of Ghana' },
  { word: 'volta', category: 'Ghana Geography', hint: 'Region named after a river and lake' },
  { word: 'ashanti', category: 'Ghana Geography', hint: 'Kingdom of the Golden Stool' },
  { word: 'takoradi', category: 'Ghana Geography', hint: 'Twin city with Sekondi' },
  { word: 'sekondi', category: 'Ghana Geography', hint: 'Twin city with Takoradi' },
  { word: 'cape coast', category: 'Ghana Geography', hint: 'Historical coastal city with castle' },
  { word: 'bolgatanga', category: 'Ghana Geography', hint: 'Capital of Upper East Region' },
  { word: 'sunyani', category: 'Ghana Geography', hint: 'Capital of Bono Region' },
  { word: 'koforidua', category: 'Ghana Geography', hint: 'Capital of Eastern Region' },
  { word: 'ho', category: 'Ghana Geography', hint: 'Capital of Volta Region' },
  { word: 'tema', category: 'Ghana Geography', hint: 'Major port city near Accra' },
  { word: 'obuasi', category: 'Ghana Geography', hint: 'Gold mining town' },
  { word: 'elmina', category: 'Ghana Geography', hint: 'Oldest European building in sub-Saharan Africa' },
  { word: 'kakum', category: 'Ghana Geography', hint: 'Famous national park with canopy walkway' },
  { word: 'mole', category: 'Ghana Geography', hint: 'National park with elephants' },
  { word: 'afram', category: 'Ghana Geography', hint: 'Plains in Eastern Region' },
  { word: 'ankobra', category: 'Ghana Geography', hint: 'River in Western Region' },
  { word: 'tano', category: 'Ghana Geography', hint: 'Sacred river in Ghana' },
  { word: 'pra', category: 'Ghana Geography', hint: 'River that flows to the Gulf' },
  { word: 'kibi', category: 'Ghana Geography', hint: 'Town in Eastern Region' },
  { word: 'winneba', category: 'Ghana Geography', hint: 'Coastal town, university city' },
  { word: 'nkawkaw', category: 'Ghana Geography', hint: 'Town on the Kwahu escarpment' },
  { word: 'bawku', category: 'Ghana Geography', hint: 'Town in Upper East Region' },
  { word: 'yendi', category: 'Ghana Geography', hint: 'Capital of Dagbon' },
  { word: 'navrongo', category: 'Ghana Geography', hint: 'Town near Burkina Faso border' },
  { word: 'tarkwa', category: 'Ghana Geography', hint: 'Gold mining town in Western Region' },
  { word: 'nsawam', category: 'Ghana Geography', hint: 'Town on Accra-Kumasi road' },
  { word: 'axim', category: 'Ghana Geography', hint: 'Coastal town in Western Region' },

  // ── Ghana History (30) ────────────────────────────────────────────
  { word: 'nkrumah', category: 'Ghana History', hint: 'First President of Ghana' },
  { word: 'independence', category: 'Ghana History', hint: 'Achieved on March 6, 1957' },
  { word: 'republic', category: 'Ghana History', hint: 'Ghana became one on July 1, 1960' },
  { word: 'cocoa', category: 'Ghana History', hint: 'Cash crop that built the economy' },
  { word: 'goldcoast', category: 'Ghana History', hint: 'Colonial name of Ghana' },
  { word: 'danquah', category: 'Ghana History', hint: 'Co-founder of UGCC' },
  { word: 'guggisberg', category: 'Ghana History', hint: 'Governor who built Korle Bu and Achimota' },
  { word: 'achimota', category: 'Ghana History', hint: 'Famous school established in 1927' },
  { word: 'christiansborg', category: 'Ghana History', hint: 'Castle used as seat of government' },
  { word: 'convention', category: 'Ghana History', hint: 'UGCC — United Gold Coast ___' },
  { word: 'rawlings', category: 'Ghana History', hint: 'Led revolutions in 1979 and 1981' },
  { word: 'agyeman', category: 'Ghana History', hint: 'Prempeh I, exiled Ashanti king' },
  { word: 'yaa asantewaa', category: 'Ghana History', hint: 'Queen Mother who fought the British' },
  { word: 'flagstaff', category: 'Ghana History', hint: 'House — official residence of president' },
  { word: 'togoland', category: 'Ghana History', hint: 'Territory that joined Ghana in 1956 plebiscite' },
  { word: 'akosombo', category: 'Ghana History', hint: 'Dam that created Lake Volta' },
  { word: 'valco', category: 'Ghana History', hint: 'Volta Aluminium Company' },
  { word: 'carbon', category: 'Ghana History', hint: 'Carbon market — historic Accra market' },
  { word: 'okomfo', category: 'Ghana History', hint: 'Anokye — legendary Ashanti priest' },
  { word: 'asafo', category: 'Ghana History', hint: 'Warrior companies of the Fante' },
  { word: 'bondwire', category: 'Ghana History', hint: 'Where the bond of 1844 was signed' },
  { word: 'prempeh', category: 'Ghana History', hint: 'Ashanti king exiled by the British' },
  { word: 'osagyefo', category: 'Ghana History', hint: 'Title meaning "redeemer"' },
  { word: 'uhuru', category: 'Ghana History', hint: 'Swahili for freedom, Pan-African ideal' },
  { word: 'panafricanism', category: 'Ghana History', hint: 'Nkrumah\'s vision for African unity' },
  { word: 'plebiscite', category: 'Ghana History', hint: 'Vote for Trans-Volta Togoland to join Ghana' },
  { word: 'cocobod', category: 'Ghana History', hint: 'Ghana Cocoa Board' },
  { word: 'makola', category: 'Ghana History', hint: 'Famous market in Accra' },
  { word: 'korlebu', category: 'Ghana History', hint: 'Largest hospital in Ghana' },
  { word: 'legon', category: 'Ghana History', hint: 'Location of the University of Ghana' },

  // ── Civil Service Terms (30) ──────────────────────────────────────
  { word: 'procurement', category: 'Civil Service', hint: 'Process of purchasing' },
  { word: 'budget', category: 'Civil Service', hint: 'Financial plan' },
  { word: 'circular', category: 'Civil Service', hint: 'Official communication' },
  { word: 'gazette', category: 'Civil Service', hint: 'Official publication' },
  { word: 'ministry', category: 'Civil Service', hint: 'Government department' },
  { word: 'directive', category: 'Civil Service', hint: 'Official order' },
  { word: 'audit', category: 'Civil Service', hint: 'Financial inspection' },
  { word: 'pension', category: 'Civil Service', hint: 'Retirement benefit' },
  { word: 'tenure', category: 'Civil Service', hint: 'Period of holding office' },
  { word: 'protocol', category: 'Civil Service', hint: 'Official procedure' },
  { word: 'memorandum', category: 'Civil Service', hint: 'Written message in business' },
  { word: 'portfolio', category: 'Civil Service', hint: 'Area of responsibility' },
  { word: 'gazette', category: 'Civil Service', hint: 'Official government journal' },
  { word: 'mandate', category: 'Civil Service', hint: 'Authority given to act' },
  { word: 'dispatch', category: 'Civil Service', hint: 'Official communication sent' },
  { word: 'tariff', category: 'Civil Service', hint: 'Tax on imports' },
  { word: 'subsidy', category: 'Civil Service', hint: 'Government financial aid' },
  { word: 'quorum', category: 'Civil Service', hint: 'Minimum number for meeting' },
  { word: 'ratify', category: 'Civil Service', hint: 'Formally approve' },
  { word: 'stipend', category: 'Civil Service', hint: 'Fixed regular payment' },
  { word: 'emolument', category: 'Civil Service', hint: 'Salary or fee' },
  { word: 'ordinance', category: 'Civil Service', hint: 'Municipal law' },
  { word: 'dossier', category: 'Civil Service', hint: 'Collection of documents' },
  { word: 'addendum', category: 'Civil Service', hint: 'Additional material' },
  { word: 'affidavit', category: 'Civil Service', hint: 'Sworn written statement' },
  { word: 'moratorium', category: 'Civil Service', hint: 'Temporary suspension' },
  { word: 'tribunal', category: 'Civil Service', hint: 'Court or forum for justice' },
  { word: 'ombudsman', category: 'Civil Service', hint: 'Investigates complaints' },
  { word: 'requisition', category: 'Civil Service', hint: 'Formal order for supplies' },
  { word: 'decentralize', category: 'Civil Service', hint: 'Transfer power to local bodies' },

  // ── General Knowledge (30) ────────────────────────────────────────
  { word: 'science', category: 'General Knowledge', hint: 'Systematic study of nature' },
  { word: 'mathematics', category: 'General Knowledge', hint: 'Study of numbers and shapes' },
  { word: 'computer', category: 'General Knowledge', hint: 'Electronic computing device' },
  { word: 'internet', category: 'General Knowledge', hint: 'Global network of networks' },
  { word: 'browser', category: 'General Knowledge', hint: 'Software for viewing websites' },
  { word: 'algorithm', category: 'General Knowledge', hint: 'Step-by-step procedure' },
  { word: 'database', category: 'General Knowledge', hint: 'Organized collection of data' },
  { word: 'software', category: 'General Knowledge', hint: 'Programs that run on computers' },
  { word: 'hardware', category: 'General Knowledge', hint: 'Physical computer components' },
  { word: 'network', category: 'General Knowledge', hint: 'Connected group of computers' },
  { word: 'encryption', category: 'General Knowledge', hint: 'Converting data to secret code' },
  { word: 'satellite', category: 'General Knowledge', hint: 'Object orbiting Earth' },
  { word: 'telescope', category: 'General Knowledge', hint: 'Instrument for distant viewing' },
  { word: 'molecule', category: 'General Knowledge', hint: 'Smallest unit of a compound' },
  { word: 'chromosome', category: 'General Knowledge', hint: 'DNA structure in cells' },
  { word: 'evolution', category: 'General Knowledge', hint: 'Change in species over time' },
  { word: 'geography', category: 'General Knowledge', hint: 'Study of Earth and its features' },
  { word: 'philosophy', category: 'General Knowledge', hint: 'Study of fundamental questions' },
  { word: 'literature', category: 'General Knowledge', hint: 'Written works of art' },
  { word: 'astronomy', category: 'General Knowledge', hint: 'Study of celestial objects' },
  { word: 'photosynthesis', category: 'General Knowledge', hint: 'How plants make food' },
  { word: 'ecosystem', category: 'General Knowledge', hint: 'Community of living things' },
  { word: 'peninsula', category: 'General Knowledge', hint: 'Land surrounded by water on three sides' },
  { word: 'continent', category: 'General Knowledge', hint: 'Large landmass' },
  { word: 'equator', category: 'General Knowledge', hint: 'Imaginary line around Earth' },
  { word: 'hemisphere', category: 'General Knowledge', hint: 'Half of the Earth' },
  { word: 'currency', category: 'General Knowledge', hint: 'System of money' },
  { word: 'democracy', category: 'General Knowledge', hint: 'Government by the people' },
  { word: 'civilization', category: 'General Knowledge', hint: 'Advanced human society' },
  { word: 'archaeology', category: 'General Knowledge', hint: 'Study of ancient human life' },
];

/** Get a random subset of words from the bank */
export function getRandomWords(count: number, category?: string): WordEntry[] {
  let pool = category ? wordBank.filter((w) => w.category === category) : [...wordBank];
  const result: WordEntry[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

/** Scramble a word — guarantees the result is different from the original */
export function scrambleWord(word: string): string {
  const letters = word.replace(/\s/g, '').split('');
  if (letters.length <= 1) return word;
  let scrambled: string;
  let attempts = 0;
  do {
    scrambled = letters
      .map((l, i) => ({ l, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.l)
      .join('');
    attempts++;
  } while (scrambled.toLowerCase() === word.replace(/\s/g, '').toLowerCase() && attempts < 50);
  return scrambled;
}

/** Get unique categories */
export function getCategories(): string[] {
  return [...new Set(wordBank.map((w) => w.category))];
}
