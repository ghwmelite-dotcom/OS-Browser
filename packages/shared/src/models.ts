export interface AIModel {
  id: string;
  label: string;
  provider: string;
  useCase: string;
  isDefault?: boolean;
}

export const AI_MODELS: AIModel[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    label: 'Llama 3.3 70B',
    provider: 'Meta',
    useCase: 'Default chat, reasoning, summarization',
    isDefault: true,
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B',
    provider: 'Meta',
    useCase: 'Quick/lightweight responses',
  },
  {
    id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    label: 'DeepSeek R1',
    provider: 'DeepSeek',
    useCase: 'Code, math, deep reasoning',
  },
  {
    id: '@cf/mistral/mistral-small-3.1-24b-instruct',
    label: 'Mistral Small',
    provider: 'Mistral',
    useCase: 'Chat, translation assist',
  },
  {
    id: '@cf/qwen/qwen2.5-72b-instruct',
    label: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    useCase: 'Multilingual, code',
  },
  {
    id: '@hf/google/gemma-7b-it',
    label: 'Gemma 7B',
    provider: 'Google',
    useCase: 'Fast lightweight tasks',
  },
];

export const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b';
export const EMBEDDING_MODEL = '@cf/baai/bge-large-en-v1.5';

export const MODEL_FALLBACK_CHAIN = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/qwen/qwen2.5-72b-instruct',
  '@cf/meta/llama-3.1-8b-instruct',
];

export const DEFAULT_MODEL = AI_MODELS.find(m => m.isDefault)!.id;
