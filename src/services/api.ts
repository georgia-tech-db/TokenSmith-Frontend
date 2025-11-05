import { ChatRequest, ChatResponse, Citation } from '@/types/chat';
import { ChatConfig } from '@/types/config';

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
    
    const response = await fetch('http://localhost:8000/api/chat', {
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
