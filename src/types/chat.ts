export interface SourceItem {
  page: number;
  text: string;
}

export interface ChatRequest {
  query: string;
  // Testing mode parameters (optional)
  enable_chunks?: boolean;
  prompt_type?: string;
  max_chunks?: number;
  temperature?: number;
  top_k?: number;
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
  timestamp: Date;
}
