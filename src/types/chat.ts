export interface SourceItem {
  page: number;
  text: string;
}

export interface ChatRequest {
  query: string;
  enable_chunks?: boolean;
  prompt_type?: string;
  max_chunks?: number;
  temperature?: number;
  top_k?: number;
  gen_model?: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceItem[];
  chunks_used: number[];
  query: string;
}

export interface Citation {
  page: number;
  text: string;
  position?: {
    top: number;
    height: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  chunksByPage?: Record<number, string[]>;
  timestamp: Date;
}
