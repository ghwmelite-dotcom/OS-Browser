import { create } from 'zustand';

interface AIAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

interface AIActionsState {
  actions: AIAction[];
  lastResult: string | null;
  isProcessing: boolean;
  activeAction: string | null;
  showResults: boolean;
  executeAction: (actionId: string, pageContent: string, pageUrl: string) => Promise<void>;
  clearResult: () => void;
}

const BUILT_IN_ACTIONS: AIAction[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Condense into 5 bullet points',
    icon: 'FileText',
    systemPrompt: 'You are a summarization assistant. Summarize the following web page content into exactly 5 concise bullet points. Each bullet should capture a key idea. Be direct and factual.',
  },
  {
    id: 'extract-contacts',
    label: 'Extract Contacts',
    description: 'Find names, emails, phone numbers',
    icon: 'Users',
    systemPrompt: 'Extract all contact information from this page: names, email addresses, phone numbers, social media handles, and physical addresses. Format each contact clearly. If none found, say "No contact information found."',
  },
  {
    id: 'extract-dates',
    label: 'Extract Dates',
    description: 'Find deadlines and time-sensitive info',
    icon: 'Calendar',
    systemPrompt: 'Extract all dates, deadlines, and time-sensitive information from this page. List each with context (what the date refers to). Sort chronologically. If none found, say "No dates or deadlines found."',
  },
  {
    id: 'explain-simply',
    label: 'Simplify',
    description: 'Rewrite at a 6th grade level',
    icon: 'BookOpen',
    systemPrompt: 'Rewrite the main content of this page at a 6th grade reading level. Use simple words, short sentences, and clear explanations. Maintain the key information but make it accessible to a younger reader.',
  },
  {
    id: 'extract-tables',
    label: 'Extract Tables',
    description: 'Pull tabular data as CSV',
    icon: 'Table',
    systemPrompt: 'Extract all tabular data from this page and format it as CSV. Each table should have clear headers. If data is in lists or comparisons, convert to table format. If no tabular data exists, say "No tabular data found."',
  },
  {
    id: 'draft-email',
    label: 'Draft Email',
    description: 'Write a professional email from this page',
    icon: 'Mail',
    systemPrompt: 'Based on this page\'s content, draft a professional email. Include a clear subject line, greeting, body that references key points from the page, and a professional closing. The tone should be business-appropriate.',
  },
  {
    id: 'key-facts',
    label: 'Key Facts',
    description: 'List the 10 most important facts',
    icon: 'ListChecks',
    systemPrompt: 'List the 10 most important facts from this page. Each fact should be a single clear statement. Number them 1-10 in order of importance. Be specific and include relevant data points.',
  },
  {
    id: 'compare',
    label: 'Compare',
    description: 'Compare items, prices, or options',
    icon: 'Scale',
    systemPrompt: 'Extract and compare all items, products, prices, plans, or options mentioned on this page. Create a structured comparison highlighting differences, pros/cons, and pricing. Format as a clear comparison table or list.',
  },
  {
    id: 'translate-summary',
    label: 'Translate (Twi)',
    description: 'Summarize in English, then translate to Twi',
    icon: 'Languages',
    systemPrompt: 'First, provide a brief 3-sentence summary of this page in simple English. Then translate that summary into Twi (Akan). Label each section clearly as "English Summary:" and "Twi Translation:".',
  },
  {
    id: 'action-items',
    label: 'Action Items',
    description: 'Extract all tasks and to-dos',
    icon: 'CheckSquare',
    systemPrompt: 'Extract all action items, tasks, to-dos, and things that need to be done from this page. Format as a numbered checklist. Include who is responsible (if mentioned) and any deadlines. If none found, say "No action items found."',
  },
];

export const useAIActionsStore = create<AIActionsState>((set, get) => ({
  actions: BUILT_IN_ACTIONS,
  lastResult: null,
  isProcessing: false,
  activeAction: null,
  showResults: false,

  executeAction: async (actionId: string, pageContent: string, pageUrl: string) => {
    const { actions } = get();
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    set({ isProcessing: true, activeAction: actionId, showResults: true, lastResult: null });

    try {
      const response = await (window as any).osBrowser.ai.chat({
        message: `Analyze this web page (${pageUrl}):\n\n${pageContent.slice(0, 8000)}`,
        model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        system_prompt: action.systemPrompt,
        conversation_history: [],
      });

      const result = typeof response === 'string' ? response : response?.content || 'No result returned.';
      set({ lastResult: result, isProcessing: false });
    } catch {
      set({
        lastResult: 'AI is temporarily unavailable. Please try again later.',
        isProcessing: false,
      });
    }
  },

  clearResult: () => set({ lastResult: null, showResults: false, activeAction: null }),
}));
