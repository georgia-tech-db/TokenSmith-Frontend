export interface ChatConfig {
  enableChunks: boolean;
  enableStreaming: boolean;
  promptType: string;
  maxChunks?: number;
  temperature?: number;
  topK?: number;
  genModel: string;
}

export const GEN_MODEL_DEFAULT = 'default';

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enableChunks: true,
  enableStreaming: true,
  promptType: 'tutor',
  maxChunks: 5,
  temperature: 0.7,
  topK: 10,
  genModel: GEN_MODEL_DEFAULT,
};

export const PROMPT_TYPES = [
  { value: 'tutor', label: 'Tutor' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'concise', label: 'Concise' },
];

