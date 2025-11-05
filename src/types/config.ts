export interface ChatConfig {
  enableChunks: boolean;
  promptType: string;
  maxChunks?: number;
  temperature?: number;
  topK?: number;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enableChunks: true,
  promptType: 'default',
  maxChunks: 5,
  temperature: 0.7,
  topK: 10,
};

export const PROMPT_TYPES = [
  { value: 'default', label: 'Default Prompt' },
  { value: 'concise', label: 'Concise Prompt' },
  { value: 'detailed', label: 'Detailed Prompt' },
  { value: 'educational', label: 'Educational Prompt' },
  { value: 'qa', label: 'Q&A Prompt' },
];

