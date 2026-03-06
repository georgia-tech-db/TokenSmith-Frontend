export interface SourceItem {
  page: number;
  text: string; // file path from backend, not chunk text
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
  chunks_by_page: Record<number, string[]>;
  query: string;
}

// Citation is now the same shape as SourceItem (backend removed section fields)
export type Citation = SourceItem;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  chunksByPage?: Record<number, string[]>;
  chunksUsed?: number[];
  timestamp: Date;
}
