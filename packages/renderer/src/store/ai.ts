import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
}

interface AIState {
  messages: Message[];
  isStreaming: boolean;
  selectedModel: string;
  currentConversationId: number | null;
  streamingContent: string;

  setModel: (model: string) => void;
  sendMessage: (message: string, pageContext?: string) => Promise<void>;
  clearMessages: () => void;
  setConversation: (id: number | null) => void;
  loadConversation: (id: number) => Promise<void>;
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  isStreaming: false,
  selectedModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  currentConversationId: null,
  streamingContent: '',

  setModel: (model) => set({ selectedModel: model }),

  sendMessage: async (message, pageContext) => {
    const { selectedModel, messages } = get();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      model: selectedModel,
      timestamp: Date.now(),
    };

    set((s) => ({ messages: [...s.messages, userMsg], isStreaming: true, streamingContent: '' }));

    try {
      const response = await window.osBrowser.ai.chat({
        message,
        model: selectedModel,
        conversation_history: messages.slice(-10),
        page_context: pageContext,
      });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content || response,
        model: selectedModel,
        timestamp: Date.now(),
      };

      set((s) => ({ messages: [...s.messages, assistantMsg], isStreaming: false }));
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, AI is temporarily unavailable. Your request has been queued.',
        model: selectedModel,
        timestamp: Date.now(),
      };
      set((s) => ({ messages: [...s.messages, errorMsg], isStreaming: false }));
    }
  },

  clearMessages: () => set({ messages: [], currentConversationId: null }),

  setConversation: (id) => set({ currentConversationId: id }),

  loadConversation: async (id) => {
    const msgs = await window.osBrowser.conversations.messages(id);
    set({
      messages: msgs.map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        model: m.model,
        timestamp: new Date(m.created_at).getTime(),
      })),
      currentConversationId: id,
    });
  },
}));
