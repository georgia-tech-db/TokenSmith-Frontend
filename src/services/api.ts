import { ChatRequest, ChatResponse, Citation, SourceItem } from '@/types/chat';
import { ChatConfig } from '@/types/config';

const API_BASE_URL = 'http://localhost:8000';

export async function sendChatMessage(
  query: string,
  chatConfig: ChatConfig
): Promise<{ content: string; citations: Citation[] }> {
  try {
    const request: ChatRequest = { 
      query,
      enable_chunks: chatConfig.enableChunks,
      prompt_type: chatConfig.promptType,
      max_chunks: chatConfig.maxChunks,
      temperature: chatConfig.temperature,
      top_k: chatConfig.topK,
    };
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    const data: ChatResponse = await response.json();
    
    // Convert sources to citations format expected by the UI
    const citations: Citation[] = data.sources.map(source => ({
      page: source.page,
      text: source.text
    }));

    return {
      content: data.answer,
      citations: citations
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (sources?: SourceItem[]) => void;
  onError: (error: string) => void;
}

export async function sendChatMessageStream(
  query: string,
  chatConfig: ChatConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const request: ChatRequest = { 
      query,
      enable_chunks: chatConfig.enableChunks,
      prompt_type: chatConfig.promptType,
      max_chunks: chatConfig.maxChunks,
      temperature: chatConfig.temperature,
      top_k: chatConfig.topK,
    };
    
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          
          try {
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'token' && data.content) {
              callbacks.onToken(data.content);
            } else if (data.type === 'done') {
              // Extract sources from the done message if present
              const sources = data.sources || [];
              callbacks.onDone(sources);
            } else if (data.type === 'error') {
              callbacks.onError(data.content || 'Unknown error');
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE message:', jsonStr);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in streaming message:', error);
    callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
  }
}
