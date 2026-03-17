// ── Typing Speed Text Bank ───────────────────────────────────────────

export interface TypingPassage {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const typingTexts: TypingPassage[] = [
  // ══════════════════════════════════════════════════════════════════
  // GHANA-RELATED (10)
  // ══════════════════════════════════════════════════════════════════
  {
    text: 'Ghana gained independence from Britain on March 6, 1957, becoming the first sub-Saharan African country to achieve self-governance. Kwame Nkrumah led the nation through this historic transition and became the first President of the Republic.',
    category: 'Ghana',
    difficulty: 'easy',
  },
  {
    text: 'Lake Volta, created by the Akosombo Dam, is the largest artificial lake in the world by surface area. It covers approximately 8,502 square kilometers and provides hydroelectric power to Ghana and neighboring countries in West Africa.',
    category: 'Ghana',
    difficulty: 'medium',
  },
  {
    text: 'The Ashanti Kingdom, centered in Kumasi, is one of the most powerful traditional states in Ghana. The Golden Stool, believed to contain the spirit of the Ashanti people, remains a powerful symbol of unity and identity to this day.',
    category: 'Ghana',
    difficulty: 'medium',
  },
  {
    text: 'Ghana is the second largest producer of cocoa in the world. The cocoa industry has been central to the nation\'s economy since Tetteh Quarshie brought cocoa beans from Fernando Po in 1879 and planted them in the Eastern Region.',
    category: 'Ghana',
    difficulty: 'medium',
  },
  {
    text: 'The 1992 Constitution of Ghana established the Fourth Republic and provides for a multi-party democratic system with an executive president, a parliament of 275 members, and an independent judiciary headed by the Supreme Court.',
    category: 'Ghana',
    difficulty: 'hard',
  },
  {
    text: 'Accra, the capital city of Ghana, sits on the Gulf of Guinea coast. It serves as the economic and administrative center of the nation, hosting major institutions including the Flagstaff House, Parliament House, and the Supreme Court.',
    category: 'Ghana',
    difficulty: 'easy',
  },
  {
    text: 'Kente cloth, a handwoven fabric originating from the Ashanti and Ewe peoples, features vibrant geometric patterns with symbolic meanings. Each pattern tells a story, conveying messages about history, philosophy, and social values.',
    category: 'Ghana',
    difficulty: 'medium',
  },
  {
    text: 'Ghana\'s sixteen regions each have distinct cultural identities and economic strengths. From the cocoa-rich Ashanti Region to the shea-producing Northern Savannah, the country\'s diversity is one of its greatest assets for development.',
    category: 'Ghana',
    difficulty: 'hard',
  },
  {
    text: 'Adinkra symbols are visual representations of concepts and aphorisms created by the Akan people of Ghana. Gye Nyame, meaning "except for God," is the most widely used symbol, reflecting the deep spiritual values of Ghanaian culture.',
    category: 'Ghana',
    difficulty: 'medium',
  },
  {
    text: 'Cape Coast Castle and Elmina Castle are UNESCO World Heritage Sites that stand as solemn reminders of the transatlantic slave trade. Today they serve as museums and memorials, drawing visitors from around the world.',
    category: 'Ghana',
    difficulty: 'easy',
  },

  // ══════════════════════════════════════════════════════════════════
  // CIVIL SERVICE (10)
  // ══════════════════════════════════════════════════════════════════
  {
    text: 'Public administration in Ghana involves the management of government programs and the implementation of public policy. Civil servants play a crucial role in ensuring that government services reach all citizens effectively.',
    category: 'Civil Service',
    difficulty: 'easy',
  },
  {
    text: 'Good governance requires transparency, accountability, and the rule of law. Public institutions must operate with integrity and serve the interests of all citizens, regardless of political affiliation, ethnicity, or social status.',
    category: 'Civil Service',
    difficulty: 'medium',
  },
  {
    text: 'The procurement process in government must follow established guidelines to ensure value for money and prevent corruption. The Public Procurement Authority oversees all public procurement activities and enforces compliance with the law.',
    category: 'Civil Service',
    difficulty: 'medium',
  },
  {
    text: 'Budget preparation is a critical function of the Ministry of Finance. The annual budget outlines revenue projections and expenditure plans, allocating resources to priority sectors such as education, health, and infrastructure development.',
    category: 'Civil Service',
    difficulty: 'medium',
  },
  {
    text: 'Decentralization in Ghana aims to bring governance closer to the people through the district assembly system. Metropolitan, municipal, and district assemblies are responsible for local planning, budgeting, and service delivery in their jurisdictions.',
    category: 'Civil Service',
    difficulty: 'hard',
  },
  {
    text: 'The Office of the Head of Civil Service coordinates the activities of all government ministries, departments, and agencies. It ensures that public service delivery standards are maintained and that civil servants are well-trained.',
    category: 'Civil Service',
    difficulty: 'medium',
  },
  {
    text: 'Performance management in the public sector involves setting clear objectives, monitoring progress, and evaluating outcomes. Regular performance reviews help identify areas for improvement and ensure that public resources are used efficiently.',
    category: 'Civil Service',
    difficulty: 'medium',
  },
  {
    text: 'The Auditor-General is responsible for auditing all public accounts and reporting findings to Parliament. This independent oversight function is essential for maintaining fiscal discipline and detecting mismanagement of public funds.',
    category: 'Civil Service',
    difficulty: 'hard',
  },
  {
    text: 'Public policy development involves research, consultation, and analysis to address societal challenges. Evidence-based policymaking ensures that government interventions are effective, efficient, and responsive to the needs of citizens.',
    category: 'Civil Service',
    difficulty: 'hard',
  },
  {
    text: 'Records management is fundamental to effective public administration. Proper filing, archiving, and retrieval of documents ensures institutional memory and supports decision-making processes across all levels of government.',
    category: 'Civil Service',
    difficulty: 'easy',
  },

  // ══════════════════════════════════════════════════════════════════
  // TECHNOLOGY (5)
  // ══════════════════════════════════════════════════════════════════
  {
    text: 'Digital literacy is the ability to use information and communication technologies to find, evaluate, create, and communicate information. In today\'s world, these skills are essential for participating in the modern economy.',
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    text: 'A computer consists of hardware and software components working together. The central processing unit executes instructions, random access memory stores temporary data, and storage drives keep files and programs permanently.',
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    text: 'Cybersecurity involves protecting computer systems, networks, and data from unauthorized access or attacks. Strong passwords, regular software updates, and awareness of phishing attempts are basic practices everyone should follow.',
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    text: 'Cloud computing enables users to access computing resources over the internet instead of relying on local hardware. This technology has transformed how organizations store data, run applications, and collaborate across distances.',
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    text: 'Artificial intelligence systems can analyze large datasets, recognize patterns, and make predictions that assist human decision-making. From healthcare diagnostics to financial forecasting, AI is reshaping industries across the globe.',
    category: 'Technology',
    difficulty: 'hard',
  },

  // ══════════════════════════════════════════════════════════════════
  // CLASSIC EXERCISES (5)
  // ══════════════════════════════════════════════════════════════════
  {
    text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump. The five boxing wizards jump quickly at dawn.',
    category: 'Classic',
    difficulty: 'easy',
  },
  {
    text: 'the and for are but not you all any can had her was one our out day get has him his how its may new now old see way who did got let say she too use.',
    category: 'Classic',
    difficulty: 'easy',
  },
  {
    text: 'asdfjkl; asdfjkl; the quick brown fox jumps over the lazy dog again and again. typing is a skill that improves with practice. keep your fingers on the home row keys.',
    category: 'Classic',
    difficulty: 'easy',
  },
  {
    text: 'Programming requires attention to detail and logical thinking. Semicolons, brackets, and parentheses must be placed correctly: function greet(name) { return "Hello, " + name + "!"; } is valid code.',
    category: 'Classic',
    difficulty: 'hard',
  },
  {
    text: 'Practice makes progress, not perfection. Every keystroke builds muscle memory. Focus on accuracy first, then gradually increase your speed. Rest your wrists and take breaks to prevent strain.',
    category: 'Classic',
    difficulty: 'easy',
  },
];

/** Pick a random passage, optionally filtered by category or difficulty */
export function pickPassage(category?: string, difficulty?: string): TypingPassage {
  let pool = [...typingTexts];
  if (category) pool = pool.filter((p) => p.category === category);
  if (difficulty) pool = pool.filter((p) => p.difficulty === difficulty);
  if (pool.length === 0) pool = [...typingTexts];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get unique categories */
export function getTypingCategories(): string[] {
  return [...new Set(typingTexts.map((t) => t.category))];
}
